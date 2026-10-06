# VoiceMorph: ElevenLabs Voice Cloning & Sound Morphing Web App
> **Capstone Project — Multimedia Lab 01**  
> Modern Full-Stack Voice Cloning and Speech-to-Speech Transformation application using **ElevenLabs AI**, **FastAPI (Python)**, and **React + Vite**.

---

## 🌟 Key Features

1. **Spacebar Recording Console (Push-to-Talk & Toggle)**
   - Press and hold **Spacebar** to record your voice naturally.
   - Release the spacebar (or tap again in toggle mode) to automatically send the audio for transformation.
   - Real-time Web Audio API frequency visualizer and recording duration timer.
   - Page scroll prevention (`e.preventDefault()`) on spacebar.

2. **Instant Response in a Different Voice / Sound**
   - Transformed voice **automatically plays** as soon as the response arrives.
   - Dual audio comparison players: **Original Voice** vs **Transformed Voice**.
   - Download the transformed MP3 file with one click.

3. **ElevenLabs AI Speech-to-Speech (STS)**
   - High-fidelity voice conversion preserving emotional inflection, cadence, and speech dynamics.
   - Curated default voice library (Adam, Rachel, Antoni, Arnold, Bella, Charlie, Domi, Josh, Nicole, Daniel).
   - Voice stability and similarity boost fine-tuning sliders.

4. **Instant Voice Cloning (IVC)**
   - Clone any voice sample directly from the UI.
   - Record 5–15 seconds of sample speech or upload an audio file to create a brand new custom voice profile on ElevenLabs.

5. **Local DSP Sound FX (Offline / Zero Token Mode)**
   - High-quality offline pitch and filter transformation powered by FFmpeg:
     - 🎙️ **Deep Narration**: Pitch shift down ~4 semitones with warm bass boost.
     - 🐿️ **High Pitch / Chipmunk**: Pitch shift up ~5 semitones.
     - 🤖 **Cyborg Robot**: Flanger and tremolo modulation.
     - 📻 **Vintage Radio**: Walkie-talkie bandpass filter with 8-bit crunch.
     - 🌌 **Spectral Echo**: Reverb and stereo delay.

6. **In-App API Key Configuration**
   - Configure your ElevenLabs API key directly through the web UI modal or via `backend/.env`.
   - Account tier and character balance validation.

---

## 📁 Project Structure

```
D:\multimedia_lab01\capstone_project\voice_cloning\
├── backend/
│   ├── main.py              # FastAPI server (ElevenLabs STS, IVC, FFmpeg DSP, static serving)
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Template for environment variables
│   ├── .env                 # API Key and host configuration
│   └── storage/
│       ├── uploads/         # Temporary audio recordings
│       └── outputs/         # Generated transformed audio files
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application component & layout
│   │   ├── index.css        # Glassmorphic dark studio theme & animations
│   │   ├── main.jsx         # React DOM root entry
│   │   └── components/
│   │       ├── SpacebarRecorder.jsx   # Spacebar recording logic & visualizer
│   │       ├── AudioVisualizer.jsx    # Canvas audio frequency visualizer
│   │       ├── VoiceSelector.jsx      # Voice library & settings sliders
│   │       ├── LocalFxSelector.jsx    # Local DSP sound effects
│   │       ├── AudioResultCard.jsx    # Comparison audio player
│   │       ├── VoiceClonerModal.jsx   # Instant Voice Cloning modal
│   │       └── ApiKeyModal.jsx        # ElevenLabs API key settings
│   ├── vite.config.js       # Vite configuration with proxy to FastAPI
│   └── package.json
├── start_app.bat            # One-click Windows launcher (runs full-stack app)
├── run_backend.bat          # Starts backend server (http://127.0.0.1:8000)
├── run_frontend.bat         # Starts frontend dev server (http://localhost:5173)
└── README.md
```

---

## 🚀 Quick Start Guide

### Option 1: One-Click Launch (Recommended)
Double-click `start_app.bat` in the root folder.  
It will start the backend server and open the web application at `http://localhost:8000` in your browser.

### Option 2: Running Backend & Frontend Separately

#### 1. Start the Backend:
```powershell
cd D:\multimedia_lab01\capstone_project\voice_cloning\backend
python main.py
```
*(Runs on `http://127.0.0.1:8000`)*

#### 2. Start the Frontend (Vite Dev Server):
```powershell
cd D:\multimedia_lab01\capstone_project\voice_cloning\frontend
npm run dev
```
*(Runs on `http://localhost:5173` with hot-reloading)*

---

## 🔑 Setting Up ElevenLabs API Key

1. Get a free API key at [ElevenLabs](https://elevenlabs.io/app/settings/api-keys).
2. You can either:
   - Click the **Set API Key** button in the web app header and paste your key, **OR**
   - Add your key to `backend/.env`:
     ```env
     ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
     ```

*(Note: Even without an API key, you can switch to **Local DSP FX** in the app header and test spacebar recording and voice changing immediately!)*

---

## 🎙️ How to Use

1. Select your target voice (e.g. **Adam**, **Rachel**, **Antoni**, or your cloned voice).
2. Press and **hold the Spacebar** on your keyboard (or click the microphone circle).
3. Speak a sentence clearly into your microphone.
4. **Release the Spacebar**.
5. The audio will automatically be sent to the backend, transformed, and **played back immediately in the new voice**!
6. Use the **Download** button to save the transformed audio file.
