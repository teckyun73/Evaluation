/**
 * awardCeremony.js
 * 시상식 순차 공개(Award Ceremony Reveal), 축하 컨페티 효과, 실제 MP3 효과음, 전체화면 및 창 간 실시간 원격 제어 동기화 모듈
 */

import { CATEGORY_DISPLAY_NAMES } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateResults } from '../../utils/calculator.js';
import { soundEngine } from '../../utils/soundEffects.js';

let currentRevealedLevel = 0; // 0: 시작전, 1: 장려상, 2: 우수상, 3: 최우수상
let ceremonyConfettiInstance = null;

// 브라우저 탭/창 간 실시간 시상식 원격 동기화 채널
const ceremonySyncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ceremony_sync_channel') : null;

export function broadcastCeremonyAction(action, payload = {}) {
    if (ceremonySyncChannel) {
        try {
            ceremonySyncChannel.postMessage({ action, payload, timestamp: Date.now() });
        } catch (e) {
            console.warn("BroadcastChannel postMessage error:", e);
        }
    }
}

export function triggerConfetti() {
    if (typeof confetti !== 'function') return;

    let targetConfetti = confetti;

    // 브라우저가 전체화면(Fullscreen Top Layer) 상태일 때는 body가 아닌 전체화면 요소 내부에 캔버스를 붙여야 보임
    const fullscreenEl = document.fullscreenElement || document.getElementById('award-ceremony-container') || document.getElementById('ceremony-standalone-root');
    if (fullscreenEl) {
        let canvas = fullscreenEl.querySelector('#ceremony-confetti-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'ceremony-confetti-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '999999';
            fullscreenEl.appendChild(canvas);
            ceremonyConfettiInstance = confetti.create(canvas, { resize: true, useWorker: true });
        }
        if (ceremonyConfettiInstance) {
            targetConfetti = ceremonyConfettiInstance;
        }
    }

    const count = 300;
    const defaults = { origin: { y: 0.6 } };

    function fire(particleRatio, opts) {
        targetConfetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
        });
    }

    fire(0.25, { spread: 35, startVelocity: 65 });
    fire(0.2, { spread: 75 });
    fire(0.35, { spread: 115, decay: 0.91, scalar: 1.2 });
    fire(0.1, { spread: 135, startVelocity: 35, decay: 0.92, scalar: 1.4 });
    fire(0.1, { spread: 145, startVelocity: 60 });
}

function getCeremonyCardsData() {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;
    const results = calculateResults(presenters, criteria, appState.allScores, appState.excellentPresenterSelections);
    const selectedCategory = appState.selectedPresentationCategory || '6s';
    const categoryWinners = (results[selectedCategory] || []).filter(p => p.award && p.award !== '-');

    const topWinner = categoryWinners.find(p => p.award === '최우수');
    const runnerUp = categoryWinners.find(p => p.award === '우수');
    const encouragementWinners = categoryWinners.filter(p => p.award === '장려');

    return { topWinner, runnerUp, encouragementWinners, selectedCategory, presenters };
}

/**
 * 전체화면이 풀리지 않도록 DOM 요소를 파괴하지 않고 내부 카드만 부드럽게 갱신 (In-place Update)
 */
