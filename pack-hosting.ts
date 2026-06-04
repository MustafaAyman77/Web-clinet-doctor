import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');

const DIST_DIR = path.join(process.cwd(), 'dist');
const DATA_FILE = path.join(process.cwd(), 'data', 'db.json');
const DIST_DATA_DIR = path.join(DIST_DIR, 'data');
const DIST_DATA_FILE = path.join(DIST_DATA_DIR, 'db.json');
const ZIP_OUTPUT_PATH = path.join(process.cwd(), 'clinic_hosting_bundle.zip');

function pack() {
  console.log('[Packer] Initializing production clinic bundle packing... 📦');

  // 1. Double check that dist directory exists (Vite build output)
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`[Packer Error] Build distribution directory '${DIST_DIR}' was not found. Please run Vite build first.`);
    process.exit(1);
  }

  // 2. Safely create data directory inside dist and copy existing database
  if (!fs.existsSync(DIST_DATA_DIR)) {
    fs.mkdirSync(DIST_DATA_DIR, { recursive: true });
    console.log('[Packer] Created data/ directory inside dist/');
  }

  if (fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(DATA_FILE, DIST_DATA_FILE);
    console.log('[Packer] Successfully copied doctor clinic database db.json into the deployment bundle.');
  } else {
    console.warn('[Packer Warning] No active db.json file was found in data/ to seed the bundle. It will auto-seed upon first execution under PHP.');
  }

  // 3. Initialize adm-zip
  console.log('[Packer] Compressing clinic suite with adm-zip flat structure...');
  const zip = new AdmZip();
  
  // Add local folder recursively, making all files in it sit at the root of the ZIP
  zip.addLocalFolder(DIST_DIR);
  
  // Save ZIP
  zip.writeZip(ZIP_OUTPUT_PATH);

  const stats = fs.statSync(ZIP_OUTPUT_PATH);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n======================================================');
  console.log(`[Packer Success] Bundle created successfully! 🎉`);
  console.log(`Archive Location: ${ZIP_OUTPUT_PATH}`);
  console.log(`Total Package Size: ${fileSizeMB} MB`);
  console.log('======================================================\n');
}

pack();
