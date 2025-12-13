/**
 * SoundEngine - Vintage-style procedural audio using Web Audio API
 * Generates all sounds programmatically (no audio files needed)
 * Simulates old PC speaker / chiptune aesthetics
 */

export class SoundEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.initialized = false;

        // Volume settings (balanced for comfort)
        this.masterVolume = 0.5;   // 50% master
        this.sfxVolume = 0.65;     // SFX prominent but not harsh
        this.musicVolume = 0.35;   // Music/engine ambient

        // Active sound nodes (for cleanup)
        this.activeSounds = new Set();

        // Mute state
        this.isMuted = false;
        this.savedVolume = this.masterVolume;

        // Engine loop state
        this.engineLoop = null;
        this.engineGain = null;
        this.engineRunning = false;

        // Menu jingle state
        this.menuJingle = null;
        this.menuJingleGain = null;
        this.menuJingleRunning = false;
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    init() {
        if (this.initialized) return true;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);

            this.initialized = true;
            return true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            return false;
        }
    }

    /**
     * Resume audio context (needed for browsers that suspend it)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Set master volume (0-1)
     */
    setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    /**
     * Set SFX volume (0-1)
     */
    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
    }

    /**
     * Set music volume (0-1)
     */
    setMusicVolume(value) {
        this.musicVolume = Math.max(0, Math.min(1, value));
        if (this.engineGain) {
            this.engineGain.gain.value = this.musicVolume * 0.15;
        }
        if (this.menuJingleGain) {
            this.menuJingleGain.gain.value = this.musicVolume * 0.25;
        }
    }

    /**
     * Toggle mute on/off
     * @returns {boolean} New mute state (true = muted)
     */
    toggleMute() {
        if (this.isMuted) {
            // Unmute - restore saved volume
            this.masterVolume = this.savedVolume;
            if (this.masterGain) {
                this.masterGain.gain.value = this.masterVolume;
            }
            this.isMuted = false;
        } else {
            // Mute - save current volume and set to 0
            this.savedVolume = this.masterVolume;
            this.masterVolume = 0;
            if (this.masterGain) {
                this.masterGain.gain.value = 0;
            }
            this.isMuted = true;
        }
        return this.isMuted;
    }

    /**
     * Get mute state
     * @returns {boolean} True if muted
     */
    getMuted() {
        return this.isMuted;
    }

    /**
     * Create a simple oscillator with envelope
     */
    createOscillator(type, frequency, duration, volume = 1, attack = 0.01, decay = 0.1) {
        if (!this.initialized) return null;

        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        // ADSR envelope (simplified: attack + decay)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * this.sfxVolume, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);

        // Cleanup
        osc.onended = () => {
            gain.disconnect();
            this.activeSounds.delete(osc);
        };
        this.activeSounds.add(osc);

        return osc;
    }

    /**
     * Create noise generator
     */
    createNoise(duration, volume = 1, filterFreq = 1000) {
        if (!this.initialized) return null;

        const now = this.audioContext.currentTime;
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // White noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(volume * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + duration);

        noise.onended = () => {
            gain.disconnect();
            filter.disconnect();
            this.activeSounds.delete(noise);
        };
        this.activeSounds.add(noise);

        return noise;
    }

    // ==================== SOUND EFFECTS ====================

    /**
     * Movement command sound - mechanical typewriter click
     */
    playMove() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Mechanical click with slight frequency variation
        const baseFreq = 700 + Math.random() * 200; // 700-900Hz variation

        // Main click
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.03);

        gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.04);

        // Add tiny noise burst for mechanical feel
        this.createNoise(0.02, 0.15, 2000);

        osc.onended = () => {
            gain.disconnect();
            this.activeSounds.delete(osc);
        };
        this.activeSounds.add(osc);
    }

    /**
     * Vegetable/item collection sound - satisfying pluck
     */
    playCollect() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Main pluck - rising chirp with harmonic
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.type = 'triangle'; // Softer base
        osc2.type = 'square';   // Harmonic brightness

        osc1.frequency.setValueAtTime(350, now);
        osc1.frequency.exponentialRampToValueAtTime(900, now + 0.06);

        osc2.frequency.setValueAtTime(700, now); // Octave up
        osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.06);

        const mixer = this.audioContext.createGain();
        mixer.gain.value = 0.5;

        // Envelope with longer tail
        gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
        gain.gain.setValueAtTime(0.4 * this.sfxVolume, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc1.connect(gain);
        osc2.connect(mixer);
        mixer.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.15);
        osc2.stop(now + 0.15);

        osc1.onended = () => {
            gain.disconnect();
            mixer.disconnect();
            this.activeSounds.delete(osc1);
            this.activeSounds.delete(osc2);
        };
        this.activeSounds.add(osc1);
        this.activeSounds.add(osc2);
    }

    /**
     * Crash sound - tractor hitting rock with metallic impact
     */
    playCrash() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Metallic clang component (high frequency ring)
        const clang = this.audioContext.createOscillator();
        const clangGain = this.audioContext.createGain();

        clang.type = 'sine';
        clang.frequency.setValueAtTime(1200, now);
        clang.frequency.exponentialRampToValueAtTime(400, now + 0.15);

        clangGain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
        clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        clang.connect(clangGain);
        clangGain.connect(this.masterGain);

        clang.start(now);
        clang.stop(now + 0.2);

        // Impact thud with distortion
        const thud = this.audioContext.createOscillator();
        const thudGain = this.audioContext.createGain();
        const distortion = this.audioContext.createWaveShaper();

        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i / 128) - 1;
            curve[i] = Math.tanh(x * 4);
        }
        distortion.curve = curve;

        thud.type = 'sawtooth';
        thud.frequency.setValueAtTime(150, now);
        thud.frequency.exponentialRampToValueAtTime(40, now + 0.25);

        thudGain.gain.setValueAtTime(0.6 * this.sfxVolume, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        thud.connect(distortion);
        distortion.connect(thudGain);
        thudGain.connect(this.masterGain);

        thud.start(now);
        thud.stop(now + 0.3);

        // Debris noise burst
        this.createNoise(0.2, 0.5, 1200);

        clang.onended = () => {
            clangGain.disconnect();
            this.activeSounds.delete(clang);
        };
        thud.onended = () => {
            thudGain.disconnect();
            distortion.disconnect();
            this.activeSounds.delete(thud);
        };
        this.activeSounds.add(clang);
        this.activeSounds.add(thud);
    }

    /**
     * Game over sound - dramatic classic arcade death
     */
    playGameOver() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Stop engine if running
        this.stopEngine();

        // Slower, more dramatic descending notes
        const notes = [440, 392, 349, 294, 247, 196, 147];
        const noteLength = 0.2; // Slower

        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator(); // Harmony
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc2.type = 'sawtooth';
            osc.frequency.value = freq;
            osc2.frequency.value = freq * 0.5; // Octave below

            const startTime = now + (i * noteLength);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.5 * this.sfxVolume, startTime + 0.03);
            gain.gain.setValueAtTime(0.45 * this.sfxVolume, startTime + noteLength * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength);

            const mixer = this.audioContext.createGain();
            mixer.gain.value = 0.4;

            osc.connect(gain);
            osc2.connect(mixer);
            mixer.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc2.start(startTime);
            osc.stop(startTime + noteLength);
            osc2.stop(startTime + noteLength);

            osc.onended = () => {
                gain.disconnect();
                mixer.disconnect();
                this.activeSounds.delete(osc);
                this.activeSounds.delete(osc2);
            };
            this.activeSounds.add(osc);
            this.activeSounds.add(osc2);
        });

        // Final rumble and noise burst
        const totalTime = notes.length * noteLength;
        setTimeout(() => {
            this.createNoise(0.5, 0.4, 300);
            // Low rumble
            const rumble = this.audioContext.createOscillator();
            const rumbleGain = this.audioContext.createGain();
            rumble.type = 'sine';
            rumble.frequency.value = 50;
            rumbleGain.gain.setValueAtTime(0.3 * this.sfxVolume, this.audioContext.currentTime);
            rumbleGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
            rumble.connect(rumbleGain);
            rumbleGain.connect(this.masterGain);
            rumble.start();
            rumble.stop(this.audioContext.currentTime + 0.4);
        }, totalTime * 1000);
    }

    /**
     * Power-up activation sound (dd/dG) - powerful clearing whoosh
     */
    playPowerup() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Rising sweep with harmonics
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.type = 'square';
        osc2.type = 'sawtooth';

        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.exponentialRampToValueAtTime(1000, now + 0.25);

        osc2.frequency.setValueAtTime(300, now);
        osc2.frequency.exponentialRampToValueAtTime(2000, now + 0.25);

        gain.gain.setValueAtTime(0.5 * this.sfxVolume, now);
        gain.gain.setValueAtTime(0.45 * this.sfxVolume, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        const mixer = this.audioContext.createGain();
        mixer.gain.value = 0.5;

        osc1.connect(mixer);
        osc2.connect(mixer);
        mixer.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);

        // Whoosh noise component
        const whooshDuration = 0.35;
        const whooshBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * whooshDuration, this.audioContext.sampleRate);
        const whooshData = whooshBuffer.getChannelData(0);
        for (let i = 0; i < whooshBuffer.length; i++) {
            whooshData[i] = Math.random() * 2 - 1;
        }

        const whoosh = this.audioContext.createBufferSource();
        whoosh.buffer = whooshBuffer;

        const whooshFilter = this.audioContext.createBiquadFilter();
        whooshFilter.type = 'bandpass';
        whooshFilter.frequency.setValueAtTime(500, now);
        whooshFilter.frequency.exponentialRampToValueAtTime(3000, now + 0.25);
        whooshFilter.Q.value = 2;

        const whooshGain = this.audioContext.createGain();
        whooshGain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
        whooshGain.gain.exponentialRampToValueAtTime(0.001, now + whooshDuration);

        whoosh.connect(whooshFilter);
        whooshFilter.connect(whooshGain);
        whooshGain.connect(this.masterGain);

        whoosh.start(now);
        whoosh.stop(now + whooshDuration);

        osc1.onended = () => {
            gain.disconnect();
            mixer.disconnect();
            this.activeSounds.delete(osc1);
            this.activeSounds.delete(osc2);
        };
        whoosh.onended = () => {
            whooshGain.disconnect();
            whooshFilter.disconnect();
            this.activeSounds.delete(whoosh);
        };
        this.activeSounds.add(osc1);
        this.activeSounds.add(osc2);
        this.activeSounds.add(whoosh);
    }

    /**
     * Extra life collected sound - country banjo-style celebration
     */
    playExtraLife() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Country/bluegrass style notes (G major pentatonic feel)
        // G4, B4, D5, G5 with twangy attack
        const notes = [392, 494, 587, 784];
        const noteLength = 0.1;

        notes.forEach((freq, i) => {
            // Main note with sawtooth for twang
            const osc = this.audioContext.createOscillator();
            const oscTwang = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle';
            oscTwang.type = 'sawtooth';

            // Twang effect - slight pitch bend down
            const startTime = now + (i * noteLength);
            osc.frequency.setValueAtTime(freq * 1.02, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.03);

            oscTwang.frequency.setValueAtTime(freq * 2.02, startTime);
            oscTwang.frequency.exponentialRampToValueAtTime(freq * 2, startTime + 0.02);

            // Sharp attack, quick decay (banjo-like)
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.4 * this.sfxVolume, startTime + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength * 1.2);

            const twangMix = this.audioContext.createGain();
            twangMix.gain.value = 0.25;

            osc.connect(gain);
            oscTwang.connect(twangMix);
            twangMix.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            oscTwang.start(startTime);
            osc.stop(startTime + noteLength * 1.2);
            oscTwang.stop(startTime + noteLength * 1.2);

            osc.onended = () => {
                gain.disconnect();
                twangMix.disconnect();
                this.activeSounds.delete(osc);
                this.activeSounds.delete(oscTwang);
            };
            this.activeSounds.add(osc);
            this.activeSounds.add(oscTwang);
        });
    }

    /**
     * Gas can collected sound - glug-glug fueling up
     */
    playGasCanCollect() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Glug-glug rhythm (like pouring liquid)
        const glugs = [
            { delay: 0, freq: 280, duration: 0.08 },
            { delay: 0.09, freq: 320, duration: 0.07 },
            { delay: 0.17, freq: 260, duration: 0.09 },
            { delay: 0.27, freq: 340, duration: 0.06 },
            { delay: 0.34, freq: 300, duration: 0.08 },
        ];

        glugs.forEach(glug => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.type = 'sine';
            filter.type = 'lowpass';
            filter.frequency.value = 600;
            filter.Q.value = 5; // Resonance for liquid feel

            const startTime = now + glug.delay;
            osc.frequency.setValueAtTime(glug.freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(glug.freq * 0.6, startTime + glug.duration);

            // Bubble envelope
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3 * this.sfxVolume, startTime + 0.01);
            gain.gain.setValueAtTime(0.25 * this.sfxVolume, startTime + glug.duration * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + glug.duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + glug.duration);

            osc.onended = () => {
                gain.disconnect();
                filter.disconnect();
                this.activeSounds.delete(osc);
            };
            this.activeSounds.add(osc);
        });

        // Final splash
        setTimeout(() => {
            this.createNoise(0.06, 0.15, 1500);
        }, 400);
    }

    /**
     * Level up / speed increase sound - triumphant ascending scale
     */
    playLevelUp() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Quick ascending fanfare
        const notes = [392, 494, 587, 784, 988]; // G4, B4, D5, G5, B5
        const noteLength = 0.08;

        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc2.type = 'triangle';
            osc.frequency.value = freq;
            osc2.frequency.value = freq * 2;

            const startTime = now + (i * noteLength);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.35 * this.sfxVolume, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength * 1.5);

            const mix = this.audioContext.createGain();
            mix.gain.value = 0.3;

            osc.connect(gain);
            osc2.connect(mix);
            mix.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc2.start(startTime);
            osc.stop(startTime + noteLength * 1.5);
            osc2.stop(startTime + noteLength * 1.5);

            osc.onended = () => {
                gain.disconnect();
                mix.disconnect();
                this.activeSounds.delete(osc);
                this.activeSounds.delete(osc2);
            };
            this.activeSounds.add(osc);
            this.activeSounds.add(osc2);
        });

        // Engine rev sound at the end
        const revTime = now + notes.length * noteLength;
        const revOsc = this.audioContext.createOscillator();
        const revGain = this.audioContext.createGain();

        revOsc.type = 'sawtooth';
        revOsc.frequency.setValueAtTime(40, revTime);
        revOsc.frequency.exponentialRampToValueAtTime(80, revTime + 0.15);
        revOsc.frequency.exponentialRampToValueAtTime(50, revTime + 0.3);

        revGain.gain.setValueAtTime(0, revTime);
        revGain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, revTime + 0.05);
        revGain.gain.exponentialRampToValueAtTime(0.001, revTime + 0.35);

        const revFilter = this.audioContext.createBiquadFilter();
        revFilter.type = 'lowpass';
        revFilter.frequency.value = 150;

        revOsc.connect(revFilter);
        revFilter.connect(revGain);
        revGain.connect(this.masterGain);

        revOsc.start(revTime);
        revOsc.stop(revTime + 0.35);

        revOsc.onended = () => {
            revGain.disconnect();
            revFilter.disconnect();
            this.activeSounds.delete(revOsc);
        };
        this.activeSounds.add(revOsc);
    }

    /**
     * Timer warning - subtle tick when time is running low
     */
    playTimerWarning() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Quick warning beep
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = 880; // A5 - attention getting

        gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.08);

        osc.onended = () => {
            gain.disconnect();
            this.activeSounds.delete(osc);
        };
        this.activeSounds.add(osc);
    }

    /**
     * Command mode entry - terminal/typewriter ding
     */
    playCommandMode() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Classic terminal bell
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = 1000;

        gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);

        // Add harmonic for bell-like quality
        const harm = this.audioContext.createOscillator();
        const harmGain = this.audioContext.createGain();

        harm.type = 'sine';
        harm.frequency.value = 2500;

        harmGain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        harm.connect(harmGain);
        harmGain.connect(this.masterGain);

        harm.start(now);
        harm.stop(now + 0.1);

        osc.onended = () => {
            gain.disconnect();
            this.activeSounds.delete(osc);
        };
        harm.onended = () => {
            harmGain.disconnect();
            this.activeSounds.delete(harm);
        };
        this.activeSounds.add(osc);
        this.activeSounds.add(harm);
    }

    /**
     * Command execution confirmation beep
     */
    playCommandExecute() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Double beep confirmation
        [0, 0.08].forEach(delay => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.value = 600;

            const startTime = now + delay;
            gain.gain.setValueAtTime(0.2 * this.sfxVolume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.05);

            osc.onended = () => {
                gain.disconnect();
                this.activeSounds.delete(osc);
            };
            this.activeSounds.add(osc);
        });
    }

    /**
     * Explosion sound - big boom with debris
     */
    playExplosion() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Low rumble boom
        const boom = this.audioContext.createOscillator();
        const boomGain = this.audioContext.createGain();

        boom.type = 'sawtooth';
        boom.frequency.setValueAtTime(80, now);
        boom.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        boomGain.gain.setValueAtTime(0.6 * this.sfxVolume, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        boom.connect(boomGain);
        boomGain.connect(this.masterGain);

        boom.start(now);
        boom.stop(now + 0.6);

        // Crackle noise
        this.createNoise(0.4, 0.5, 800);

        // High frequency sizzle
        const sizzle = this.audioContext.createOscillator();
        const sizzleGain = this.audioContext.createGain();

        sizzle.type = 'square';
        sizzle.frequency.setValueAtTime(1500, now);
        sizzle.frequency.exponentialRampToValueAtTime(200, now + 0.3);

        sizzleGain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
        sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        sizzle.connect(sizzleGain);
        sizzleGain.connect(this.masterGain);

        sizzle.start(now);
        sizzle.stop(now + 0.35);

        boom.onended = () => {
            boomGain.disconnect();
            this.activeSounds.delete(boom);
        };
        sizzle.onended = () => {
            sizzleGain.disconnect();
            this.activeSounds.delete(sizzle);
        };
        this.activeSounds.add(boom);
        this.activeSounds.add(sizzle);
    }

    /**
     * Transmutation working sound - drilling/digging loop
     * Returns a stop function to end the sound
     */
    playTransmuteWork() {
        if (!this.initialized) return () => {};

        const now = this.audioContext.currentTime;
        const duration = 2.5; // Slightly longer than transmutation for safety

        // Create drilling/working sound - rhythmic grinding
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        const mainGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        // LFO for rhythmic pulsing (like a jackhammer)
        lfo.type = 'square';
        lfo.frequency.value = 12; // 12 Hz pulse
        lfoGain.gain.value = 30;
        lfo.connect(lfoGain);

        // Main oscillators - low grinding sound
        osc1.type = 'sawtooth';
        osc1.frequency.value = 80;
        lfoGain.connect(osc1.frequency); // Modulate pitch

        osc2.type = 'square';
        osc2.frequency.value = 120;

        // Low pass filter for rumble
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 2;

        // Envelope - fade in and sustain
        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(0.25 * this.sfxVolume, now + 0.1);
        mainGain.gain.setValueAtTime(0.2 * this.sfxVolume, now + duration - 0.2);
        mainGain.gain.linearRampToValueAtTime(0, now + duration);

        // Connect
        const mixer = this.audioContext.createGain();
        mixer.gain.value = 0.5;

        osc1.connect(filter);
        osc2.connect(mixer);
        mixer.connect(filter);
        filter.connect(mainGain);
        mainGain.connect(this.masterGain);

        // Start
        lfo.start(now);
        osc1.start(now);
        osc2.start(now);
        lfo.stop(now + duration);
        osc1.stop(now + duration);
        osc2.stop(now + duration);

        // Cleanup
        osc1.onended = () => {
            mainGain.disconnect();
            filter.disconnect();
            mixer.disconnect();
            lfoGain.disconnect();
            this.activeSounds.delete(osc1);
            this.activeSounds.delete(osc2);
            this.activeSounds.delete(lfo);
        };

        this.activeSounds.add(osc1);
        this.activeSounds.add(osc2);
        this.activeSounds.add(lfo);

        // Return stop function for early termination
        return () => {
            try {
                mainGain.gain.cancelScheduledValues(this.audioContext.currentTime);
                mainGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.05);
                setTimeout(() => {
                    try {
                        lfo.stop();
                        osc1.stop();
                        osc2.stop();
                    } catch (e) { /* ignore */ }
                }, 60);
            } catch (e) { /* ignore */ }
        };
    }

    /**
     * Penalty sound - point loss buzzer (like wrong answer)
     */
    playPenalty() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Descending dissonant buzz - classic "wrong" sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.type = 'square';
        osc2.type = 'sawtooth';

        // Descending, slightly detuned for dissonance
        osc1.frequency.setValueAtTime(400, now);
        osc1.frequency.exponentialRampToValueAtTime(150, now + 0.25);

        osc2.frequency.setValueAtTime(410, now); // Slight detune for buzz
        osc2.frequency.exponentialRampToValueAtTime(145, now + 0.25);

        // Sharp attack, sustain, then fade
        gain.gain.setValueAtTime(0.5 * this.sfxVolume, now);
        gain.gain.setValueAtTime(0.45 * this.sfxVolume, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        const mixer = this.audioContext.createGain();
        mixer.gain.value = 0.7;

        osc1.connect(mixer);
        osc2.connect(mixer);
        mixer.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);

        // Add rumble undertone
        const rumble = this.audioContext.createOscillator();
        const rumbleGain = this.audioContext.createGain();
        rumble.type = 'sine';
        rumble.frequency.value = 60;
        rumbleGain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        rumble.connect(rumbleGain);
        rumbleGain.connect(this.masterGain);
        rumble.start(now);
        rumble.stop(now + 0.25);

        osc1.onended = () => {
            gain.disconnect();
            mixer.disconnect();
            this.activeSounds.delete(osc1);
            this.activeSounds.delete(osc2);
        };
        rumble.onended = () => {
            rumbleGain.disconnect();
            this.activeSounds.delete(rumble);
        };
        this.activeSounds.add(osc1);
        this.activeSounds.add(osc2);
        this.activeSounds.add(rumble);
    }

    /**
     * Sad death screen music - melancholic minor melody
     */
    playDeathMusic() {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;

        // Sad descending minor melody
        // A minor: A4, E4, C4, A3 with slow timing
        const melody = [
            { freq: 440, delay: 0, dur: 0.4 },     // A4
            { freq: 330, delay: 0.5, dur: 0.4 },   // E4
            { freq: 262, delay: 1.0, dur: 0.5 },   // C4
            { freq: 220, delay: 1.6, dur: 0.8 },   // A3 (final, long)
        ];

        melody.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle'; // Soft, sad tone

            const startTime = now + note.delay;
            osc.frequency.value = note.freq;

            // Slow attack, gentle decay
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.25 * this.musicVolume, startTime + 0.1);
            gain.gain.setValueAtTime(0.2 * this.musicVolume, startTime + note.dur * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + note.dur);

            osc.onended = () => {
                gain.disconnect();
                this.activeSounds.delete(osc);
            };
            this.activeSounds.add(osc);
        });
    }

    // ==================== LOOPS ====================

    /**
     * Start tractor engine loop - rhythmic diesel putt-putt
     */
    startEngine() {
        if (!this.initialized || this.engineRunning) return;

        const now = this.audioContext.currentTime;

        // Create engine gain - subtle
        this.engineGain = this.audioContext.createGain();
        this.engineGain.gain.value = this.musicVolume * 0.12;
        this.engineGain.connect(this.masterGain);

        // Putt-putt rhythm LFO (tractor engine firing rate)
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'square'; // Square wave for distinct putt-putt
        lfo.frequency.value = 3.5; // ~210 RPM feel

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 20; // Modulation depth for frequency

        lfo.connect(lfoGain);

        // Main engine sound - low sawtooth with character
        const engine = this.audioContext.createOscillator();
        engine.type = 'sawtooth';
        engine.frequency.value = 42; // Low rumble base

        lfoGain.connect(engine.frequency); // FM modulation creates putt-putt

        // Filter for warmth
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180;
        filter.Q.value = 2; // Slight resonance

        // Amplitude modulation for more pronounced rhythm
        const ampLfo = this.audioContext.createOscillator();
        ampLfo.type = 'sine';
        ampLfo.frequency.value = 3.5; // Same as main LFO

        const ampLfoGain = this.audioContext.createGain();
        ampLfoGain.gain.value = 0.3; // Volume variation amount

        const engineVol = this.audioContext.createGain();
        engineVol.gain.value = 0.6;

        ampLfo.connect(ampLfoGain);
        ampLfoGain.connect(engineVol.gain); // Modulate volume

        // Sub bass (steady foundation)
        const sub = this.audioContext.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = 28;

        const subGain = this.audioContext.createGain();
        subGain.gain.value = 0.35;

        // Connect
        engine.connect(filter);
        filter.connect(engineVol);
        engineVol.connect(this.engineGain);

        sub.connect(subGain);
        subGain.connect(this.engineGain);

        // Start
        lfo.start(now);
        ampLfo.start(now);
        engine.start(now);
        sub.start(now);

        this.engineLoop = { lfo, engine, sub, filter, lfoGain, subGain, ampLfo, ampLfoGain, engineVol };
        this.engineRunning = true;
    }

    /**
     * Stop tractor engine loop
     */
    stopEngine() {
        if (!this.engineLoop) return;

        const { lfo, engine, sub, filter, lfoGain, subGain, ampLfo, ampLfoGain, engineVol } = this.engineLoop;

        try {
            lfo.stop();
            engine.stop();
            sub.stop();
            if (ampLfo) ampLfo.stop();

            lfo.disconnect();
            engine.disconnect();
            sub.disconnect();
            filter.disconnect();
            lfoGain.disconnect();
            subGain.disconnect();
            if (ampLfo) ampLfo.disconnect();
            if (ampLfoGain) ampLfoGain.disconnect();
            if (engineVol) engineVol.disconnect();

            if (this.engineGain) {
                this.engineGain.disconnect();
            }
        } catch (e) {
            // Ignore cleanup errors
        }

        this.engineLoop = null;
        this.engineGain = null;
        this.engineRunning = false;
    }

    /**
     * Start menu jingle loop - simple vintage melodious arpeggio
     */
    startMenuJingle() {
        if (!this.initialized || this.menuJingleRunning) return;

        // Menu jingle gain
        this.menuJingleGain = this.audioContext.createGain();
        this.menuJingleGain.gain.value = this.musicVolume * 0.3;
        this.menuJingleGain.connect(this.masterGain);

        // Simple C major arpeggio pattern - clean and melodious
        // C4, E4, G4, C5, G4, E4 (up and down)
        const melody = [
            { freq: 262, dur: 0.2 },   // C4
            { freq: 330, dur: 0.2 },   // E4
            { freq: 392, dur: 0.2 },   // G4
            { freq: 523, dur: 0.3 },   // C5 (hold)
            { freq: 392, dur: 0.2 },   // G4
            { freq: 330, dur: 0.2 },   // E4
            { freq: 262, dur: 0.3 },   // C4 (hold)
            { freq: 0, dur: 0.4 },     // Rest
        ];

        const loopLength = melody.reduce((acc, n) => acc + n.dur, 0);
        let startTime = this.audioContext.currentTime;
        let loopId = 0;

        const scheduleLoop = () => {
            if (!this.menuJingleRunning) return;

            const now = this.audioContext.currentTime;

            // Schedule notes ahead
            while (startTime < now + 0.5) {
                let delay = 0;
                melody.forEach(note => {
                    if (note.freq > 0) {
                        const osc = this.audioContext.createOscillator();
                        const gain = this.audioContext.createGain();

                        osc.type = 'triangle'; // Soft, vintage sound

                        const noteStart = startTime + delay;
                        osc.frequency.value = note.freq;

                        // Gentle envelope
                        gain.gain.setValueAtTime(0, noteStart);
                        gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.02);
                        gain.gain.setValueAtTime(0.25, noteStart + note.dur * 0.7);
                        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + note.dur);

                        osc.connect(gain);
                        gain.connect(this.menuJingleGain);

                        osc.start(noteStart);
                        osc.stop(noteStart + note.dur);

                        osc.onended = () => gain.disconnect();
                    }
                    delay += note.dur;
                });

                startTime += loopLength;
            }

            loopId = setTimeout(scheduleLoop, 200);
        };

        this.menuJingleRunning = true;
        this.menuJingle = { loopId };
        scheduleLoop();
    }

    /**
     * Stop menu jingle loop
     */
    stopMenuJingle() {
        if (!this.menuJingle) return;

        if (this.menuJingle.loopId) {
            clearTimeout(this.menuJingle.loopId);
        }

        if (this.menuJingleGain) {
            this.menuJingleGain.disconnect();
        }

        this.menuJingle = null;
        this.menuJingleGain = null;
        this.menuJingleRunning = false;
    }

    // ==================== UTILITY ====================

    /**
     * Stop all sounds
     */
    stopAll() {
        this.stopEngine();
        this.stopMenuJingle();

        this.activeSounds.forEach(sound => {
            try {
                sound.stop();
            } catch (e) {
                // Ignore errors
            }
        });
        this.activeSounds.clear();
    }

    /**
     * Cleanup when game is destroyed
     */
    destroy() {
        this.stopAll();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.initialized = false;
    }
}

// Singleton instance
export const soundEngine = new SoundEngine();
