#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
let Database;
try {
  Database = require('better-sqlite3');
} catch (e1) {
  try {
    Database = require('/opt/inflow/node_modules/better-sqlite3');
  } catch (e2) {
    try {
      Database = require('/root/twenty-repo/node_modules/better-sqlite3');
    } catch (e3) {
      console.error(JSON.stringify({ success: false, error: 'better-sqlite3 not found' }));
      process.exit(1);
    }
  }
}

// Support playwright from multiple possible paths
let chromium;
try {
  chromium = require('playwright').chromium;
} catch (e1) {
  try {
    chromium = require('/root/twenty-repo/node_modules/playwright').chromium;
  } catch (e2) {
    try {
      chromium = require('/opt/inflow/node_modules/playwright').chromium;
    } catch (e3) {
      console.error(JSON.stringify({ success: false, error: 'Playwright not found in environment' }));
      process.exit(1);
    }
  }
}

// Parse CLI flags
const args = process.argv.slice(2);
let account = '';
let profileDir = '';
let dbPath = '/opt/inflow/data/inflow.db';
let proxy = 'socks5://127.0.0.1:40000';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--account' && args[i + 1]) account = args[++i];
  if (args[i] === '--profile-dir' && args[i + 1]) profileDir = args[++i];
  if (args[i] === '--db' && args[i + 1]) dbPath = args[++i];
  if (args[i] === '--proxy' && args[i + 1]) proxy = args[++i];
}

if (!account) {
  console.error(JSON.stringify({ success: false, error: 'Missing --account argument' }));
  process.exit(1);
}

if (!profileDir) {
  profileDir = path.join(process.env.HERMES_HOME || path.join(process.env.HOME || '/root', '.hermes'), 'profiles', `inflow_${account}`);
}

const userDataDir = path.join(profileDir, 'bot-desktop', 'browser-profile');
if (!fs.existsSync(userDataDir)) {
  console.error(JSON.stringify({ success: false, account, error: `Browser profile directory does not exist: ${userDataDir}` }));
  process.exit(1);
}

// Locate Chrome executable
let executablePath = '/usr/local/bin/google-chrome';
if (!fs.existsSync(executablePath)) {
  executablePath = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
}

