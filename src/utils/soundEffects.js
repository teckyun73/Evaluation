/**
 * soundEffects.js
 * 시상식 전용 Web Audio API 기반 긴장감 드럼롤, 승리의 팡파레, 환호 박수 및 웅장한 시상식 BGM 엔진
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isBgmPlaying = false;
        this.bgmTimer = null;
        this.bgmNodes = [];
    }

    async init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.isBgmPlaying) {
            this.stopBgm();
        }
        return this.isMuted;
    }

    // 1. 긴장감 넘치는 두구두구 드럼롤 (Drum Roll)
    async playDrumRoll(duration = 1.0) {
        if (this.isMuted) return;
        await this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const rollCount = Math.floor(duration * 24); // 초당 24회 비트 타격
        const interval = duration / rollCount;

        for (let i = 0; i < rollCount; i++) {
            const time = now + (i * interval);
            const volume = 0.15 + (i / rollCount) * 0.45; // 점점 고조되는 음량

            const bufferSize = this.ctx.sampleRate * 0.05;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < bufferSize; j++) {
                data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.25));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 600 + (i * 20);
            filter.Q.value = 1.0;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(volume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(time);
            noise.stop(time + 0.05);
        }
    }

    // 2. 우수상 / 장려상용 승리의 브라스 팡파레 (Fanfare)
    async playRevealFanfare() {
        if (this.isMuted) return;
        await this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [
            { freq: 523.25, time: 0.0, dur: 0.18 }, // C5
            { freq: 659.25, time: 0.18, dur: 0.18 }, // E5
            { freq: 783.99, time: 0.36, dur: 0.25 }, // G5
            { freq: 1046.50, time: 0.61, dur: 0.8 }  // C6 (High C)
        ];

        notes.forEach(({ freq, time, dur }) => {
            const osc = this.ctx.createOscillator();
            const oscHarmonic = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + time);

            oscHarmonic.type = 'triangle';
            oscHarmonic.frequency.setValueAtTime(freq * 0.5, now + time);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 3500;

            gain.gain.setValueAtTime(0.45, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

            osc.connect(filter);
            oscHarmonic.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + time);
            oscHarmonic.start(now + time);
            osc.stop(now + time + dur);
            oscHarmonic.stop(now + time + dur);
        });
    }

    // 3. 최우수상용 웅장한 대형 오케스트라 팡파레 + 환호 박수갈채 (Grand Fanfare & Cheer)
    async playGrandFanfareWithCheer() {
        if (this.isMuted) return;
        await this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 화려하고 웅장한 시상식 팡파레 멜로디 (빰-빰-빰-빠밤~ 빠라바라밤~!)
        const fanfareMelody = [
            { freq: 523.25, time: 0.0, dur: 0.15 },  // C5
            { freq: 523.25, time: 0.15, dur: 0.15 }, // C5
            { freq: 523.25, time: 0.30, dur: 0.15 }, // C5
            { freq: 659.25, time: 0.45, dur: 0.35 }, // E5
            { freq: 523.25, time: 0.80, dur: 0.15 }, // C5
            { freq: 659.25, time: 0.95, dur: 0.15 }, // E5
            { freq: 783.99, time: 1.10, dur: 0.35 }, // G5
            { freq: 1046.50, time: 1.45, dur: 1.5 }  // C6 (대망의 피날레)
        ];

        fanfareMelody.forEach(({ freq, time, dur }) => {
            const oscLead = this.ctx.createOscillator();
            const oscSub = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            oscLead.type = 'sawtooth';
            oscLead.frequency.setValueAtTime(freq, now + time);

            oscSub.type = 'square';
            oscSub.frequency.setValueAtTime(freq / 2, now + time); // 옥타브 아래 풍성한 저음

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 4000;

            gain.gain.setValueAtTime(0.5, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

            oscLead.connect(filter);
            oscSub.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            oscLead.start(now + time);
            oscSub.start(now + time);
            oscLead.stop(now + time + dur);
            oscSub.stop(now + time + dur);
        });

        // 1초 뒤 시작되는 우레와 같은 박수갈채와 환호
        this.playApplause(now + 1.0, 4.0);
    }

    // 4. 박수갈채 및 환호성 효과음 (Applause Generator)
    playApplause(startTime, duration = 4.0) {
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.ctx.sampleRate;
            // 박수 소리 + 사람들의 환호성 느낌 시뮬레이션
            const noise = (Math.random() * 2 - 1);
            const clapImpulse = Math.random() > 0.85 ? 1.5 : 0.3;
            const envelope = Math.sin((i / bufferSize) * Math.PI);
            data[i] = noise * clapImpulse * envelope;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        filter.Q.value = 1.2;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        noiseNode.start(startTime);
        noiseNode.stop(startTime + duration);
    }

    // 5. 웅장한 시상식 배경음악 루프 (Orchestral Theme BGM)
    async toggleBgm() {
        await this.init();
        if (this.isBgmPlaying) {
            this.stopBgm();
            return false;
        } else {
            this.startBgm();
            return true;
        }
    }

    startBgm() {
        if (this.isMuted || !this.ctx) return;
        this.isBgmPlaying = true;

        // 시상식에 어울리는 웅장하고 감동적인 4마디 화음 & 아르페지오 멜로디 테마
        const progression = [
            // 1마디: C Major (C4, E4, G4, C5)
            { bass: 130.81, chord: [261.63, 329.63, 392.00], arpeggio: [523.25, 659.25, 783.99, 1046.50] },
            // 2마디: G Major (G3, D4, G4, B4)
            { bass: 98.00,  chord: [196.00, 293.66, 392.00], arpeggio: [493.88, 587.33, 783.99, 987.77] },
            // 3마디: A Minor (A3, C4, E4, A4)
            { bass: 110.00, chord: [220.00, 261.63, 329.63], arpeggio: [440.00, 523.25, 659.25, 880.00] },
            // 4마디: F Major (F3, C4, F4, A4)
            { bass: 87.31,  chord: [174.61, 261.63, 349.23], arpeggio: [440.00, 523.25, 698.46, 880.00] }
        ];

        let step = 0;
        const playMeasure = () => {
            if (!this.isBgmPlaying || !this.ctx) return;

            const now = this.ctx.currentTime;
            const current = progression[step % progression.length];

            // 1. 웅장한 베이스음 (Bass Note)
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'triangle';
            bassOsc.frequency.setValueAtTime(current.bass, now);
            bassGain.gain.setValueAtTime(0.4, now);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + 3.2);

            bassOsc.connect(bassGain);
            bassGain.connect(this.ctx.destination);
            bassOsc.start(now);
            bassOsc.stop(now + 3.2);

            // 2. 화음 패드 (Warm String/Brass Pad Chords)
            current.chord.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 1800; // 부드럽고 따뜻한 톤

                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(0.18, now + 0.6);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 3.2);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 3.2);
            });

            // 3. 멜로디 아르페지오 (Bright Melodic Bells)
            current.arpeggio.forEach((freq, idx) => {
                const noteTime = now + (idx * 0.75);
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.25, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.7);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(noteTime);
                osc.stop(noteTime + 0.7);
            });

            step++;
            this.bgmTimer = setTimeout(playMeasure, 3000);
        };

        playMeasure();
    }

    stopBgm() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

export const soundEngine = new SoundEngine();
