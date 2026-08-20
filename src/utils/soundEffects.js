/**
 * soundEffects.js
 * 시상식 전용 128~320kbps 스튜디오/오케스트라 실황 MP3 고음질 BGM & 리얼 효과음 엔진
 */

// 5가지 실제 오케스트라/시상식 고음질 MP3 음원 소스 (Public Domain / CC0 Open Audio)
const BGM_TRACKS = {
    // 1. 🏛️ 웅장한 오케스트라 (에드워드 엘가 - 위풍당당 행진곡 Pomp and Circumstance)
    symphony: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Edward_Elgar_-_Pomp_and_Circumstance_March_No._1.ogg',
    
    // 2. 🏆 승리의 팡파레 앤섬 (비제 - 카르멘 서곡 투우사의 행진곡 Les Toreadors)
    victory: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Bizet_-_Carmen_Suite_no._1_-_Les_Toreadors.ogg',
    
    // 3. ✨ 감동과 축하의 멜로디 (파헬벨 - 캐논 변주곡 오케스트라 Canon in D Major)
    emotion: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Johann_Pachelbel_-_Canon_in_D_Major_-_Musopen.ogg',
    
    // 4. 🌌 영광과 환희의 앤섬 (베토벤 - 교향곡 9번 환희의 송가 Ode to Joy)
    glory: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Beethoven_Symphony_No_9_mvt_4_Ode_to_Joy.ogg',
    
    // 5. 🥁 긴장감 서스펜스 심포니 (홀스트 - 행성 모음곡 '화성' Mars, The Bringer of War)
    suspense: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Holst_The_Planets_Mars.ogg'
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
        this.initAudioElements();
    }

    initAudioElements() {
        // BGM 전용 오디오
        this.bgmAudio = new Audio();
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.75;
        this.bgmAudio.crossOrigin = 'anonymous';

        // SFX 전용 오디오
        Object.entries(SFX_TRACKS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.crossOrigin = 'anonymous';
            audio.volume = 0.85;
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
                audio.play().catch(() => this.fallbackDrumRoll(duration));
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
                audio.play().catch(() => this.fallbackFanfare());
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
                fanfare.play().catch(() => this.fallbackGrandFanfare());
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
        
        if (!this.bgmAudio) {
            this.initAudioElements();
        }

        this.bgmAudio.src = trackUrl;
        this.bgmAudio.currentTime = 0;
        this.bgmAudio.volume = 0.75;
        this.bgmAudio.muted = false;

        const playPromise = this.bgmAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isBgmPlaying = true;
            }).catch(err => {
                console.warn("MP3 stream autoplay blocked or loading, switching to synthesizer fallback:", err);
                this.isBgmPlaying = true;
                this.startSynthesizerBgm();
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

    // 오프라인 / 네트워크 지연 시 무결점 백업용 신디사이저 엔진 (Web Audio API Fallback)
    startSynthesizerBgm() {
        if (this.isMuted || !this.ctx) return;
        let step = 0;
        const loop = () => {
            if (!this.isBgmPlaying || !this.ctx) return;
            const now = this.ctx.currentTime;
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
            step++;
            this.bgmTimer = setTimeout(loop, 3000);
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
