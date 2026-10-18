#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

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
      console.error(JSON.stringify({ success: false, error: 'Playwright not found' }));
      process.exit(1);
    }
  }
}

// Parse args
const args = process.argv.slice(2);
let account = '';
let shortcode = '';
let commentId = '';
let targetUsername = '';
let targetCommentText = '';
let replyText = '';
let profileDir = '';
let proxy = 'socks5://127.0.0.1:40000';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--account' && args[i + 1]) account = args[++i];
  if (args[i] === '--shortcode' && args[i + 1]) shortcode = args[++i];
  if (args[i] === '--comment-id' && args[i + 1]) commentId = args[++i];
  if (args[i] === '--target-user' && args[i + 1]) targetUsername = args[++i];
  if (args[i] === '--target-text' && args[i + 1]) targetCommentText = args[++i];
  if (args[i] === '--reply' && args[i + 1]) replyText = args[++i];
  if (args[i] === '--profile-dir' && args[i + 1]) profileDir = args[++i];
  if (args[i] === '--proxy' && args[i + 1]) proxy = args[++i];
}

if (!account) {
  console.error(JSON.stringify({ success: false, error: 'Account required' }));
  process.exit(1);
}

if (!profileDir) {
  profileDir = `/root/.hermes/profiles/inflow_${account}/bot-desktop/browser-profile`;
}

// Clean shortcode to 11 chars
if (shortcode.length > 11) {
  shortcode = shortcode.substring(0, 11);
}

