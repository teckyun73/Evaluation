/**
 * soundEffects.js
 * 시상식 전용 128~320kbps 스튜디오/오케스트라 실황 MP3 고음질 BGM & 리얼 효과음 엔진
 */

// 5가지 실제 오케스트라 실황 고음질 MP3 음원 소스 (Archive.org & Wikimedia Commons Direct MP3)
const BGM_TRACKS = {
    // 1. 🏛️ 위풍당당 행진곡 (에드워드 엘가 - Pomp and Circumstance March No. 1)
    symphony: 'https://ia800301.us.archive.org/15/items/ElgarPompAndCircumstanceMarchNo.1/Elgar-PompAndCircumstanceMarchNo1.mp3',
    
    // 2. 🏆 투우사의 행진 (조르주 비제 - 카르멘 모음곡 Les Toreadors)
    victory: 'https://ia800504.us.archive.org/11/items/BizetCarmenSuiteNo1LesToreadors/Bizet-CarmenSuiteNo1-LesToreadors.mp3',
    
    // 3. ✨ 캐논 변주곡 (요한 파헬벨 - Canon in D Major)
    emotion: 'https://ia800501.us.archive.org/34/items/JohannPachelbelCanonInDMajor/JohannPachelbel-CanonInDMajor.mp3',
    
    // 4. 🌌 환희의 송가 (루트비히 판 베토벤 - 교향곡 제9번 Ode to Joy)
    glory: 'https://ia800301.us.archive.org/27/items/BeethovenSymphonyNo.9InDMinorOp.125odeToJoy/Beethoven-SymphonyNo9InDMinorOp125-odeToJoy.mp3',
    
    // 5. 🥁 행성 '화성' 서스펜스 (구스타프 홀스트 - The Planets, Mars)
    suspense: 'https://ia800203.us.archive.org/24/items/GustavHolstThePlanetsOp.321.MarsTheBringerOfWar/01_Mars_The_Bringer_Of_War.mp3'
};

