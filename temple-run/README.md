# 🏛️ Jungle Dash: Lost Temple
### *A 2D Pseudo-3D Endless Runner Game for MCA Multimedia Systems Lab*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5 Canvas](https://img.shields.io/badge/Graphics-HTML5%20Canvas%202D-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-4A90E2)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## 📖 1. Project Overview & Objective

**Jungle Dash: Lost Temple** is a responsive 2D endless runner web game engineered with pure HTML5 Canvas, modern CSS3, and Vanilla JavaScript. Inspired by classic arcade pseudo-3D perspective mechanics, the player assumes the role of an adventurer sprinting along an ancient three-lane stone pathway through a mystical jungle temple ruin, dodging deadly spikes, sliding under overhead stone lintels, leaping over crumbling road chasms, and collecting gold coins.

This project was developed for the **MCA Multimedia Systems Lab** to comprehensively demonstrate the theoretical and practical concepts of digital multimedia:
1. **Computer Graphics & Perspective Geometry**: Vanishing point calculations, non-linear depth scaling, and multi-layered parallax backgrounds.
2. **Procedural Character & Particle Animation**: Bone and limb kinematics, jump gravity arcs, lane transition easing, and dynamic particle systems.
3. **Real-Time Sound Synthesis**: Fully self-contained procedural audio synthesis using the **Web Audio API** (custom tribal jungle drum sequencing and sound effects without external audio files).
4. **Multi-Modal Event Handling**: Desktop keyboard navigation, mobile swipe gestures, and ergonomic on-screen touch controls.
5. **Responsive Engineering**: Zero-dependency layout with high-DPI Retina scaling tested from 360px mobile viewports to 1080p desktop displays.

---

## 🎯 2. Problem Statement

Classic 3D mobile games often rely on heavy 3D engines (Unity, Unreal, Three.js) that require megabytes of downloads, high GPU consumption, complex asset pipelines, and potential cross-origin resource issues. 

The objective of this project is to construct a **high-performance, zero-external-dependency, lightweight, and responsive pseudo-3D endless runner** strictly using native web standards (HTML5 Canvas 2D API, Web Audio API, and Vanilla JavaScript). It proves that rich multimedia immersion, realistic physics, procedural audio, and smooth 60fps rendering can be achieved with pure mathematical projection on a 2D canvas.

---

## 🛠️ 3. Technology Stack

| Component | Technology | Rationale & Academic Significance |
| :--- | :--- | :--- |
| **Markup** | HTML5 Semantic Elements | Accessible HUD, modal dialogs, and responsive canvas container. |
| **Styling** | CSS3 Grid, Flexbox, Safe-Area Insets | Fluid mobile-first UI with stone/gold visual theme, `backdrop-filter`, and notch handling. |
| **Logic & Physics** | Vanilla JavaScript (ES6+ Modules) | Modular object-oriented architecture; decoupled subsystems; delta-time kinematics. |
| **Rendering** | HTML5 Canvas 2D API | Pseudo-3D perspective projection, dynamic depth sorting, and custom vector rendering. |
| **Audio Engine** | Web Audio API | 100% synthesized sound effects and procedural tribal drum sequencer; zero missing asset errors. |
| **Persistence** | Web Storage API (`localStorage`) | High-score record keeping and audio preference persistence across sessions. |
| **Version Control** | Git & GitHub | Modular commit history and repository tracking. |
| **Hosting & CI/CD** | Vercel Static Hosting | Production deployment with zero-configuration edge distribution and security headers. |

---

## 🎮 4. Features & Gameplay Rules

### A. Three-Lane Running Track
- **Left Lane** ($X = -110$)
- **Center Lane** ($X = 0$)
- **Right Lane** ($X = +110$)
- Movement between lanes is smoothly interpolated with dynamic body banking/tilt angles rather than instant teleportation.

### B. Obstacles & Survival Mechanics
1. **Low Wooden Spiked Barrier**:
   - *Clearance*: Must **JUMP** over ($Y_{\text{player}} > 38$).
   - *Impact*: Running or sliding into it ends the run.
2. **Overhead Ancient Stone Lintel**:
   - *Clearance*: Must **SLIDE** underneath ($State = \text{SLIDING}$).
   - *Impact*: Running or jumping into it ends the run.
