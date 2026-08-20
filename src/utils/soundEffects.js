/**
 * soundEffects.js
 * 시상식 전용 실제 오케스트라 실황 고음질 MP3 효과음 (SFX) 엔진
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
    }

    async toggleMute() {
        await this.init();
        this.isMuted = !this.isMuted;

        Object.values(this.sfxAudios).forEach(audio => {
            if (audio) audio.muted = this.isMuted;
        });

        return this.isMuted;
    }

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
}

export const soundEngine = new SoundEngine();