// 고음질 리얼 효과음 소스
const SFX_TRACKS = {
    drumroll: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Snare_roll.ogg',
    fanfare: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Brass_Fanfare.ogg',
    applause: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Cheering_and_applause.ogg'
};

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isBgmPlaying = false;
        this.wasBgmPlayingBeforeMute = false;
        this.currentTheme = 'symphony';
        
        // HTML5 Audio 객체 풀
        this.bgmAudio = null;
        this.sfxAudios = {};
        this.bgmTimer = null;
        this.initAudioElements();
    }

    initAudioElements() {
        // BGM 전용 오디오
        this.bgmAudio = new Audio();
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.75;
        this.bgmAudio.preload = 'auto';

        // SFX 전용 오디오
        Object.entries(SFX_TRACKS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.volume = 0.85;
            audio.preload = 'auto';
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
    }

    async toggleMute() {
        await this.init();
        this.isMuted = !this.isMuted;

        if (this.isMuted) {
            if (this.isBgmPlaying) {
                this.wasBgmPlayingBeforeMute = true;
                this.pauseBgm();
            }
            if (this.bgmAudio) this.bgmAudio.muted = true;
            Object.values(this.sfxAudios).forEach(a => { if (a) a.muted = true; });
        } else {
            if (this.bgmAudio) this.bgmAudio.muted = false;
            Object.values(this.sfxAudios).forEach(a => { if (a) a.muted = false; });
            
            if (this.wasBgmPlayingBeforeMute) {
                this.wasBgmPlayingBeforeMute = false;
                this.startBgm();
            }
        }

        return { isMuted: this.isMuted, isBgmPlaying: this.isBgmPlaying };
    }

    setTheme(themeKey) {
        console.log(`[SoundEngine] Switching theme to: ${themeKey}`);
        this.currentTheme = themeKey;

        if (this.isBgmPlaying) {
            this.stopBgm();
            this.startBgm();
        }
    }

    // 1. 긴장감 넘치는 실제 타악기 드럼롤 (Drum Roll)
    async playDrumRoll(duration = 1.0) {
        if (this.isMuted) return;
        await this.init();

        try {
            const audio = this.sfxAudios.drumroll;
            if (audio) {
                audio.currentTime = 0;
                audio.volume = 0.85;
                const p = audio.play();
                if (p !== undefined) {
                    p.catch(() => this.fallbackDrumRoll(duration));
                }
            } else {
                this.fallbackDrumRoll(duration);
            }
        } catch (e) {
            this.fallbackDrumRoll(duration);
        }
    }

    // 2. 우수상 / 장려상용 승리의 실제 브라스 팡파레 (Fanfare)
    async playRevealFanfare() {
        if (this.isMuted) return;
        await this.init();

        try {
            const audio = this.sfxAudios.fanfare;
            if (audio) {
                audio.currentTime = 0;
                audio.volume = 0.9;
                const p = audio.play();
                if (p !== undefined) {
                    p.catch(() => this.fallbackFanfare());
                }
            } else {
                this.fallbackFanfare();
            }
        } catch (e) {
            this.fallbackFanfare();
        }
    }

    // 3. 최우수상용 웅장한 대형 팡파레 + 환호 박수갈채 (Grand Fanfare & Cheer)
    async playGrandFanfareWithCheer() {
        if (this.isMuted) return;
        await this.init();

        try {
            const fanfare = this.sfxAudios.fanfare;
            const applause = this.sfxAudios.applause;

            if (fanfare) {
                fanfare.currentTime = 0;
                fanfare.volume = 0.95;
                const p = fanfare.play();
                if (p !== undefined) {
                    p.catch(() => this.fallbackGrandFanfare());
                }
            }

            setTimeout(() => {
                if (applause && !this.isMuted) {
                    applause.currentTime = 0;
                    applause.volume = 0.85;
                    applause.play().catch(() => {});
                }
            }, 800);
        } catch (e) {
            this.fallbackGrandFanfare();
        }
    }

    // 4. 고음질 MP3 BGM 토글
    async toggleBgm() {
        await this.init();
        if (this.isBgmPlaying) {
            this.wasBgmPlayingBeforeMute = false;
            this.stopBgm();
            return false;
        } else {
            this.isMuted = false;
            this.wasBgmPlayingBeforeMute = false;
            if (this.bgmAudio) this.bgmAudio.muted = false;
            this.startBgm();
            return true;
        }
    }

    startBgm() {
        if (this.isMuted) return;
        const trackUrl = BGM_TRACKS[this.currentTheme] || BGM_TRACKS.symphony;
        console.log(`[SoundEngine] Playing BGM: ${this.currentTheme} -> ${trackUrl}`);

        if (!this.bgmAudio) {
            this.initAudioElements();
        }

        // 기존 재생 중인 사운드 및 타이머 정리
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }

        this.bgmAudio.pause();
        this.bgmAudio.src = trackUrl;
        this.bgmAudio.currentTime = 0;
        this.bgmAudio.volume = 0.75;
        this.bgmAudio.muted = false;
        this.bgmAudio.load();

        const playPromise = this.bgmAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isBgmPlaying = true;
            }).catch(err => {
                console.warn("[SoundEngine] MP3 play blocked or network slow, using theme synth fallback:", err);
                this.isBgmPlaying = true;
                this.startThemeSynthesizerBgm(this.currentTheme);
            });
        }
    }

    pauseBgm() {
        this.isBgmPlaying = false;
        if (this.bgmAudio) {
            this.bgmAudio.pause();
        }
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    stopBgm() {
        this.isBgmPlaying = false;
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
        }
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    // 5가지 테마별 완벽 분기된 신디사이저 백업 엔진 (네트워크 오프라인 시에도 각 곡마다 완전히 다른 멜로디 연주)
    startThemeSynthesizerBgm(themeKey) {
        if (this.isMuted || !this.ctx) return;
        let step = 0;

        const loop = () => {
            if (!this.isBgmPlaying || !this.ctx) return;
            const now = this.ctx.currentTime;

            switch (themeKey) {
                // 1. 위풍당당 행진곡 (엘가)
                case 'symphony': {
                    const prog = [
                        { bass: 130.81, chord: [261.63, 329.63, 392.00], melody: [523.25, 587.33, 659.25, 783.99] },
                        { bass: 98.00,  chord: [196.00, 293.66, 392.00], melody: [493.88, 587.33, 659.25, 783.99] }
                    ];
                    const cur = prog[step % prog.length];
                    this.playSynthNote(cur.bass, now, 3.0, 'triangle', 0.45, 400);
                    cur.chord.forEach(f => this.playSynthNote(f, now, 3.0, 'sawtooth', 0.2, 1600));
                    cur.melody.forEach((f, idx) => this.playSynthNote(f, now + (idx * 0.7), 0.65, 'sine', 0.3, 2800));
                    this.bgmTimer = setTimeout(loop, 2800);
                    break;
                }

                // 2. 투우사의 행진 (비제 카르멘)
                case 'victory': {
                    const prog = [
                        { bass: 146.83, notes: [587.33, 587.33, 739.99, 880.00, 1174.66] }, // D Major 팡파레
                        { bass: 110.00, notes: [440.00, 554.37, 659.25, 880.00] }
                    ];
                    const cur = prog[step % prog.length];
                    this.playSynthNote(cur.bass, now, 1.8, 'square', 0.4, 800);
                    cur.notes.forEach((f, idx) => this.playSynthNote(f, now + (idx * 0.35), 0.3, 'sawtooth', 0.35, 3200));
                    this.bgmTimer = setTimeout(loop, 1800);
                    break;
                }

                // 3. 캐논 변주곡 (파헬벨)
                case 'emotion': {
                    const prog = [
                        { bass: 146.83, chord: [293.66, 369.99, 440.00] }, // D
                        { bass: 110.00, chord: [220.00, 277.18, 329.63] }, // A
                        { bass: 123.47, chord: [246.94, 293.66, 369.99] }, // Bm
                        { bass: 92.50,  chord: [185.00, 220.00, 277.18] }  // F#m
                    ];
                    const cur = prog[step % prog.length];
                    this.playSynthNote(cur.bass, now, 2.5, 'sine', 0.5, 450);
                    cur.chord.forEach(f => this.playSynthNote(f, now, 2.5, 'triangle', 0.25, 1400));
                    this.playSynthNote(cur.chord[1] * 2, now + 0.6, 1.8, 'sine', 0.28, 2200);
                    this.bgmTimer = setTimeout(loop, 2400);
                    break;
                }

                // 4. 환희의 송가 (베토벤)
                case 'glory': {
                    const melodyNotes = [
                        [659.25, 659.25, 698.46, 783.99], // E E F G
                        [783.99, 698.46, 659.25, 587.33], // G F E D
                        [523.25, 523.25, 587.33, 659.25], // C C D E
                        [659.25, 587.33, 587.33]          // E D D
                    ];
                    const curMelody = melodyNotes[step % melodyNotes.length];
                    this.playSynthNote(130.81, now, 2.0, 'triangle', 0.4, 500);
                    curMelody.forEach((f, idx) => {
                        this.playSynthNote(f, now + (idx * 0.48), 0.42, 'sawtooth', 0.32, 2600);
                    });
                    this.bgmTimer = setTimeout(loop, 2000);
                    break;
                }

                // 5. 행성 '화성' 서스펜스 (홀스트)
                case 'suspense': {
                    this.playSynthNote(65.41, now, 0.25, 'sawtooth', 0.5, 300); // 쿵
                    this.playSynthNote(65.41, now + 0.35, 0.15, 'sawtooth', 0.4, 300); // 쿵
                    this.playSynthNote(65.41, now + 0.55, 0.15, 'sawtooth', 0.4, 300); // 쿵
                    this.playSynthNote(69.30, now + 0.9, 0.8, 'sawtooth', 0.45, 450);  // 콰앙 (반음 긴장)
                    this.bgmTimer = setTimeout(loop, 1800);
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
        gain.gain.linearRampToValueAtTime(volume, time + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
    }

    fallbackDrumRoll(duration = 1.0) {
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

    fallbackFanfare() {
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
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(0.45, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur);
        });
    }

    fallbackGrandFanfare() {
        this.fallbackFanfare();
    }
}

export const soundEngine = new SoundEngine();
