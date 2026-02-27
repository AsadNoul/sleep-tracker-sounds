/**
 * Patch react-native-worklets package.json after every npm install.
 *
 * Problem: react-native-worklets@0.5.1 has "react-native": "./src/index" in its
 * package.json. Metro uses the "react-native" field by default and resolves the
 * TypeScript source, which it can't compile (missing TS transforms for node_modules).
 * The compiled output is in lib/module/ and works fine.
 *
 * This script patches the field to point to lib/module/index so Metro always
 * resolves compiled JS, avoiding "Unable to resolve" errors.
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(
  __dirname,
  '../node_modules/react-native-worklets/package.json'
);

if (!fs.existsSync(pkgPath)) {
  console.log('[patch-worklets] react-native-worklets not found, skipping.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

let changed = false;

if (pkg['react-native'] !== './lib/module/index') {
  pkg['react-native'] = './lib/module/index';
  changed = true;
}
if (pkg['source'] !== './lib/module/index') {
  pkg['source'] = './lib/module/index';
  changed = true;
}

if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('[patch-worklets] Patched react-native-worklets to use lib/module/index ✓');
} else {
  console.log('[patch-worklets] Already patched, no changes needed.');
}