async function run() {
  // Clean locks if stale
  try { fs.unlinkSync(path.join(profileDir, 'SingletonLock')); } catch(e) {}
  try { fs.unlinkSync(path.join(profileDir, 'SingletonSocket')); } catch(e) {}

  let browser;
  try {
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ];
    if (proxy) {
      launchArgs.push(`--proxy-server=${proxy}`);
    }

    browser = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      executablePath: '/usr/local/bin/google-chrome-stable',
      args: launchArgs
    });
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: 'Failed to launch browser: ' + err.message }));
    process.exit(1);
  }

  try {
    const page = await browser.newPage();

    // Intercept GraphQL requests to prevent integer precision loss in replied_to_comment_id
    await page.route('**/api/graphql', async route => {
      try {
        const req = route.request();
        if (req.method() === 'POST') {
          const postData = req.postData();
          if (postData && (postData.includes('PolarisPostCommentInput') || postData.includes('xig_comment_create'))) {
            const querystring = require('querystring');
            const parsed = querystring.parse(postData);
            if (parsed.variables && commentId) {
              let vars = parsed.variables;
              if (vars.includes('"replied_to_comment_id"')) {
                vars = vars.replace(/"replied_to_comment_id"\s*:\s*(\d+|null)/g, `"replied_to_comment_id":${commentId}`);
              } else if (vars.includes('"data":{')) {
                vars = vars.replace('"data":{', `"data":{"replied_to_comment_id":${commentId},`);
              }
              parsed.variables = vars;
              const newPostData = querystring.stringify(parsed);
              return route.continue({ postData: newPostData });
            }
          }
        }
      } catch (err) {}
      return route.continue();
    });

    const postUrl = `https://www.instagram.com/p/${shortcode}/`;
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);

    const currentUrl = page.url();
    if (currentUrl.includes('/accounts/login') || currentUrl.includes('/challenge')) {
      await browser.close();
      console.log(JSON.stringify({
        success: false,
        account,
        error: 'Authentication required. Instagram redirected to login.',
        login_required: true,
        currentUrl
      }));
      process.exit(0);
    }

    const isLoginPrompt = await page.evaluate(() => {
      const pwdInput = document.querySelector('input[type="password"]');
      const hasContinueAs = Array.from(document.querySelectorAll('button, [role="button"]')).some(b => b.innerText && (b.innerText.includes('Continue as') || b.innerText.includes('Log in') || b.innerText.includes('Allow all cookies')));
      return !!pwdInput || hasContinueAs;
    });

    if (isLoginPrompt) {
      await browser.close();
      console.log(JSON.stringify({
        success: false,
        account,
        error: 'Session expired or password required.',
        login_required: true,
        currentUrl
      }));
      process.exit(0);
    }

    // Track response
    let commentCreated = false;
    let createdCommentPk = null;
    let createdParentCommentId = null;

    page.on('response', async res => {
      try {
        if (res.url().includes('api/graphql')) {
          const text = await res.text();
          if (text.includes('xig_comment_create')) {
            const data = JSON.parse(text);
            const commentDict = data?.data?.xig_comment_create?.comment_dict;
            if (commentDict) {
              commentCreated = true;
              createdCommentPk = commentDict.pk;
              createdParentCommentId = commentDict.parent_comment_id || null;
            }
          }
        }
      } catch (e) {}
    });

    // 1. Locate and activate the exact Reply button
    const replyTriggerResult = await page.evaluate(({ commentId, targetUsername, targetCommentText }) => {
      const allBtns = Array.from(document.querySelectorAll('div[role="button"], button, span[role="button"]'))
        .filter(b => b.innerText && b.innerText.trim() === 'Reply');

      let targetBtn = null;

      // Priority A: Match by exact commentId in React Fiber
      if (commentId) {
        for (const btn of allBtns) {
          const key = Object.keys(btn).find(k => k.startsWith('__reactFiber'));
          let f = btn[key];
          while (f) {
            const comment = f.memoizedProps?.commentFragment || f.memoizedProps?.comment;
            if (comment && String(comment.pk || comment.id) === String(commentId)) {
              targetBtn = btn;
              break;
            }
            f = f.return;
          }
          if (targetBtn) break;
        }
      }

      // Priority B: Match by target comment text or username
      if (!targetBtn && (targetCommentText || targetUsername)) {
        const allEls = Array.from(document.querySelectorAll('*'));
        let textEl = null;
        if (targetCommentText) {
          textEl = allEls.find(el => el.children.length === 0 && el.innerText && el.innerText.includes(targetCommentText));
        }
        if (!textEl && targetUsername) {
          textEl = allEls.find(el => el.children.length === 0 && el.innerText && el.innerText.trim() === targetUsername);
        }

        if (textEl) {
          let parent = textEl.parentElement;
          for (let i = 0; i < 10 && parent; i++) {
            const b = Array.from(parent.querySelectorAll('div[role="button"], button, span[role="button"]'))
              .find(el => el.innerText && el.innerText.trim() === 'Reply');
            if (b) {
              targetBtn = b;
              break;
            }
            parent = parent.parentElement;
          }
        }
      }

      if (!targetBtn) {
        return { found: false, error: 'Reply button not found for target' };
      }

      // Invoke onClick handler via React Fiber
      const key = Object.keys(targetBtn).find(k => k.startsWith('__reactFiber'));
      let f = targetBtn[key];
      let invokedHandler = false;
      while (f) {
        if (f.memoizedProps && typeof f.memoizedProps.onClick === 'function') {
          try {
            f.memoizedProps.onClick({ preventDefault: () => {}, stopPropagation: () => {} });
            invokedHandler = true;
            break;
          } catch (e) {}
        }
        f = f.return;
      }

      // Fallback: standard click if handler not called directly
      if (!invokedHandler) {
        targetBtn.click();
      }

      return { found: true, invokedHandler };
    }, { commentId, targetUsername, targetCommentText });

    if (!replyTriggerResult.found) {
      await browser.close();
      console.log(JSON.stringify({
        success: false,
        error: `Could not find Reply button for comment ${commentId || targetUsername}: ${replyTriggerResult.error}`
      }));
      process.exit(1);
    }

    // 2. Poll until textarea verifies repliedToCommentId
    let replyActivated = false;
    let activeCommentId = null;

    for (let attempt = 0; attempt < 12; attempt++) {
      await page.waitForTimeout(400);
      const activeState = await page.evaluate(() => {
        const ta = document.querySelector('textarea');
        if (!ta) return null;
        const taKey = Object.keys(ta).find(k => k.startsWith('__reactFiber'));
        let taFiber = ta[taKey];
        while (taFiber) {
          if (taFiber.stateNode && taFiber.stateNode.props && taFiber.stateNode.props.onCommentSubmit) {
            return {
              repliedToCommentId: taFiber.stateNode.props.repliedToCommentId,
              repliedToUsername: taFiber.stateNode.props.repliedToUsername,
              taValue: ta.value
            };
          }
          taFiber = taFiber.return;
        }
        return null;
      });

      if (activeState && activeState.repliedToCommentId) {
        activeCommentId = activeState.repliedToCommentId;
        if (!commentId || String(activeState.repliedToCommentId) === String(commentId)) {
          replyActivated = true;
          break;
        }
      }
    }

    // Strictly enforce: never submit as root comment!
    if (!replyActivated) {
      await browser.close();
      console.log(JSON.stringify({
        success: false,
        error: `Refusing to post: Threaded reply state not activated (expected=${commentId}, active=${activeCommentId})`
      }));
      process.exit(1);
    }

    const ta = await page.$('textarea');
    if (!ta) {
      await browser.close();
      console.log(JSON.stringify({ success: false, error: 'Textarea not found' }));
      process.exit(1);
    }

    await ta.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(replyText, { delay: 50 });
    await page.waitForTimeout(600);

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Wait for submission confirmation
    for (let w = 0; w < 10; w++) {
      if (commentCreated) break;
      await page.waitForTimeout(500);
    }

    // Fallback click on Post button if Enter didn't trigger request
    if (!commentCreated) {
      const postBtn = await page.$('div[role="button"]:has-text("Post"), form button[type="submit"]');
      if (postBtn) {
        await postBtn.click();
        for (let w = 0; w < 8; w++) {
          if (commentCreated) break;
          await page.waitForTimeout(500);
        }
      }
    }

    await browser.close();
    console.log(JSON.stringify({
      success: true,
      commentCreated: commentCreated,
      pk: createdCommentPk,
      repliedToCommentId: activeCommentId,
      parentCommentId: createdParentCommentId
    }));
  } catch (err) {
    if (browser) await browser.close();
    console.log(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  }
}

run();