3. **Ancient Stone Totem Monolith**:
   - *Clearance*: Solid obstruction occupying 1 or 2 lanes. Must **CHANGE LANES (DODGE)**.
   - *Impact*: Fatal upon contact.
4. **Crumbling Road Pit Hazard**:
   - *Clearance*: Must **JUMP** across ($Y_{\text{player}} > 28$) or switch lanes.
   - *Impact*: Falling into the pit ends the run.

### C. Procedural Fair-Route Generation
The obstacle spawning engine dynamically guarantees that **at least one safe path is always mathematically passable**, preventing impossible dead-ends.

### D. Collectible Gold Coins & Scoring
- Procedurally generated in rhythmic lines and parabolic jump arcs.
- Coins feature a 3D spinning rotation illusion ($\cos(\omega t)$), hover bobbing, and Aztec temple embossing.
- Collecting a coin triggers a high crystal bell chime, a bursting golden sparkle particle system, a floating `+10` popup, and increments the score.
- Continuous forward distance travelled contributes continuously to the final score.

---

## 🕹️ 5. Controls

### Desktop & Laptop Controls
| Action | Primary Key | Alternate Key |
| :--- | :--- | :--- |
| **Move Left** | `←` (Arrow Left) | `A` |
| **Move Right** | `→` (Arrow Right) | `D` |
| **Jump** | `↑` (Arrow Up) | `W` or `Space` |
| **Slide** | `↓` (Arrow Down) | `S` |
| **Pause / Resume** | `Escape` | `P` |

### Mobile & Tablet Touch Controls
- **Swipe Gestures**:
  - **Swipe Left / Right**: Switch lane left or right.
  - **Swipe Up**: Jump into the air.
  - **Swipe Down**: Slide low along the stones.
- **On-Screen Touch Buttons**:
  - Ergonomic bottom-left cluster: `◀` (Left) and `▶` (Right).
  - Ergonomic bottom-right cluster: `▲ JUMP` and `▼ SLIDE`.

---

## 📂 6. Project Architecture & File Structure

```text
temple-run/
├── index.html              # HTML5 application shell, HUD overlay, and modal screens
├── style.css               # Responsive design, theme styling, animations, safe-area insets
├── vercel.json             # Static deployment configuration and HTTP security headers
├── package.json            # Project metadata and local preview scripts
├── .gitignore              # Ignores OS files, temporary logs, and build artifacts
├── README.md               # Complete project documentation and lab viva guide
├── test-suite.js           # Automated unit and engine integration test suite (44 assertions)
├── test-viewports-cdp.js   # Automated headless Chrome viewport tester (CDP)
├── screenshots/            # Verified automated screenshots across viewports & game screens
└── src/
    ├── constants.js        # Lane coordinates, camera metrics, physics values, and storage keys
    ├── camera.js           # Pseudo-3D perspective projection and world-to-screen transforms
    ├── audio.js            # Web Audio API sound synthesizer and procedural jungle rhythm
    ├── input.js            # Unified input manager (keyboard, swipes, on-screen HUD buttons)
    ├── player.js           # Adventurer character physics, state machine, and procedural rendering
    ├── environment.js      # Parallax sky/canopy, 3-lane stone track, side pillars, and torches
    ├── obstacles.js        # Procedural fair-route generator, 4 obstacle types, and collision logic
    ├── coins.js            # Rotating gold coins, collection sparkle particles, and score popups
    ├── ui.js               # UI controller for Menu, Pause, Game Over, HUD, and LocalStorage
    ├── game.js             # Real-time game engine loop, delta-time accumulation, and state machine
    └── main.js             # Bootstrap entry point and browser tab focus lifecycle handling
```

---

## 🚀 7. Installation & Local Execution

This game has **zero dependencies** and runs out of the box in any modern web browser.

### Option A: Using Node.js (Recommended)
```bash
# Clone the repository
git clone https://github.com/purva-jain0/multimedia_lab01.git
cd multimedia_lab01/temple-run

# Start a local static server
npx serve .
# Or use Python
# python -m http.server 8080
```
Open `http://localhost:3000` (or `http://localhost:8080`) in your browser.

### Option B: Running Automated Tests
```bash
# Run unit & engine integration test suite
node test-suite.js

# Run responsive viewport & screen verification suite
node test-viewports-cdp.js
```

---

## 🌐 8. Vercel Deployment Instructions

The project is structured as a static web application and is ready for 1-click deployment on Vercel:

