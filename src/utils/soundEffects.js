/**
 * soundEffects.js
 * 시상식 전용 5가지 다채로운 BGM 테마, 스마트 음소거 복원 및 실감형 효과음 엔진
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isBgmPlaying = false;
        this.wasBgmPlayingBeforeMute = false;
        this.bgmTimer = null;
        this.currentTheme = 'symphony';
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

    async toggleMute() {
        await this.init();
        this.isMuted = !this.isMuted;

        if (this.isMuted) {
            // 음소거 켤 때: 재생 중이던 BGM 상태를 기억하고 일시 중지
            if (this.isBgmPlaying) {
                this.wasBgmPlayingBeforeMute = true;
                this.stopBgm();
            }
        } else {
            // 음소거 풀 때: 이전에 BGM이 켜져 있었다면 자동으로 다시 재생 시작
            if (this.wasBgmPlayingBeforeMute) {
                this.wasBgmPlayingBeforeMute = false;
                this.startBgm();
            }
        }

        return { isMuted: this.isMuted, isBgmPlaying: this.isBgmPlaying };
    }

    setTheme(themeKey) {
        this.currentTheme = themeKey;
        if (this.isBgmPlaying) {
            this.stopBgm();
            this.startBgm();
        }
    }

    // 1. 긴장감 넘치는 두구두구 드럼롤 (Drum Roll)
    async playDrumRoll(duration = 1.0) {
        if (this.isMuted) return;
        await this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const rollCount = Math.floor(duration * 24);
        const interval = duration / rollCount;

        for (let i = 0; i < rollCount; i++) {
            const time = now + (i * interval);
            const volume = 0.15 + (i / rollCount) * 0.45;

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
            { freq: 523.25, time: 0.0, dur: 0.18 },
            { freq: 659.25, time: 0.18, dur: 0.18 },
            { freq: 783.99, time: 0.36, dur: 0.25 },
            { freq: 1046.50, time: 0.61, dur: 0.8 }
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
        const fanfareMelody = [
            { freq: 523.25, time: 0.0, dur: 0.15 },
            { freq: 523.25, time: 0.15, dur: 0.15 },
            { freq: 523.25, time: 0.30, dur: 0.15 },
            { freq: 659.25, time: 0.45, dur: 0.35 },
            { freq: 523.25, time: 0.80, dur: 0.15 },
            { freq: 659.25, time: 0.95, dur: 0.15 },
            { freq: 783.99, time: 1.10, dur: 0.35 },
            { freq: 1046.50, time: 1.45, dur: 1.5 }
        ];

        fanfareMelody.forEach(({ freq, time, dur }) => {
            const oscLead = this.ctx.createOscillator();
            const oscSub = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            oscLead.type = 'sawtooth';
            oscLead.frequency.setValueAtTime(freq, now + time);

            oscSub.type = 'square';
            oscSub.frequency.setValueAtTime(freq / 2, now + time);

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

        this.playApplause(now + 1.0, 4.0);
    }

    // 4. 박수갈채 및 환호성 효과음 (Applause Generator)
    playApplause(startTime, duration = 4.0) {
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
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

    // 5. 시상식 BGM 토글
    async toggleBgm() {
        await this.init();
        if (this.isBgmPlaying) {
            this.wasBgmPlayingBeforeMute = false;
            this.stopBgm();
            return false;
        } else {
            this.isMuted = false; // BGM 재생 시 음소거 자동 해제
            this.wasBgmPlayingBeforeMute = false;
            this.startBgm();
            return true;
        }
    }

    startBgm() {
        if (this.isMuted || !this.ctx) return;
        this.isBgmPlaying = true;

        let step = 0;
        const loop = () => {
            if (!this.isBgmPlaying || !this.ctx) return;
            const now = this.ctx.currentTime;

            switch (this.currentTheme) {
                case 'symphony': {
                    const prog = [
                        { bass: 130.81, chord: [261.63, 329.63, 392.00], arpeggio: [523.25, 659.25, 783.99, 1046.50] },
                        { bass: 98.00,  chord: [196.00, 293.66, 392.00], arpeggio: [493.88, 587.33, 783.99, 987.77] },
                        { bass: 110.00, chord: [220.00, 261.63, 329.63], arpeggio: [440.00, 523.25, 659.25, 880.00] },
                        { bass: 87.31,  chord: [174.61, 261.63, 349.23], arpeggio: [440.00, 523.25, 698.46, 880.00] }
                    ];
                    const cur = prog[step % prog.length];
                    this.playSynthNote(cur.bass, now, 3.2, 'triangle', 0.4, 400);
                    cur.chord.forEach(f => this.playSynthNote(f, now, 3.2, 'sawtooth', 0.18, 1800));
                    cur.arpeggio.forEach((f, idx) => this.playSynthNote(f, now + (idx * 0.75), 0.7, 'sine', 0.25, 3000));
                    this.bgmTimer = setTimeout(loop, 3000);
                    break;
                }

                case 'victory': {
                    const prog = [
                        { bass: 146.83, melody: [587.33, 739.99, 880.00, 1174.66] },
                        { bass: 110.00, melody: [440.00, 554.37, 659.25, 880.00] },
                        { bass: 123.47, melody: [493.88, 587.33, 739.99, 987.77] },
                        { bass: 98.00,  melody: [392.00, 493.88, 587.33, 783.99] }
                    ];
                    const cur = prog[step % prog.length];
                    this.playSynthNote(cur.bass, now, 2.0, 'square', 0.35, 800);
                    cur.melody.forEach((f, idx) => {
                        this.playSynthNote(f, now + (idx * 0.5), 0.45, 'sawtooth', 0.3, 3500);
                    });
                    this.bgmTimer = setTimeout(loop, 2000);
                    break;
                }

                case 'tech': {
                    const baseFreqs = [110.00, 130.81, 146.83, 164.81];
                    const curBase = baseFreqs[step % baseFreqs.length];
                    this.playSynthNote(curBase, now, 2.4, 'sawtooth', 0.3, 600);
                    for (let i = 0; i < 8; i++) {
                        const freq = curBase * (2 + (i % 4) * 0.5);
                        this.playSynthNote(freq, now + (i * 0.3), 0.25, 'triangle', 0.22, 2500);
                    }
                    this.bgmTimer = setTimeout(loop, 2400);
                    break;
                }

                case 'emotion': {
                    const prog = [
                        { bass: 130.81, chord: [261.63, 329.63, 392.00, 493.88] },
                        { bass: 110.00, chord: [220.00, 261.63, 329.63, 392.00] },
                        { bass: 174.61, chord: [174.61, 220.00, 261.63, 329.63] },
                        { bass: 196.00, chord: [196.00, 246.94, 293.66, 349.23] }
                    ];
                    const cur = prog[step % prog.length];
                    this.playSynthNote(cur.bass, now, 3.8, 'sine', 0.45, 500);
                    cur.chord.forEach(f => this.playSynthNote(f, now, 3.8, 'triangle', 0.2, 1200));
                    this.playSynthNote(cur.chord[3] * 2, now + 0.8, 2.5, 'sine', 0.25, 2000);
                    this.bgmTimer = setTimeout(loop, 3600);
                    break;
                }

                case 'suspense': {
                    this.playKick(now);
                    this.playKick(now + 0.3);
                    this.playKick(now + 1.0);
                    this.playKick(now + 1.3);

                    this.playSynthNote(65.41, now, 2.0, 'sawtooth', 0.35, 300);
                    this.playSynthNote(69.30, now + 1.0, 1.0, 'sawtooth', 0.3, 350);

                    this.bgmTimer = setTimeout(loop, 2000);
                    break;
                }
            }

            step++;
        };

        loop();
    }

    playSynthNote(freq, time, duration, type = 'sine', volume = 0.3, filterCutoff = 2000) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterCutoff, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + duration);
    }

    playKick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);

        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.2);
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
