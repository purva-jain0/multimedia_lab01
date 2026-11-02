/* ==========================================================================
   Jungle Dash: Lost Temple - Web Audio API Sound Synthesizer & Jungle Rhythm
   MCA Multimedia Systems Lab - Procedural Audio Synthesis & AudioContext
   ========================================================================== */

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.isMuted = false;
        this.isInitialized = false;
        this.isBgmPlaying = false;

        // Music sequencer parameters
        this.bgmTimer = null;
        this.tempo = 124; // Beats per minute
        this.step = 0;
        this.drumFrequencies = {
            kick: 130,
            congaHigh: 340,
            congaLow: 220,
            shaker: 1000
        };

        // Load saved mute state
        try {
            const savedMute = localStorage.getItem('jungledash_muted');
            if (savedMute !== null) {
                this.isMuted = JSON.parse(savedMute);
            }
        } catch {
            this.isMuted = false;
        }
    }

    /**
     * Initializes the Web Audio Context upon the first user interaction.
     * Complies with modern browser Autoplay Policy restrictions.
     */
    init() {
        if (this.isInitialized) {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return;
        }

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('Web Audio API not supported in this browser.');
                return;
            }

            this.ctx = new AudioContextClass();

            // Master Gain node
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // Music channel
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            // Sound Effects channel
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.isInitialized = true;
        } catch (e) {
            console.warn('AudioContext initialization failed:', e);
        }
    }

    /**
     * Toggles audio mute state.
     * @returns {boolean} Current muted state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        try {
            localStorage.setItem('jungledash_muted', JSON.stringify(this.isMuted));
        } catch {}

        if (this.masterGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, now, 0.05);
        }

        return this.isMuted;
    }

    /**
     * Plays a crisp coin collection chime (arpeggiated crystal harmonic).
     */
    playCoin() {
        if (!this.canPlay()) return;

        const now = this.ctx.currentTime;

        // Primary bell tone
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(987.77, now); // B5
        osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.09); // E6

        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc1.connect(gain1);
        gain1.connect(this.sfxGain);

        osc1.start(now);
        osc1.stop(now + 0.22);

        // Secondary high shimmer
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1975.53, now + 0.04); // B6
        gain2.gain.setValueAtTime(0.2, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc2.connect(gain2);
        gain2.connect(this.sfxGain);

        osc2.start(now + 0.04);
        osc2.stop(now + 0.28);
    }

    /**
     * Plays a rising whoosh sound for jumping.
     */
    playJump() {
        if (!this.canPlay()) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * Plays a swoosh/slide friction sound.
     */
    playSlide() {
        if (!this.canPlay()) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.22;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter to sound like stone slide
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.2);
        filter.Q.value = 2.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
    }

    /**
     * Plays a lane switch swoosh sound.
     */
    playLaneSwitch() {
        if (!this.canPlay()) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Plays an impact collision crash.
     */
    playCrash() {
        if (!this.canPlay()) return;

        const now = this.ctx.currentTime;

        // Heavy low boom
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.4);

        // Stone shatter noise burst
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.28);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(now);
    }

    /**
     * Plays the game over defeat cadence.
     */
    playGameOver() {
        if (!this.canPlay()) return;

        const notes = [293.66, 261.63, 220.00, 174.61]; // D4 -> C4 -> A3 -> F3
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const time = now + idx * 0.16;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, time);

            gain.gain.setValueAtTime(0.25, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(time);
            osc.stop(time + 0.36);
        });
    }

    /**
     * UI button click sound.
     */
    playClick() {
        if (!this.canPlay()) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    /**
     * Starts the procedural tribal jungle ambient rhythm loop.
     */
    startBGM() {
        if (this.isBgmPlaying) return;
        this.init();
        if (!this.ctx) return;

        this.isBgmPlaying = true;
        this.step = 0;
        this.scheduleBeat();
    }

    /**
     * Schedules procedural drum pattern beats.
     */
    scheduleBeat() {
        if (!this.isBgmPlaying || !this.ctx) return;

        const stepDuration = 60 / this.tempo / 4; // 16th note in seconds
        const now = this.ctx.currentTime;

        // 16-step jungle rhythm pattern
        // Step 0: Kick + Conga
        // Step 2: Shaker
        // Step 4: Low Conga
        // Step 6: Shaker
        // Step 8: Kick
        // Step 10: High Conga
        // Step 12: Low Conga
        // Step 14: Shaker accent
        const s = this.step % 16;

        if (s === 0 || s === 8) {
            this.playSynthKick(now);
        }
        if (s === 4 || s === 12) {
            this.playSynthConga(now, 210, 0.22);
        }
        if (s === 2 || s === 10) {
            this.playSynthConga(now, 330, 0.18);
        }
        if (s % 2 === 0) {
            this.playSynthShaker(now, s % 4 === 0 ? 0.08 : 0.04);
        }

        this.step++;
        const nextTime = Math.max(20, stepDuration * 1000);
        this.bgmTimer = setTimeout(() => this.scheduleBeat(), nextTime);
    }

    playSynthKick(time) {
        if (!this.musicGain || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playSynthConga(time, freq, vol) {
        if (!this.musicGain || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, time + 0.1);

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.13);
    }

    playSynthShaker(time, vol) {
        if (!this.musicGain || !this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2500, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
    }

    /**
     * Stops the background rhythm.
     */
    stopBGM() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    canPlay() {
        return this.isInitialized && this.ctx && this.ctx.state !== 'closed';
    }
}
