/**
 * soundEffects.js
 * 시상식 전용 Web Audio API 기반 긴장감 드럼롤, 팡파레 및 축하 환호 효과음 엔진
 * (외부 파일 다운로드 의존 없이 브라우저 자체 오디오 신디사이저로 0.001초 즉시 발음)
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isBgmPlaying = false;
        this.bgmTimer = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
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
    playDrumRoll(duration = 1.2) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const rollCount = Math.floor(duration * 20); // 초당 20번의 스네어 타격
        const interval = duration / rollCount;

        for (let i = 0; i < rollCount; i++) {
            const time = now + (i * interval);
            const volume = 0.05 + (i / rollCount) * 0.25; // 점점 커지는 볼륨
            
            // 노이즈 버퍼를 이용한 스네어 드럼 합성
            const bufferSize = this.ctx.sampleRate * 0.04;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < bufferSize; j++) {
                data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.3));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 800;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(volume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(time);
            noise.stop(time + 0.04);
        }
    }

    // 2. 우수상 / 장려상용 승리의 팡파레 (Fanfare)
    playRevealFanfare() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const notes = [
            { freq: 523.25, time: 0.0, dur: 0.15 }, // C5
            { freq: 659.25, time: 0.15, dur: 0.15 }, // E5
            { freq: 783.99, time: 0.3, dur: 0.2 },  // G5
            { freq: 1046.50, time: 0.5, dur: 0.6 }  // C6 (High C)
        ];

        const now = this.ctx.currentTime;
        notes.forEach(({ freq, time, dur }) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + time);

            gain.gain.setValueAtTime(0.3, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + time);
            osc.stop(now + time + dur);
        });
    }

    // 3. 최우수상용 웅장한 대형 팡파레 + 박수갈채 (Grand Fanfare & Applause)
    playGrandFanfareWithCheer() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 화려한 금관악기 팡파레 코드
        const fanfareNotes = [
            { freq: 523.25, time: 0.0, dur: 0.15 }, // C5
            { freq: 523.25, time: 0.15, dur: 0.15 },
            { freq: 523.25, time: 0.30, dur: 0.15 },
            { freq: 659.25, time: 0.45, dur: 0.3 }, // E5
            { freq: 783.99, time: 0.75, dur: 0.3 }, // G5
            { freq: 1046.50, time: 1.05, dur: 1.2 }  // C6 (대망의 피날레)
        ];

        fanfareNotes.forEach(({ freq, time, dur }) => {
            // 메인 멜로디
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + time);
            
            // 웅장함을 위한 화음(옥타브 아래)
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq / 2, now + time);

            gain.gain.setValueAtTime(0.35, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + time);
            osc2.start(now + time);
            osc.stop(now + time + dur);
            osc2.stop(now + time + dur);
        });

        // 팡파레 후 터지는 화려한 박수갈채 (Applause)
        this.playApplause(now + 0.8, 3.5);
    }

    // 4. 박수갈채 효과음 합성 (Applause Generator)
    playApplause(startTime, duration = 3.0) {
        if (!this.ctx) return;
        
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            // 핑크 노이즈 기반 불규칙 박수 클랩 시뮬레이션
            const noise = (Math.random() * 2 - 1);
            const envelope = Math.sin((i / bufferSize) * Math.PI); // 부드러운 페이드 인/아웃
            data[i] = noise * envelope * (Math.random() > 0.6 ? 1.0 : 0.2);
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 1.5;

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.35, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        noiseNode.start(startTime);
        noiseNode.stop(startTime + duration);
    }

    // 5. 웅장한 시상식 배경음악 루프 (BGM)
    toggleBgm() {
        this.init();
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

        const chords = [
            [261.63, 329.63, 392.00], // C Major (C, E, G)
            [220.00, 261.63, 329.63], // A Minor (A, C, E)
            [174.61, 220.00, 261.63], // F Major (F, A, C)
            [196.00, 246.94, 293.66]  // G Major (G, B, D)
        ];

        let chordIndex = 0;
        const playChord = () => {
            if (!this.isBgmPlaying || !this.ctx) return;

            const now = this.ctx.currentTime;
            const currentChord = chords[chordIndex % chords.length];

            currentChord.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0.001, now);
                gain.gain.linearRampToValueAtTime(0.08, now + 0.8);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 3.0);
            });

            chordIndex++;
            this.bgmTimer = setTimeout(playChord, 2800);
        };

        playChord();
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
