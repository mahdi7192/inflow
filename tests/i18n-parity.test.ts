import fs from "fs";
import path from "path";

function validateParity() {
  const root = process.cwd();
  const faPath = path.join(root, "src/locales/fa.json");
  const enPath = path.join(root, "src/locales/en.json");
  const arPath = path.join(root, "src/locales/ar.json");

  if (!fs.existsSync(faPath) || !fs.existsSync(enPath) || !fs.existsSync(arPath)) {
    console.error("❌ Missing locale files in src/locales/");
    process.exit(1);
  }

  const fa = JSON.parse(fs.readFileSync(faPath, "utf8"));
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));

  const faKeys = Object.keys(fa).sort();
  const enKeys = Object.keys(en).sort();
  const arKeys = Object.keys(ar).sort();

  console.log(`Checking key counts: FA=${faKeys.length}, EN=${enKeys.length}, AR=${arKeys.length}`);

  let errors = 0;

  // 1. Missing in EN
  const missingInEn = faKeys.filter((k) => !(k in en));
  if (missingInEn.length > 0) {
    console.error(`❌ ${missingInEn.length} keys missing in en.json:`, missingInEn);
    errors++;
  }

  // 2. Missing in AR
  const missingInAr = faKeys.filter((k) => !(k in ar));
  if (missingInAr.length > 0) {
    console.error(`❌ ${missingInAr.length} keys missing in ar.json:`, missingInAr);
    errors++;
  }

  // 3. Extra in EN
  const extraInEn = enKeys.filter((k) => !(k in fa));
  if (extraInEn.length > 0) {
    console.error(`❌ ${extraInEn.length} extra keys in en.json not in fa.json:`, extraInEn);
    errors++;
  }

  // 4. Extra in AR
  const extraInAr = arKeys.filter((k) => !(k in fa));
  if (extraInAr.length > 0) {
    console.error(`❌ ${extraInAr.length} extra keys in ar.json not in fa.json:`, extraInAr);
    errors++;
  }

  if (errors > 0) {
    console.error("❌ i18n parity check failed.");
    process.exit(1);
  }

  console.log("✅ 100% i18n key parity validated across fa.json, en.json, and ar.json!");
}

validateParity();
