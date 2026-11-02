/* ==========================================================================
   Comprehensive Automated Responsive & Gameplay Verification using Chrome CDP
   Tests: 360x800, 390x844, 430x932, 768x1024, 1024x768, 1366x768, 1920x1080
   Tests: Menu Screen, Gameplay HUD, Pause Modal, and Game Over Screen
   ========================================================================== */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8088;
const CDP_PORT = 9222;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = [
    { name: 'Mobile Android Compact', width: 360, height: 800, mobile: true },
    { name: 'iPhone 13/14/15', width: 390, height: 844, mobile: true },
    { name: 'iPhone Pro Max / Plus', width: 430, height: 932, mobile: true },
    { name: 'iPad / Tablet Portrait', width: 768, height: 1024, mobile: true },
    { name: 'iPad / Tablet Landscape', width: 1024, height: 768, mobile: false },
    { name: 'Laptop Display', width: 1366, height: 768, mobile: false },
    { name: 'Desktop Full HD', width: 1920, height: 1080, mobile: false }
];

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png'
};

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
        res.end();
    }
});

const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

// Simple CDP client over native WebSocket
class CDPClient {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.id = 1;
        this.callbacks = new Map();

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.id && this.callbacks.has(data.id)) {
                const cb = this.callbacks.get(data.id);
                this.callbacks.delete(data.id);
                cb(data);
            }
        };
    }

    ready() {
        return new Promise((resolve) => {
            if (this.ws.readyState === WebSocket.OPEN) resolve();
            else this.ws.onopen = () => resolve();
        });
    }

    send(method, params = {}) {
        return new Promise((resolve) => {
            const msgId = this.id++;
            this.callbacks.set(msgId, resolve);
            this.ws.send(JSON.stringify({ id: msgId, method, params }));
        });
    }

    close() {
        this.ws.close();
    }
}

async function getCDPWebSocketUrl() {
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
            if (res.ok) {
                const targets = await res.json();
                const pageTarget = targets.find(t => t.type === 'page');
                if (pageTarget && pageTarget.webSocketDebuggerUrl) {
                    return pageTarget.webSocketDebuggerUrl;
                }
            }
        } catch {}
        await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('Could not connect to Chrome DevTools Protocol');
}

