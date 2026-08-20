/**
 * soundEffects.js
 * 시상식 전용 실제 오케스트라 실황 고음질 MP3 효과음 & BGM 엔진
 */

// 로컬 프로젝트 고음질 실제 MP3 에셋 경로
const SFX_FILES = {
    drumroll: './assets/audio/drumroll.mp3',      // 실제 어쿠스틱 스네어 드럼 롤
    tada: './assets/audio/tada.mp3',              // 실제 브라스 트럼펫 팡파레 (장려/우수상)
    victory: './assets/audio/victory.mp3',        // 실제 웅장한 대형 승리 팡파레 (최우수상)
    applause: './assets/audio/applause.mp3'       // 실제 수백 명의 기립 박수갈채 & 환호성
};

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

        // 실제 MP3 오디오 객체 풀
        this.sfxAudios = {};
        this.initSfxAudioElements();
    }

    initSfxAudioElements() {
        Object.entries(SFX_FILES).forEach(([key, path]) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.volume = 0.9;
            this.sfxAudios[key] = audio;
        });
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
            Object.values(this.sfxAudios).forEach(a => { if (a) a.muted = true; });
        } else {
            if (this.bgmMasterGain && this.ctx) {
                this.bgmMasterGain.gain.setValueAtTime(1, this.ctx.currentTime);
            }
            Object.values(this.sfxAudios).forEach(a => { if (a) a.muted = false; });
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
            this.clearActiveBgmNotes();
            this.playFullScoreTheme(this.currentTheme);
        }
    }

    // =========================================================================
    // 실제 MP3 효과음 (SFX) 재생 함수들
    // =========================================================================

    // 1. 긴장감 드럼롤: 실제 어쿠스틱 스네어 드럼 롤 타악기 MP3
    playDrumRoll() {
        if (this.isMuted) return;
        const audio = this.sfxAudios.drumroll;
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.95;
            audio.muted = false;
            audio.play().catch(e => console.warn("Drumroll play error:", e));
        }
    }

    // 2. 순위 공개 팡파레: 실제 금관악기 트럼펫 팡파레 MP3 (장려상/우수상용)
    playRevealFanfare() {
        if (this.isMuted) return;
        const audio = this.sfxAudios.tada;
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.95;
            audio.muted = false;
            audio.play().catch(e => console.warn("Tada fanfare play error:", e));
        }
    }

    // 3. 최우수상 피날레: 실제 대형 승리 팡파레 MP3 + 수백 명의 우레와 같은 기립 박수갈채 & 환호성 MP3
    playGrandFanfareWithCheer() {
        if (this.isMuted) return;

        const victory = this.sfxAudios.victory;
        const applause = this.sfxAudios.applause;

        if (victory) {
            victory.currentTime = 0;
            victory.volume = 1.0;
            victory.muted = false;
            victory.play().catch(e => console.warn("Victory fanfare error:", e));
        }

        // 팡파레와 함께 울려 퍼지는 실제 수백 명의 기립 박수 & 환호성
        setTimeout(() => {
            if (applause && !this.isMuted) {
                applause.currentTime = 0;
                applause.volume = 0.9;
                applause.muted = false;
                applause.play().catch(e => console.warn("Applause cheer error:", e));
            }
        }, 500);
    }

    // =========================================================================
    // BGM 전곡 풀 스코어 오케스트레이션 재생
    // =========================================================================

    playBrassNote(freq, time, duration, volume = 0.4) {
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

        if (this.bgmMasterGain) {
            gain.connect(this.bgmMasterGain);
        } else {
            gain.connect(this.ctx.destination);
        }

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);

        this.activeBgmNodes.push(osc1, osc2, gain);
    }

    playStringNote(freq, time, duration, volume = 0.25) {
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

        if (this.bgmMasterGain) {
            gain.connect(this.bgmMasterGain);
        } else {
            gain.connect(this.ctx.destination);
        }

        osc.start(time);
        osc.stop(time + duration);

        this.activeBgmNodes.push(osc, gain);
    }

    playMelodyNote(freq, time, duration, volume = 0.35) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);

        if (this.bgmMasterGain) {
            gain.connect(this.bgmMasterGain);
        } else {
            gain.connect(this.ctx.destination);
        }

        osc.start(time);
        osc.stop(time + duration);

        this.activeBgmNodes.push(osc, gain);
    }

    playBassNote(freq, time, duration, volume = 0.45) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);

        if (this.bgmMasterGain) {
            gain.connect(this.bgmMasterGain);
        } else {
            gain.connect(this.ctx.destination);
        }

        osc.start(time);
        osc.stop(time + duration);

        this.activeBgmNodes.push(osc, gain);
    }

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

    playFullScoreTheme(themeKey) {
        if (!this.isBgmPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;

        switch (themeKey) {
            // 1. 위풍당당 행진곡 (엘가)
            case 'symphony': {
                const bpm = 80;
                const beat = 60 / bpm;

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

            // 2. 투우사의 행진 (비제)
            case 'victory': {
                const bpm = 116;
                const beat = 60 / bpm;

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

            // 3. 캐논 변주곡 (파헬벨)
            case 'emotion': {
                const bpm = 72;
                const beat = 60 / bpm;

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

            // 4. 환희의 송가 (베토벤)
            case 'glory': {
                const bpm = 104;
                const beat = 60 / bpm;

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

            // 5. 행성 '화성' 서스펜스 (홀스트)
            case 'suspense': {
                const bpm = 120;
                const beat = 60 / bpm;

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