export function updateCeremonyCards() {
    const container = document.getElementById('award-ceremony-container');
    if (!container) return;

    const { topWinner, runnerUp, encouragementWinners } = getCeremonyCardsData();

    // 1. 우수상 카드 (2위)
    const runnerUpCard = container.querySelector('.ceremony-card-runnerup');
    if (runnerUpCard) {
        if (currentRevealedLevel >= 2) {
            runnerUpCard.classList.remove('hidden-award');
            runnerUpCard.classList.add('revealed');
            const content = runnerUpCard.querySelector('.award-content');
            if (content && runnerUp) {
                content.innerHTML = `
                    <h3 class="text-2xl md:text-3xl font-extrabold text-slate-900">${runnerUp.name}</h3>
                    <p class="text-sm md:text-base text-slate-500 mt-2">종합 점수 <strong class="text-sky-600 text-lg md:text-xl">${runnerUp.totalScore.toFixed(2)}점</strong></p>
                    <div class="mt-3 text-xs text-slate-400">평균 ${runnerUp.score.toFixed(2)}점 / 투표 ${runnerUp.voteScore}점</div>
                `;
            }
        } else {
            runnerUpCard.classList.remove('revealed');
            runnerUpCard.classList.add('hidden-award');
            const content = runnerUpCard.querySelector('.award-content');
            if (content) {
                content.innerHTML = `<div class="h-20 md:h-28 flex items-center justify-center text-slate-400 font-bold text-base md:text-lg">❓ 발표 대기 중</div>`;
            }
        }
    }

    // 2. 최우수상 카드 (1위)
    const topWinnerCard = container.querySelector('.ceremony-card-top');
    if (topWinnerCard) {
        if (currentRevealedLevel >= 3) {
            topWinnerCard.classList.remove('hidden-award');
            topWinnerCard.classList.add('revealed', 'scale-105', 'ring-4', 'ring-amber-400');
            const content = topWinnerCard.querySelector('.award-content');
            if (content && topWinner) {
                content.innerHTML = `
                    <h3 class="text-3xl md:text-4xl font-black text-slate-900">${topWinner.name}</h3>
                    <p class="text-base md:text-lg text-slate-600 mt-2">최종 종합 점수 <strong class="text-amber-600 text-2xl md:text-3xl">${topWinner.totalScore.toFixed(2)}점</strong></p>
                    <div class="mt-4 text-xs md:text-sm font-semibold text-slate-600 bg-amber-100/70 py-2 px-4 rounded-xl border border-amber-300 inline-block">
                        심사위원 평균 ${topWinner.score.toFixed(2)}점 + 임직원 투표 ${topWinner.voteScore}점
                    </div>
                `;
            }
        } else {
            topWinnerCard.classList.remove('revealed', 'scale-105', 'ring-4', 'ring-amber-400');
            topWinnerCard.classList.add('hidden-award');
            const content = topWinnerCard.querySelector('.award-content');
            if (content) {
                content.innerHTML = `<div class="h-24 md:h-32 flex items-center justify-center text-amber-800/40 font-extrabold text-lg md:text-2xl">❓ 최종 최우수상 발표 대기</div>`;
            }
        }
    }

    // 3. 장려상 카드 (3위)
    const encouragementCard = container.querySelector('.ceremony-card-encouragement');
    if (encouragementCard) {
        if (currentRevealedLevel >= 1) {
            encouragementCard.classList.remove('hidden-award');
            encouragementCard.classList.add('revealed');
            const content = encouragementCard.querySelector('.award-content');
            if (content && encouragementWinners.length > 0) {
                content.innerHTML = `
                    <div class="space-y-3">
                        ${encouragementWinners.map(ew => `
                            <div>
                                <h3 class="text-xl md:text-2xl font-bold text-slate-900">${ew.name}</h3>
                                <p class="text-xs md:text-sm text-slate-500 mt-0.5">종합 <strong class="text-emerald-600">${ew.totalScore.toFixed(2)}점</strong></p>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } else {
            encouragementCard.classList.remove('revealed');
            encouragementCard.classList.add('hidden-award');
            const content = encouragementCard.querySelector('.award-content');
            if (content) {
                content.innerHTML = `<div class="h-20 md:h-28 flex items-center justify-center text-slate-400 font-bold text-base md:text-lg">❓ 발표 대기 중</div>`;
            }
        }
    }
}

export function renderAwardCeremony(isStandalone = false) {
    const { topWinner, runnerUp, encouragementWinners, selectedCategory, presenters } = getCeremonyCardsData();
    const isMuted = soundEngine.isMuted;
    const categoryName = CATEGORY_DISPLAY_NAMES[selectedCategory] || '6S';

    let controlsHtml = '';
    if (!isStandalone) {
        let categoryOptions = '';
        Object.keys(presenters).forEach(cat => {
            categoryOptions += `<option value="${cat}" ${cat === selectedCategory ? 'selected' : ''}>${CATEGORY_DISPLAY_NAMES[cat]} 부문</option>`;
        });

        controlsHtml = `
            <div id="ceremony-controls-toolbar" class="ceremony-controls-wrapper flex flex-wrap lg:flex-nowrap items-center gap-2 flex-shrink-0">
                <!-- 부문 선택 -->
                <select id="ceremony-category-select" class="h-9 px-3 bg-white border border-slate-300 rounded-lg shadow-sm font-bold text-xs md:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer">
                    ${categoryOptions}
                </select>

                <!-- 사운드 효과음 토글 버튼 -->
                <button id="toggle-ceremony-sound-btn" class="h-9 text-xs md:text-sm font-semibold px-3 ${isMuted ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} rounded-lg transition shadow-sm flex items-center justify-center gap-1 flex-shrink-0 whitespace-nowrap">
                    <span>${isMuted ? '🔇 음소거' : '🔊 효과음 ON'}</span>
                </button>

                <!-- 다시 진행 버튼 -->
                <button id="reset-ceremony-btn" class="h-9 text-xs md:text-sm font-semibold px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition shadow-sm flex items-center justify-center flex-shrink-0 whitespace-nowrap">다시 진행</button>

                <!-- 별도 창 열기 버튼 -->
                <button id="open-ceremony-window-btn" class="h-9 text-xs md:text-sm font-bold px-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 flex-shrink-0 whitespace-nowrap" title="빔프로젝터/보조모니터 전용 별도 창 열기">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    <span>🪟 별도 창 열기</span>
                </button>

                <!-- 다음 순위 공개 버튼 -->
                <button id="next-reveal-btn" class="h-9 text-xs md:text-sm font-black px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg shadow transition flex items-center justify-center gap-1.5 flex-shrink-0 whitespace-nowrap animate-pulse">
                    <span>✨ 다음 순위 공개</span>
                </button>
            </div>
        `;
    }

    let headerHtml = '';

    if (isStandalone) {
        // 별도 창(대형 스크린/빔프로젝터 송출 전용) 웅장한 무대 헤더
        headerHtml = `
            <div class="py-7 md:py-10 px-6 md:px-12 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-sky-500/15 border-2 border-amber-300/80 rounded-3xl text-center shadow-lg mb-6">
                <div class="inline-flex items-center gap-2 mb-2">
                    <span class="text-xs md:text-sm font-extrabold tracking-widest text-amber-700 uppercase bg-amber-100 border border-amber-300 px-4 py-1 rounded-full shadow-xs">
                        🏆 GRAND AWARD CEREMONY
                    </span>
                </div>
                <h1 class="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mt-1">
                    2026 경영혁신 경진대회 시상식 
                    <span class="inline-block text-amber-600 font-black ml-2 md:ml-3 drop-shadow-sm">(${categoryName} 부문)</span>
                </h1>
                <p class="text-base md:text-xl lg:text-2xl text-slate-600 font-semibold mt-3">
                    영예의 수상자를 발표합니다.
                </p>
            </div>
        `;
    } else {
        // 메인 관리자 창 (컴팩트한 1줄 컨트롤 헤더)
        headerHtml = `
            <div class="p-4 md:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-sky-500/10 border border-amber-200/80 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div class="min-w-0 flex-1">
                    <span class="inline-block text-[11px] font-extrabold tracking-wider text-amber-700 uppercase bg-amber-100/90 border border-amber-300/60 px-2.5 py-0.5 rounded-md shadow-xs">AWARD CEREMONY</span>
                    <h2 class="text-xl md:text-2xl font-black text-slate-900 mt-1 whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
                        2026 경영혁신 경진대회 시상식
                    </h2>
                    <p class="text-xs md:text-sm text-slate-500 mt-0.5 whitespace-nowrap">영예의 수상자를 발표합니다.</p>
                </div>
                ${controlsHtml}
            </div>
        `;
    }

    let html = `
        <div id="award-ceremony-container" class="space-y-6 transition-all relative ${isStandalone ? 'standalone-stage' : ''}">
            ${headerHtml}

            <!-- 시상대 연출 컨테이너 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8 pb-6 ceremony-podium-grid">
                
                <!-- 2위: 우수상 (왼쪽) -->
                <div class="order-2 md:order-1 ceremony-card ceremony-card-runnerup ${currentRevealedLevel >= 2 ? 'revealed' : 'hidden-award'} bg-white border-2 border-sky-300 rounded-2xl p-6 md:p-8 shadow-lg text-center transform transition-all duration-700">
                    <div class="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-3xl md:text-4xl font-black shadow-inner">
                        🥈
                    </div>
                    <span class="text-xs md:text-sm font-bold text-sky-600 uppercase tracking-widest bg-sky-50 px-3.5 py-1 rounded-full">우수상</span>
                    <div class="award-content mt-4">
                        ${currentRevealedLevel >= 2 && runnerUp ? `
                            <h3 class="text-2xl md:text-3xl font-extrabold text-slate-900">${runnerUp.name}</h3>
                            <p class="text-sm md:text-base text-slate-500 mt-2">종합 점수 <strong class="text-sky-600 text-lg md:text-xl">${runnerUp.totalScore.toFixed(2)}점</strong></p>
                            <div class="mt-3 text-xs text-slate-400">평균 ${runnerUp.score.toFixed(2)}점 / 투표 ${runnerUp.voteScore}점</div>
                        ` : `
                            <div class="h-20 md:h-28 flex items-center justify-center text-slate-400 font-bold text-base md:text-lg">❓ 발표 대기 중</div>
                        `}
                    </div>
                </div>

                <!-- 1위: 최우수상 (가운데, 가장 높음) -->
                <div class="order-1 md:order-2 ceremony-card ceremony-card-top ${currentRevealedLevel >= 3 ? 'revealed scale-105 ring-4 ring-amber-400' : 'hidden-award'} bg-gradient-to-b from-amber-50 to-white border-2 border-amber-400 rounded-2xl p-8 md:p-10 shadow-2xl text-center transform transition-all duration-700 md:-translate-y-6">
                    <div class="w-20 h-20 md:w-28 md:h-28 mx-auto mb-4 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-4xl md:text-6xl font-black shadow-inner animate-bounce">
                        👑
                    </div>
                    <span class="text-xs md:text-sm font-black text-amber-900 uppercase tracking-widest bg-amber-300 px-4 py-1.5 rounded-full shadow">🏆 영예의 최우수상</span>
                    <div class="award-content mt-5">
                        ${currentRevealedLevel >= 3 && topWinner ? `
                            <h3 class="text-3xl md:text-4xl font-black text-slate-900">${topWinner.name}</h3>
                            <p class="text-base md:text-lg text-slate-600 mt-2">최종 종합 점수 <strong class="text-amber-600 text-2xl md:text-3xl">${topWinner.totalScore.toFixed(2)}점</strong></p>
                            <div class="mt-4 text-xs md:text-sm font-semibold text-slate-600 bg-amber-100/70 py-2 px-4 rounded-xl border border-amber-300 inline-block">
                                심사위원 평균 ${topWinner.score.toFixed(2)}점 + 임직원 투표 ${topWinner.voteScore}점
                            </div>
                        ` : `
                            <div class="h-24 md:h-32 flex items-center justify-center text-amber-800/40 font-extrabold text-lg md:text-2xl">❓ 최종 최우수상 발표 대기</div>
                        `}
                    </div>
                </div>

                <!-- 3위: 장려상 (오른쪽) -->
                <div class="order-3 md:order-3 ceremony-card ceremony-card-encouragement ${currentRevealedLevel >= 1 ? 'revealed' : 'hidden-award'} bg-white border-2 border-emerald-300 rounded-2xl p-6 md:p-8 shadow-lg text-center transform transition-all duration-700">
                    <div class="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl md:text-4xl font-black shadow-inner">
                        🥉
                    </div>
                    <span class="text-xs md:text-sm font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1 rounded-full">장려상</span>
                    <div class="award-content mt-4">
                        ${currentRevealedLevel >= 1 && encouragementWinners.length > 0 ? `
                            <div class="space-y-3">
                                ${encouragementWinners.map(ew => `
                                    <div>
                                        <h3 class="text-xl md:text-2xl font-bold text-slate-900">${ew.name}</h3>
                                        <p class="text-xs md:text-sm text-slate-500 mt-0.5">종합 <strong class="text-emerald-600">${ew.totalScore.toFixed(2)}점</strong></p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="h-20 md:h-28 flex items-center justify-center text-slate-400 font-bold text-base md:text-lg">❓ 발표 대기 중</div>
                        `}
                    </div>
                </div>

            </div>
        </div>
    `;

    return html;
}

export function handleNextReveal(isRemote = false) {
    if (!isRemote) {
        broadcastCeremonyAction('NEXT_REVEAL');
    }

    currentRevealedLevel++;
    if (currentRevealedLevel > 3) {
        currentRevealedLevel = 3;
    }

    if (currentRevealedLevel === 1 || currentRevealedLevel === 2) {
        // 장려상 / 우수상: 실제 어쿠스틱 드럼롤 MP3 -> 카드 오픈 -> 실제 트럼펫 팡파레 MP3
        soundEngine.playDrumRoll();
        setTimeout(() => {
            updateCeremonyCards();
            soundEngine.playRevealFanfare();
        }, 600);
    } else if (currentRevealedLevel === 3) {
        // 최우수상: 실제 어쿠스틱 드럼롤 MP3 -> 카드 오픈 -> 실제 대형 승리 팡파레 MP3 + 수백 명 기립 박수/환호 MP3 + 대형 폭죽
        soundEngine.playGrandFanfareWithCheer();
        setTimeout(() => {
            updateCeremonyCards();
            triggerConfetti();
        }, 600);
    } else {
        updateCeremonyCards();
    }
}

export function handleResetCeremony(isRemote = false) {
    if (!isRemote) {
        broadcastCeremonyAction('RESET');
    }
    currentRevealedLevel = 0;
    updateCeremonyCards();
}
