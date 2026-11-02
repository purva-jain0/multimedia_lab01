/* ==========================================================================
   Build script for Jungle Dash: Lost Temple
   Zero-dependency build script: compiles bundle and populates public/ folder
   ========================================================================== */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    console.log('Building bundle.js with esbuild...');
    execSync('npx esbuild src/main.js --bundle --outfile=bundle.js --format=iife', {
        cwd: __dirname,
        stdio: 'inherit'
    });
    console.log('  ✓ bundle.js created');

    // Create public directory for Vercel static build output
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    // Copy static files into public/
    fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(publicDir, 'index.html'));
    fs.copyFileSync(path.join(__dirname, 'style.css'), path.join(publicDir, 'style.css'));
    fs.copyFileSync(path.join(__dirname, 'bundle.js'), path.join(publicDir, 'bundle.js'));

    console.log('  ✓ public/ directory populated with index.html, style.css, bundle.js');
    console.log('Build successful!');
} catch (err) {
    console.error('Build error:', err.message);
    process.exit(1);
}