function runDb(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

(async () => {
  let context = null;
  try {
    // Ensure no running Chrome process is holding SingletonLock for this profile
    try {
      const pids = fs.readdirSync('/proc');
      for (const pid of pids) {
        if (!/^\d+$/.test(pid)) continue;
        try {
          const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
          if (cmd.includes(`--user-data-dir=${userDataDir}`)) {
            process.kill(parseInt(pid, 10), 'SIGKILL');
          }
        } catch (_) {}
      }
    } catch (_) {}

    // Clean stale lock files
    for (const lockFile of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      const p = path.join(userDataDir, lockFile);
      try {
        if (fs.existsSync(p) || fs.lstatSync(p).isSymbolicLink()) {
          fs.unlinkSync(p);
        }
      } catch (_) {}
    }

    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        `--proxy-server=${proxy}`,
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await context.newPage();
    page.setDefaultTimeout(35000);

    const targetUrl = `https://www.instagram.com/${account}/`;
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 35000 }).catch(() => {});

    // Give dynamic client scripts 4 seconds to settle
    await page.waitForTimeout(4000);

    const pageTitle = await page.title();
    const currentUrl = page.url();

    // Check if redirected to login or challenge
    if (currentUrl.includes('/accounts/login') || currentUrl.includes('/challenge')) {
      await context.close();
      console.log(JSON.stringify({
        success: false,
        account,
        error: 'Authentication required. Instagram redirected to login or challenge.',
        currentUrl
      }));
      process.exit(0);
    }

    const scraped = await page.evaluate((acc) => {
      // 1. Avatar
      const imgEl = document.querySelector('header img');
      const avatarUrl = imgEl ? imgEl.src : '';

      // 2. Header text & Bio
      const header = document.querySelector('header');
      let displayName = acc;
      let followersText = '';
      let postsCount = 0;
      let bio = '';

      if (header) {
        const text = header.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        
        // Find followers
        for (const line of lines) {
          if (line.toLowerCase().includes('follower')) {
            followersText = line;
          }
          if (line.toLowerCase().includes('post')) {
            const m = line.match(/([\d,.]+)/);
            if (m) postsCount = parseInt(m[1].replace(/,/g, ''), 10) || 0;
          }
        }

        // Display name is typically under username
        const h2 = header.querySelector('h2');
        const h1 = header.querySelector('h1');
        const titleEl = h2 || h1;
        if (titleEl && titleEl.innerText) {
          displayName = titleEl.innerText;
        }

        // Bio text container
        const bioEl = header.querySelector('div.-vDIg, header section > div:last-child');
        if (bioEl) {
          bio = bioEl.innerText;
        }
      }

      // 3. Post links
      const postLinks = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
      const seen = new Set();
      const posts = [];

      for (const a of postLinks) {
        const href = a.getAttribute('href') || '';
        const match = href.match(/\/(p|reel)\/([^/]+)/);
        if (!match) continue;

        const pType = match[1] === 'reel' ? 'reel' : 'post';
        let rawCode = match[2].split('?')[0];
        const shortcode = rawCode.length > 11 ? rawCode.slice(0, 11) : rawCode;
        if (seen.has(shortcode)) continue;
        seen.add(shortcode);

        const img = a.querySelector('img');
        posts.push({
          type: pType,
          shortcode,
          url: 'https://www.instagram.com' + href,
          thumbnail_url: img ? img.src : '',
          caption: img ? (img.alt || '') : ''
        });
      }

      return {
        displayName,
        avatarUrl,
        bio,
        followersText,
        postsCount: postsCount || posts.length,
        posts
      };
    }, account);

    await context.close();
    context = null;

    // Connect to SQLite DB and persist
    const db = new Database(dbPath);
    const now = new Date().toISOString();

    // 1. Update accounts table
    const updateAccount = db.prepare(`
      UPDATE accounts 
      SET display_name = COALESCE(NULLIF(?, ''), display_name),
          avatar_url = COALESCE(NULLIF(?, ''), avatar_url),
          bio = COALESCE(NULLIF(?, ''), bio),
          followers_text = COALESCE(NULLIF(?, ''), followers_text),
          posts_count = ?,
          bot_status = 'live',
          last_heartbeat_at = ?,
          updated_at = ?
      WHERE username = ?
    `);

    updateAccount.run(
      scraped.displayName,
      scraped.avatarUrl,
      scraped.bio,
      scraped.followersText,
      scraped.postsCount,
      now,
      now,
      account
    );

    // 2. Upsert posts
    const insertPost = db.prepare(`
      INSERT INTO posts (
        account_username, shortcode, media_id, url, post_type, 
        thumbnail_url, caption, synced_at, updated_at, sort_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(shortcode) DO UPDATE SET
        account_username = excluded.account_username,
        thumbnail_url = excluded.thumbnail_url,
        caption = excluded.caption,
        post_type = excluded.post_type,
        url = excluded.url,
        synced_at = excluded.synced_at,
        updated_at = excluded.updated_at,
        sort_index = excluded.sort_index
    `);

    let insertedCount = 0;
    const insertMany = db.transaction((posts) => {
      for (let i = 0; i < posts.length; i++) {
        const p = posts[i];
        insertPost.run(
          account,
          p.shortcode,
          p.shortcode,
          p.url,
          p.type,
          p.thumbnail_url,
          p.caption,
          now,
          now,
          i
        );
        insertedCount++;
      }
    });
    insertMany(scraped.posts);

    // 3. Mark agent_jobs completed
    const completeJob = db.prepare(`
      UPDATE agent_jobs
      SET status = 'completed',
          completed_at = ?,
          result_summary = ?,
          error_message = NULL
      WHERE account_username = ? AND status IN ('pending', 'running') AND job_type = 'sync_catalog'
    `);
    completeJob.run(
      now, 
      JSON.stringify({ posts_synced: insertedCount, followers_text: scraped.followersText }), 
      account
    );

    db.close();

    console.log(JSON.stringify({
      success: true,
      account,
      posts_synced: insertedCount,
      total_posts_reported: scraped.postsCount,
      followers_text: scraped.followersText,
      avatar_url: scraped.avatarUrl ? 'updated' : 'unchanged',
      status: 'completed'
    }));

  } catch (err) {
    if (context) {
      await context.close().catch(() => {});
    }
    console.error(JSON.stringify({
      success: false,
      account,
      error: err.message || String(err)
    }));
    process.exit(1);
  }
})();