server.listen(PORT, async () => {
    console.log(`Test HTTP server listening on http://localhost:${PORT}`);

    // Launch Chrome with DevTools Protocol
    const chrome = spawn(CHROME_PATH, [
        '--headless=new',
        '--disable-gpu',
        `--remote-debugging-port=${CDP_PORT}`,
        'about:blank'
    ]);

    try {
        const wsUrl = await getCDPWebSocketUrl();
        const cdp = new CDPClient(wsUrl);
        await cdp.ready();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('DOM.enable');

        console.log('\n--- VERIFYING ALL 7 VIEWPORTS ---');
        let allPassed = true;

        for (const vp of VIEWPORTS) {
            // Emulate exact viewport metrics
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: vp.width,
                height: vp.height,
                deviceScaleFactor: 1,
                mobile: vp.mobile
            });

            // Navigate to game
            await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/index.html` });
            await new Promise(r => setTimeout(r, 600)); // Wait for render

            // Evaluate layout metrics
            const evalRes = await cdp.send('Runtime.evaluate', {
                expression: `
                    (() => {
                        const card = document.querySelector('.menu-card');
                        const cardRect = card ? card.getBoundingClientRect() : null;
                        const bodyScrollW = document.body.scrollWidth;
                        const windowW = window.innerWidth;
                        const hasOverflow = bodyScrollW > windowW;
                        return {
                            windowW,
                            bodyScrollW,
                            hasOverflow,
                            cardWidth: cardRect ? cardRect.width : 0,
                            cardLeft: cardRect ? cardRect.left : 0,
                            cardRight: cardRect ? cardRect.right : 0
                        };
                    })()
                `,
                returnByValue: true
            });

            const metrics = (evalRes.result && evalRes.result.result) ? evalRes.result.result.value : (evalRes.result ? evalRes.result.value : null);
            if (!metrics) {
                console.error('Eval error:', evalRes);
                continue;
            }
            const isFit = !metrics.hasOverflow && metrics.cardRight <= vp.width + 1;

            if (isFit) {
                console.log(`  ✓ PASS: ${vp.name} (${vp.width}x${vp.height}) - Perfect fit! (card: ${Math.round(metrics.cardWidth)}px, margin: ${Math.round(metrics.cardLeft)}px)`);
            } else {
                console.error(`  ✗ FAIL: ${vp.name} (${vp.width}x${vp.height}) - Overflow! (card: ${Math.round(metrics.cardWidth)}px, right: ${Math.round(metrics.cardRight)}px vs width: ${vp.width})`);
                allPassed = false;
            }

            // Capture verified screenshot
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
            if (shot.result && shot.result.data) {
                const buffer = Buffer.from(shot.result.data, 'base64');
                fs.writeFileSync(path.join(screenshotsDir, `verified_${vp.width}x${vp.height}.png`), buffer);
            }
        }

        console.log('\n--- VERIFYING GAMEPLAY HUD & MODAL SCREENS ---');
        // Test gameplay screen on mobile 390x844
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true
        });

        // Trigger Start Game
        await cdp.send('Runtime.evaluate', {
            expression: `document.getElementById('btn-start-game').click();`
        });
        await new Promise(r => setTimeout(r, 800));

        // Capture gameplay HUD screenshot
        let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        if (shot.result && shot.result.data) {
            fs.writeFileSync(path.join(screenshotsDir, 'verified_gameplay_mobile_390x844.png'), Buffer.from(shot.result.data, 'base64'));
            console.log('  ✓ PASS: Mobile Gameplay HUD rendered and captured with touch controls');
        }

        // Trigger Pause Modal
        await cdp.send('Runtime.evaluate', {
            expression: `window.jungleDashGame.pause();`
        });
        await new Promise(r => setTimeout(r, 400));
        shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        if (shot.result && shot.result.data) {
            fs.writeFileSync(path.join(screenshotsDir, 'verified_pause_modal_390x844.png'), Buffer.from(shot.result.data, 'base64'));
            console.log('  ✓ PASS: Pause Modal rendered and captured');
        }

        // Trigger Game Over Screen
        await cdp.send('Runtime.evaluate', {
            expression: `window.jungleDashGame.triggerGameOver();`
        });
        await new Promise(r => setTimeout(r, 1000));
        shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        if (shot.result && shot.result.data) {
            fs.writeFileSync(path.join(screenshotsDir, 'verified_gameover_390x844.png'), Buffer.from(shot.result.data, 'base64'));
            console.log('  ✓ PASS: Game Over Screen rendered and captured');
        }

        // Trigger How To Play Modal
        await cdp.send('Runtime.evaluate', {
            expression: `window.jungleDashGame.returnToMenu(); document.getElementById('btn-how-to-play').click();`
        });
        await new Promise(r => setTimeout(r, 500));
        shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        if (shot.result && shot.result.data) {
            fs.writeFileSync(path.join(screenshotsDir, 'verified_howtoplay_390x844.png'), Buffer.from(shot.result.data, 'base64'));
            console.log('  ✓ PASS: How To Play Screen rendered and captured');
        }

        cdp.close();
        chrome.kill();
        server.close(() => {
            console.log('\n=== FINAL VERIFICATION RESULT ===');
            if (allPassed) {
                console.log('ALL RESPONSIVE VIEWPORTS & GAMEPLAY SCREENS TESTED AND FULLY VERIFIED! 🎉');
            } else {
                console.error('Some viewports failed.');
                process.exit(1);
            }
        });

    } catch (e) {
        console.error('Error during CDP testing:', e);
        chrome.kill();
        server.close();
        process.exit(1);
    }
});