1. **Log in to Vercel**: Visit [https://vercel.com](https://vercel.com) and sign in with your GitHub account.
2. **Import Repository**: Click **"Add New..."** > **"Project"** and select `purva-jain0/multimedia_lab01`.
3. **Configure Root Directory**:
   - Set **Root Directory** to `temple-run`.
4. **Build & Output Settings**:
   - Framework Preset: **Other**
   - Build Command: *(Leave blank - pure static web application)*
   - Output Directory: `.` *(current directory)*
5. **Deploy**: Click **Deploy**. Vercel will assign a production SSL URL (e.g., `https://jungle-dash-lost-temple.vercel.app`).

---

## 🔬 9. Demonstration of Multimedia Systems Concepts

### A. Computer Graphics & Pseudo-3D Perspective Projection
- **Vanishing Point Geometry**: World coordinates $(X, Y, Z)$ are mapped to 2D screen coordinates $(X_s, Y_s)$ using perspective scaling:
  $$\text{Scale} = \frac{Z_{\text{ref}}}{Z + \text{offset}}$$
  $$X_s = V_x + X_{\text{world}} \cdot \text{Scale} \cdot K$$
  $$Y_s = Y_{\text{ground}}(Z) - Y_{\text{world}} \cdot \text{Scale} \cdot K$$
  where $V_x$ is the horizontal center and $Y_{\text{ground}}(Z)$ is a non-linear exponential depth curve connecting the horizon to the foreground.
- **Depth Cueing & Atmospheric Fog**: Distant objects fade toward the ambient jungle haze gradient.
- **Retina / HiDPI Scaling**: The canvas dynamically scales by `window.devicePixelRatio` (capped at 2x) with transform matrix normalization to eliminate pixelation on Retina screens.

### B. Procedural Animation & Kinematics
- **Delta-Time Driven Loop**: Movement equations use $\Delta t = t_{\text{current}} - t_{\text{last}}$ (clamped at $0.1\text{s}$) to guarantee uniform velocity across 60Hz, 120Hz, and 144Hz displays.
- **Limb Kinematics**: Character running gait is procedurally animated using trigonometric harmonic cycles ($\sin(12\cdot t)$ and $\cos(12\cdot t)$) to sway legs, swing arms, bob the torso, and whip the adventurer scarf in the wind.
- **Jump Gravity Arc**: Real-time numerical integration:
  $$v_y(t + \Delta t) = v_y(t) + g \cdot \Delta t$$
  $$y(t + \Delta t) = y(t) + v_y(t) \cdot \Delta t$$
  The drop shadow contracts in radius and attenuates in opacity as the adventurer rises.
- **Particle Systems**: Dynamic arrays of dust motes, landing dust puffs, floating canopy pollen, and golden coin sparkle bursts with velocity decay and alpha fading.

### C. Digital Audio & Web Audio API
- **Zero Asset Dependencies**: Rather than streaming large `.mp3` files that could fail due to CORS, network latency, or copyright, all audio is procedurally synthesized using the **Web Audio API**:
  - **Crystal Coin Chime**: Two-tone arpeggiated oscillators with exponential amplitude envelopes ($B_5 \to E_6$ at $987\text{Hz} \to 1318\text{Hz}$).
  - **Jump Whoosh**: Frequency-sweeping sine oscillator ($140\text{Hz} \to 480\text{Hz}$).
  - **Slide Friction**: AudioBuffer white noise source shaped by a resonant bandpass filter ($800\text{Hz} \to 320\text{Hz}$).
  - **Crash Impact**: Low triangle sub-bass boom ($140\text{Hz} \to 35\text{Hz}$) coupled with low-pass filtered noise rumble.
  - **Procedural Jungle Rhythm**: A 16-step algorithmic sequencer generating rhythmic tribal kicks, high/low conga tones, and shaker polyrhythms.
- **Browser Autoplay Compliance**: The `AudioContext` initializes and resumes only following an explicit user gesture (`click` or `touchstart`).

### D. User Interaction & Event Handling
- Unified event dispatching across keyboard events (`keydown`), touch swipe gestures (`touchstart`, `touchmove`, `touchend`), and on-screen HUD buttons.
- Prevents passive browser bounce, screen scrolling (`e.preventDefault()`), and double-action bouncing.
- Automatic pause upon browser tab focus change (`visibilitychange` and `blur` events).

### E. Data Persistence & LocalStorage
- High score records and audio mute preferences are preserved via the HTML5 `Web Storage API`.
- Wrapped in defensive `try/catch` blocks to prevent crashes in private/incognito browsing modes.

---

## 📱 10. Responsive Design Verification Matrix

The responsive layout was systematically verified across all required form factors using automated Headless Chrome DevTools Protocol (CDP) device metric overrides:

| Device Viewport | Dimensions | Orientation | Layout Status | Verification Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Android Compact** | $360 \times 800$ | Portrait | ✅ Pass (Zero Overflow) | `verified_360x800.png` |
| **iPhone 13 / 14 / 15** | $390 \times 844$ | Portrait | ✅ Pass (Zero Overflow) | `verified_390x844.png` |
| **iPhone Pro Max / Plus** | $430 \times 932$ | Portrait | ✅ Pass (Zero Overflow) | `verified_430x932.png` |
| **iPad / Tablet** | $768 \times 1024$ | Portrait | ✅ Pass (Centered UI) | `verified_768x1024.png` |
| **iPad / Tablet** | $1024 \times 768$ | Landscape | ✅ Pass (Centered UI) | `verified_1024x768.png` |
| **Laptop Display** | $1366 \times 768$ | Landscape | ✅ Pass (Centered UI) | `verified_1366x768.png` |
| **Desktop Full HD** | $1920 \times 1080$ | Landscape | ✅ Pass (Centered UI) | `verified_1920x1080.png` |

---

## 🎓 11. Student Viva & Practical Exam Quick-Reference Guide

Use this concise, easy-to-remember cheat sheet during your MCA Multimedia Systems practical examination or viva:

### Q1: What makes this game "pseudo-3D" if it uses a 2D Canvas?
> **Answer**: "We project 3D world coordinates $(X, Y, Z)$ onto a 2D canvas using perspective scaling. Objects with a larger $Z$ (further away) are drawn smaller and closer to the vanishing point $(V_x, V_y)$ on the horizon. Objects with a smaller $Z$ (closer to the camera) are scaled larger. This creates a realistic illusion of depth and forward motion without needing a 3D WebGL engine."

### Q2: How does the game achieve smooth animation across devices with different refresh rates?
> **Answer**: "We utilize `requestAnimationFrame()` with a **Delta-Time ($\Delta t$)** calculation. Instead of moving objects by a fixed pixel amount each frame, movement is calculated as $\text{Velocity} \times \Delta t$. This ensures that whether the user runs at 60Hz, 90Hz, or 144Hz, the character runs at the exact same physical speed."

### Q3: How are sound effects and background rhythm generated without audio files?
> **Answer**: "We use the **Web Audio API**. We synthesize sound procedurally using `OscillatorNode` for pitch frequencies, `BiquadFilterNode` for stone/muffled timbre, and `GainNode` with exponential decay curves for percussive envelopes. A 16-step sequencer rhythmically triggers tribal drum patterns, eliminating missing sound asset errors or HTTP download delays."

### Q4: How is collision detection calculated?
> **Answer**: "Collision is evaluated in 3D bounding space:
> 1. **$Z$-depth slice**: The obstacle must be within $\pm 25$ units of the player's camera position.
> 2. **$X$-lane alignment**: The player's lane coordinate must overlap the obstacle's lane width.
> 3. **$Y$-clearance & state rules**:
>    - Low hurdle: Cleared if $Y_{\text{player}} > 38$ (Jumping).
>    - Overhead lintel: Cleared if state is `SLIDING`.
>    - Stone monolith: Solid tall block; fatal unless dodged to an adjacent lane."

### Q5: How do mobile touch controls and gestures work?
> **Answer**: "We listen to `touchstart` and `touchend` events. When a finger lifts, we compute $\Delta X$ and $\Delta Y$. If the movement exceeds a minimum swipe threshold ($35\text{px}$), we compare $|\Delta X|$ vs $|\Delta Y|$ to identify horizontal lane switches versus vertical jumps or slides. We also provide on-screen touch buttons for comfortable thumb controls on mobile screens."

---

## ⚖️ 12. License & Academic Attribution
Developed as an MCA Multimedia Systems Laboratory Project. Released under the [MIT License](LICENSE).
All graphics, procedural character kinematics, and synthesized audio frequencies are original creations.
