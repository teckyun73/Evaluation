/**
 * soundEffects.js
 * 시상식 전용 5가지 클래식 오케스트라 전곡 풀 스코어(Full Symphony Score) 및 실시간 겹침 방지 엔진
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isBgmPlaying = false;
        this.wasBgmPlayingBeforeMute = false;
        this.currentTheme = 'symphony';
        this.activeBgmNodes = [];
        this.bgmMasterGain = null;
        this.bgmTimer = null;
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
        if (!this.bgmMasterGain && this.ctx) {
            this.initBgmMasterGain();
        }
    }

    initBgmMasterGain() {
        if (!this.ctx) return;
        if (this.bgmMasterGain) {
            try {
                this.bgmMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
                this.bgmMasterGain.disconnect();
            } catch (e) {}
        }
        this.bgmMasterGain = this.ctx.createGain();
        this.bgmMasterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.bgmMasterGain.connect(this.ctx.destination);
    }

    clearActiveBgmNotes() {
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }

        // 기존 예약된 모든 오실레이터 및 게인 즉시 파기 (소리 겹침 100% 방지)
        if (this.activeBgmNodes && this.activeBgmNodes.length > 0) {
            this.activeBgmNodes.forEach(node => {
                try {
                    if (node.stop) node.stop();
                    if (node.disconnect) node.disconnect();
                } catch (e) {}
            });
            this.activeBgmNodes = [];
        }

        this.initBgmMasterGain();
    }

    async toggleMute() {
        await this.init();
        this.isMuted = !this.isMuted;

        if (this.isMuted) {
            if (this.isBgmPlaying) {
                this.wasBgmPlayingBeforeMute = true;
                this.stopBgm();
            }
            if (this.bgmMasterGain && this.ctx) {
                this.bgmMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            }
        } else {
            if (this.bgmMasterGain && this.ctx) {
                this.bgmMasterGain.gain.setValueAtTime(1, this.ctx.currentTime);
            }
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
            // 기존 재생 중인 곡을 즉시 깨끗하게 정지하고 새 곡으로 즉시 시작
            this.clearActiveBgmNotes();
            this.playFullScoreTheme(this.currentTheme);
        }
    }

    // 1. 긴장감 넘치는 실제 타악기 스네어 드럼롤
    async playDrumRoll(duration = 1.0) {
        if (this.isMuted) return;
        await this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const rollCount = Math.floor(duration * 26);
        const interval = duration / rollCount;

        for (let i = 0; i < rollCount; i++) {
            const time = now + (i * interval);
            const volume = 0.15 + (i / rollCount) * 0.55;

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
            filter.frequency.value = 650 + (i * 20);
            filter.Q.value = 1.2;

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

    // 2. 우수상 / 장려상용 승리의 브라스 팡파레
    async playRevealFanfare() {
        if (this.isMuted) return;
        await this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [
            { freq: 523.25, time: 0.0, dur: 0.18 }, // C5
            { freq: 659.25, time: 0.18, dur: 0.18 }, // E5
            { freq: 783.99, time: 0.36, dur: 0.25 }, // G5
            { freq: 1046.50, time: 0.61, dur: 0.8 }  // C6
        ];

        notes.forEach(({ freq, time, dur }) => {
            this.playBrassNote(freq, now + time, dur, 0.45, false);
        });
    }

    // 3. 최우수상용 웅장한 대형 오케스트라 팡파레 + 박수갈채
    async playGrandFanfareWithCheer() {
        if (this.isMuted) return;
        await this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const fanfareNotes = [
            { freq: 523.25, time: 0.0, dur: 0.15 },
            { freq: 523.25, time: 0.15, dur: 0.15 },
            { freq: 523.25, time: 0.30, dur: 0.15 },
            { freq: 659.25, time: 0.45, dur: 0.35 },
            { freq: 523.25, time: 0.80, dur: 0.15 },
            { freq: 659.25, time: 0.95, dur: 0.15 },
            { freq: 783.99, time: 1.10, dur: 0.35 },
            { freq: 1046.50, time: 1.45, dur: 1.6 }
        ];

        fanfareNotes.forEach(({ freq, time, dur }) => {
            this.playBrassNote(freq, now + time, dur, 0.55, false);
            this.playBrassNote(freq * 0.5, now + time, dur, 0.4, false);
        });

        this.playApplause(now + 1.0, 4.5);
    }

    // 박수갈채 생성기
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

    // 금관 브라스 사운드 합성
    playBrassNote(freq, time, duration, volume = 0.4, isBgm = true) {
        if (!this.ctx) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.003, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4500, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);

        const targetDest = (isBgm && this.bgmMasterGain) ? this.bgmMasterGain : this.ctx.destination;
        gain.connect(targetDest);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);

        if (isBgm) {
            this.activeBgmNodes.push(osc1, osc2, gain);
        }
    }

    // 현악 스트링 사운드 합성
    playStringNote(freq, time, duration, volume = 0.25, isBgm = true) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        filter.connect(gain);

        const targetDest = (isBgm && this.bgmMasterGain) ? this.bgmMasterGain : this.ctx.destination;
        gain.connect(targetDest);

        osc.start(time);
        osc.stop(time + duration);

        if (isBgm) {
            this.activeBgmNodes.push(osc, gain);
        }
    }

    // 목관/벨 멜로디 사운드 합성
    playMelodyNote(freq, time, duration, volume = 0.35, isBgm = true) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);

        const targetDest = (isBgm && this.bgmMasterGain) ? this.bgmMasterGain : this.ctx.destination;
        gain.connect(targetDest);

        osc.start(time);
        osc.stop(time + duration);

        if (isBgm) {
            this.activeBgmNodes.push(osc, gain);
        }
    }

    // 오케스트라 묵직한 베이스 사운드
    playBassNote(freq, time, duration, volume = 0.45, isBgm = true) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);

        const targetDest = (isBgm && this.bgmMasterGain) ? this.bgmMasterGain : this.ctx.destination;
        gain.connect(targetDest);

        osc.start(time);
        osc.stop(time + duration);

        if (isBgm) {
            this.activeBgmNodes.push(osc, gain);
        }
    }

    // 4. BGM 토글
    async toggleBgm() {
        await this.init();
        if (this.isBgmPlaying) {
            this.wasBgmPlayingBeforeMute = false;
            this.stopBgm();
            return false;
        } else {
            this.isMuted = false;
            this.wasBgmPlayingBeforeMute = false;
            this.startBgm();
            return true;
        }
    }

    startBgm() {
        if (this.isMuted || !this.ctx) return;
        this.isBgmPlaying = true;
        this.clearActiveBgmNotes();
        this.playFullScoreTheme(this.currentTheme);
    }

    stopBgm() {
        this.isBgmPlaying = false;
        this.clearActiveBgmNotes();
    }

    // =========================================================================
    // 5가지 클래식 오케스트라 원곡 풀 스코어 악보 (Full Score Orchestration)
    // =========================================================================
    playFullScoreTheme(themeKey) {
        if (!this.isBgmPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;

        switch (themeKey) {
            // 1. 🏛️ 에드워드 엘가: 위풍당당 행진곡 제1번
            case 'symphony': {
                const bpm = 80;
                const beat = 60 / bpm; // 0.75s

                const melodyScore = [
                    { f: 392.00, t: 0, d: 2 }, { f: 440.00, t: 2, d: 2 }, { f: 493.88, t: 4, d: 3 }, { f: 523.25, t: 7, d: 1 },
                    { f: 587.33, t: 8, d: 3 }, { f: 493.88, t: 11, d: 1 }, { f: 392.00, t: 12, d: 4 },
                    { f: 523.25, t: 16, d: 3 }, { f: 493.88, t: 19, d: 1 }, { f: 440.00, t: 20, d: 3 }, { f: 369.99, t: 23, d: 1 },
                    { f: 440.00, t: 24, d: 3 }, { f: 392.00, t: 27, d: 1 }, { f: 392.00, t: 28, d: 4 },
                    { f: 587.33, t: 32, d: 2 }, { f: 659.25, t: 34, d: 2 }, { f: 739.99, t: 36, d: 3 }, { f: 783.99, t: 39, d: 1 },
                    { f: 880.00, t: 40, d: 3 }, { f: 739.99, t: 43, d: 1 }, { f: 587.33, t: 44, d: 4 },
                    { f: 783.99, t: 48, d: 3 }, { f: 739.99, t: 51, d: 1 }, { f: 659.25, t: 52, d: 3 }, { f: 587.33, t: 55, d: 1 },
                    { f: 523.25, t: 56, d: 2 }, { f: 493.88, t: 58, d: 2 }, { f: 392.00, t: 60, d: 6 }
                ];

                const chords = [
                    { b: 98.00, c: [196.00, 246.94, 293.66], t: 0, d: 8 },
                    { b: 110.00, c: [220.00, 293.66, 369.99], t: 8, d: 8 },
                    { b: 130.81, c: [261.63, 329.63, 392.00], t: 16, d: 8 },
                    { b: 98.00, c: [196.00, 246.94, 293.66], t: 24, d: 8 },
                    { b: 110.00, c: [220.00, 293.66, 369.99], t: 32, d: 8 },
                    { b: 146.83, c: [220.00, 293.66, 369.99], t: 40, d: 8 },
                    { b: 130.81, c: [261.63, 329.63, 392.00], t: 48, d: 8 },
                    { b: 98.00, c: [196.00, 246.94, 392.00], t: 56, d: 10 }
                ];

                melodyScore.forEach(m => {
                    this.playBrassNote(m.f, now + (m.t * beat * 0.5), m.d * beat * 0.5, 0.45);
                    this.playMelodyNote(m.f * 2, now + (m.t * beat * 0.5), m.d * beat * 0.5, 0.2);
                });

                chords.forEach(ch => {
                    this.playBassNote(ch.b, now + (ch.t * beat * 0.5), ch.d * beat * 0.5, 0.4);
                    ch.c.forEach(f => this.playStringNote(f, now + (ch.t * beat * 0.5), ch.d * beat * 0.5, 0.2));
                });

                const totalDurationMs = (66 * beat * 0.5) * 1000;
                this.bgmTimer = setTimeout(() => this.playFullScoreTheme('symphony'), totalDurationMs);
                break;
            }

            // 2. 🏆 조르주 비제: 카르멘 모음곡 '투우사의 행진'
            case 'victory': {
                const bpm = 116;
                const beat = 60 / bpm; // 0.517s

                const melodyScore = [
                    { f: 440.00, t: 0, d: 2 }, { f: 369.99, t: 2, d: 1 }, { f: 392.00, t: 3, d: 1 }, { f: 440.00, t: 4, d: 2 }, { f: 587.33, t: 6, d: 2 },
                    { f: 554.37, t: 8, d: 1 }, { f: 493.88, t: 9, d: 1 }, { f: 440.00, t: 10, d: 2 }, { f: 369.99, t: 12, d: 4 },
                    { f: 440.00, t: 16, d: 2 }, { f: 369.99, t: 18, d: 1 }, { f: 392.00, t: 19, d: 1 }, { f: 440.00, t: 20, d: 2 }, { f: 739.99, t: 22, d: 2 },
                    { f: 659.25, t: 24, d: 2 }, { f: 587.33, t: 26, d: 2 }, { f: 554.37, t: 28, d: 4 },
                    { f: 587.33, t: 32, d: 3 }, { f: 659.25, t: 35, d: 1 }, { f: 739.99, t: 36, d: 2 }, { f: 880.00, t: 38, d: 2 },
                    { f: 739.99, t: 40, d: 2 }, { f: 659.25, t: 42, d: 2 }, { f: 587.33, t: 44, d: 6 }
                ];

                melodyScore.forEach(m => {
                    this.playBrassNote(m.f, now + (m.t * beat * 0.5), m.d * beat * 0.5, 0.45);
                    this.playMelodyNote(m.f, now + (m.t * beat * 0.5), m.d * beat * 0.5, 0.25);
                });

                for (let i = 0; i < 25; i++) {
                    const t = i * 2 * beat * 0.5;
                    this.playBassNote(i % 2 === 0 ? 146.83 : 110.00, now + t, beat * 0.4, 0.45);
                    this.playStringNote(293.66, now + t + (beat * 0.25), beat * 0.25, 0.22);
                }

                const totalDurationMs = (52 * beat * 0.5) * 1000;
                this.bgmTimer = setTimeout(() => this.playFullScoreTheme('victory'), totalDurationMs);
                break;
            }

            // 3. ✨ 요한 파헬벨: 캐논 변주곡 오케스트라
            case 'emotion': {
                const bpm = 72;
                const beat = 60 / bpm; // 0.833s

                const baseProgression = [
                    { b: 146.83, chord: [293.66, 369.99, 440.00] },
                    { b: 110.00, chord: [220.00, 277.18, 329.63] },
                    { b: 123.47, chord: [246.94, 293.66, 369.99] },
                    { b: 92.50,  chord: [185.00, 220.00, 277.18] },
                    { b: 98.00,  chord: [196.00, 246.94, 293.66] },
                    { b: 146.83, chord: [220.00, 293.66, 369.99] },
                    { b: 98.00,  chord: [196.00, 246.94, 293.66] },
                    { b: 110.00, chord: [220.00, 277.18, 329.63] }
                ];

                const theme1 = [739.99, 659.25, 587.33, 554.37, 493.88, 440.00, 493.88, 554.37];
                const theme2 = [
                    [880, 739.99, 783.99, 880], [739.99, 783.99, 880, 587.33],
                    [659.25, 587.33, 659.25, 739.99], [739.99, 659.25, 587.33, 554.37],
                    [493.88, 440, 493.88, 554.37], [587.33, 659.25, 739.99, 783.99],
                    [739.99, 587.33, 659.25, 739.99], [659.25, 587.33, 659.25, 739.99]
                ];

                baseProgression.forEach((ch, idx) => {
                    const t = idx * beat * 2;
                    this.playBassNote(ch.b, now + t, beat * 2, 0.45);
                    ch.chord.forEach(f => this.playStringNote(f, now + t, beat * 2, 0.2));
                    this.playMelodyNote(theme1[idx], now + t, beat * 1.8, 0.35);
                });

                const offset = 16 * beat;
                baseProgression.forEach((ch, idx) => {
                    const t = offset + (idx * beat * 2);
                    this.playBassNote(ch.b, now + t, beat * 2, 0.5);
                    ch.chord.forEach(f => this.playStringNote(f, now + t, beat * 2, 0.25));
                    
                    const notes = theme2[idx];
                    notes.forEach((f, nIdx) => {
                        this.playMelodyNote(f, now + t + (nIdx * beat * 0.5), beat * 0.45, 0.3);
                    });
                });

                const totalDurationMs = (32 * beat) * 1000;
                this.bgmTimer = setTimeout(() => this.playFullScoreTheme('emotion'), totalDurationMs);
                break;
            }

            // 4. 🌌 루트비히 판 베토벤: 교향곡 제9번 '환희의 송가'
            case 'glory': {
                const bpm = 104;
                const beat = 60 / bpm; // 0.576s

                const fullOdeScore = [
                    659.25, 659.25, 698.46, 783.99, 783.99, 698.46, 659.25, 587.33,
                    523.25, 523.25, 587.33, 659.25, 659.25, 587.33, 587.33, 587.33,
                    659.25, 659.25, 698.46, 783.99, 783.99, 698.46, 659.25, 587.33,
                    523.25, 523.25, 587.33, 659.25, 587.33, 523.25, 523.25, 523.25,
                    587.33, 587.33, 659.25, 523.25, 587.33, 659.25, 698.46, 659.25,
                    523.25, 587.33, 659.25, 698.46, 659.25, 587.33, 523.25, 587.33,
                    659.25, 659.25, 698.46, 783.99, 783.99, 698.46, 659.25, 587.33,
                    523.25, 523.25, 587.33, 659.25, 587.33, 523.25, 523.25, 523.25
                ];

                fullOdeScore.forEach((freq, idx) => {
                    const t = idx * beat;
                    this.playBrassNote(freq, now + t, beat * 0.9, 0.45);
                    this.playMelodyNote(freq, now + t, beat * 0.9, 0.25);

                    if (idx % 4 === 0) {
                        this.playBassNote(130.81, now + t, beat * 3.5, 0.45);
                        this.playStringNote(261.63, now + t, beat * 3.5, 0.22);
                    }
                });

                const totalDurationMs = (64 * beat) * 1000;
                this.bgmTimer = setTimeout(() => this.playFullScoreTheme('glory'), totalDurationMs);
                break;
            }

            // 5. 🥁 구스타프 홀스트: 행성 모음곡 '화성' 서스펜스
            case 'suspense': {
                const bpm = 120;
                const beat = 60 / bpm; // 0.5s

                for (let measure = 0; measure < 8; measure++) {
                    const mTime = measure * 5 * beat;
                    const baseFreq = measure < 4 ? 65.41 : 69.30;

                    this.playBassNote(baseFreq, now + mTime, beat * 0.4, 0.5);
                    this.playBassNote(baseFreq, now + mTime + beat, beat * 0.4, 0.5);
                    this.playBassNote(baseFreq, now + mTime + (beat * 2), beat * 0.4, 0.5);
                    this.playBassNote(baseFreq, now + mTime + (beat * 3), beat * 0.2, 0.6);
                    this.playBassNote(baseFreq, now + mTime + (beat * 3.5), beat * 0.2, 0.6);

                    this.playBrassNote(baseFreq * 2, now + mTime + (beat * 2), beat * 2.8, 0.35 + (measure * 0.04));
                    this.playStringNote(baseFreq * 3, now + mTime + (beat * 2), beat * 2.8, 0.25);
                }

                const totalDurationMs = (40 * beat) * 1000;
                this.bgmTimer = setTimeout(() => this.playFullScoreTheme('suspense'), totalDurationMs);
                break;
            }
        }
    }
}

export const soundEngine = new SoundEngine();
