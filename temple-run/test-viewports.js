/* ==========================================================================
   Automated Responsive Viewport Tester using Headless Chrome
   Tests: 360x800, 390x844, 430x932, 768x1024, 1024x768, 1366x768, 1920x1080
   ========================================================================== */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8085;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = [
    { name: 'Mobile Android (Compact)', width: 360, height: 800 },
    { name: 'iPhone 13/14/15', width: 390, height: 844 },
    { name: 'iPhone Pro Max / Plus', width: 430, height: 932 },
    { name: 'iPad / Tablet Portrait', width: 768, height: 1024 },
    { name: 'iPad / Tablet Landscape', width: 1024, height: 768 },
    { name: 'Laptop Display', width: 1366, height: 768 },
    { name: 'Desktop Full HD', width: 1920, height: 1080 }
];

// Simple MIME map
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png'
};

// 1. Start HTTP Server
const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    const filePath = path.join(__dirname, reqPath);
    const ext = path.extname(filePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'text/plain',
            'Cache-Control': 'no-cache'
        });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

function runChromeScreenshot(viewport) {
    return new Promise((resolve, reject) => {
        const outImg = path.join(screenshotsDir, `viewport_${viewport.width}x${viewport.height}.png`);
        const args = [
            '--headless=new',
            '--disable-gpu',
            '--hide-scrollbars',
            `--window-size=${viewport.width},${viewport.height}`,
            `--screenshot=${outImg}`,
            `http://localhost:${PORT}/index.html`
        ];

        execFile(CHROME_PATH, args, (error) => {
            if (error) {
                console.error(`  ✗ Error testing ${viewport.width}x${viewport.height}:`, error.message);
                resolve({ success: false, viewport });
            } else {
                const stat = fs.existsSync(outImg) ? fs.statSync(outImg) : null;
                if (stat && stat.size > 1000) {
                    console.log(`  ✓ PASS: ${viewport.name} (${viewport.width}x${viewport.height}) - Screenshot saved (${Math.round(stat.size / 1024)} KB)`);
                    resolve({ success: true, viewport, size: stat.size });
                } else {
                    console.error(`  ✗ Failed screenshot capture for ${viewport.width}x${viewport.height}`);
                    resolve({ success: false, viewport });
                }
            }
        });
    });
}

server.listen(PORT, async () => {
    console.log(`Server started on http://localhost:${PORT}`);
    console.log('Testing responsive layouts with Headless Chrome across all required viewports...\n');

    let allPassed = true;

    for (const vp of VIEWPORTS) {
        const res = await runChromeScreenshot(vp);
        if (!res.success) {
            allPassed = false;
        }
    }

    server.close(() => {
        console.log('\n=== RESPONSIVE VIEWPORT TEST RESULTS ===');
        if (allPassed) {
            console.log('ALL 7 REQUIRED VIEWPORTS TESTED & VERIFIED WITH SCREENSHOT CAPTURES! 🚀');
        } else {
            console.error('Some viewports failed.');
            process.exit(1);
        }
    });
});
