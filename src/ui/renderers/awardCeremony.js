/**
 * awardCeremony.js
 * 시상식 순차 공개(2026: 특별상 -> 장려상 -> 우수상[복수지원] -> 최우수상 4단계 / 2025: 3단계),
 * 축하 컨페티 폭죽, 실제 MP3 효과음 및 별도 송출 창 실시간 원격 제어 동기화 모듈
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, AWARD_SLOTS_2026 } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateResults } from '../../utils/calculator.js';
import { soundEngine } from '../../utils/soundEffects.js';

let currentRevealedLevel = 0;
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
    const categories = Object.keys(presenters);
    const selectedCategory = categories.includes(appState.selectedPresentationCategory)
        ? appState.selectedPresentationCategory
        : appState.getFirstCategory();

    const results = calculateResults(presenters, criteria, appState.allScores, appState.excellentPresenterSelections);
    const categoryWinners = (results[selectedCategory] || []).filter(p => p.award && p.award !== '-');

    const topWinners = categoryWinners.filter(p => p.awardTier === 'top' || p.award === '최우수');
    const runnerUpWinners = categoryWinners.filter(p => p.awardTier === 'runnerup' || p.award === '우수');
    const encouragementWinners = categoryWinners.filter(p => p.awardTier === 'encouragement' || p.award === '장려');
    const specialWinners = categoryWinners.filter(p => p.awardTier === 'special' || (p.award && p.award.startsWith('특별상')));

    const hasSpecialStage = Boolean(AWARD_SLOTS_2026[selectedCategory] && !appState.isArchiveMode()) || specialWinners.length > 0;
    const maxLevel = hasSpecialStage ? 4 : 3;

    const thresholds = hasSpecialStage
        ? { special: 1, encouragement: 2, runnerUp: 3, top: 4 }
        : { special: 99, encouragement: 1, runnerUp: 2, top: 3 };

    return {
        topWinners,
        runnerUpWinners,
        encouragementWinners,
        specialWinners,
        hasSpecialStage,
        maxLevel,
        thresholds,
        selectedCategory,
        presenters
    };
}

function getNextRevealButtonLabel(level, hasSpecialStage) {
    if (hasSpecialStage) {
        if (level <= 0) return '✨ 1단계: 특별상 공개';
        if (level === 1) return '✨ 2단계: 장려상 공개';
        if (level === 2) return '✨ 3단계: 우수상 공개';
        if (level === 3) return '👑 4단계: 최우수상 공개';
        return '🎉 전체 공개 완료';
    } else {
        if (level <= 0) return '✨ 1단계: 장려상 공개';
        if (level === 1) return '✨ 2단계: 우수상 공개';
        if (level === 2) return '👑 3단계: 최우수상 공개';
        return '🎉 전체 공개 완료';
    }
}

function renderRunnerUpInner(runnerUpWinners, isRevealed) {
    if (!isRevealed) {
        return `<div class="h-20 md:h-28 flex items-center justify-center text-slate-400 font-bold text-base md:text-lg">❓ 발표 대기 중</div>`;
    }
    if (runnerUpWinners.length === 0) {
        return `<div class="h-20 md:h-28 flex items-center justify-center text-slate-400 font-semibold text-sm">집계된 수상 데이터가 없습니다</div>`;
    }
    if (runnerUpWinners.length === 1) {
        const ru = runnerUpWinners[0];
        return `
            <h3 class="text-2xl md:text-3xl font-extrabold text-slate-900">${ru.name}</h3>
            <p class="text-sm md:text-base text-slate-500 mt-2">종합 점수 <strong class="text-sky-600 text-lg md:text-xl">${ru.totalScore.toFixed(2)}점</strong></p>
            <div class="mt-2 text-xs text-slate-400">평균 ${ru.score.toFixed(2)}점 / 투표 ${ru.voteScore}점</div>
            ${ru.awardNote ? `<div class="mt-2.5 inline-block text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">${ru.awardNote}</div>` : ''}
        `;
    }
    return `
        <div class="space-y-3 divide-y divide-slate-100">
            ${runnerUpWinners.map((ru, idx) => `
                <div class="${idx > 0 ? 'pt-3' : ''}">
                    <h3 class="text-xl md:text-2xl font-extrabold text-slate-900">${ru.name}</h3>
                    <p class="text-xs md:text-sm text-slate-500 mt-1">종합 <strong class="text-sky-600 text-base">${ru.totalScore.toFixed(2)}점</strong> <span class="text-slate-400 text-[11px]">(평균 ${ru.score.toFixed(2)} / 투표 ${ru.voteScore})</span></p>
                    ${ru.awardNote ? `<span class="mt-1 inline-block text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">${ru.awardNote}</span>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function renderTopWinnerInner(topWinners, isRevealed) {
    if (!isRevealed) {
        return `<div class="h-24 md:h-32 flex items-center justify-center text-amber-800/40 font-extrabold text-lg md:text-2xl">❓ 최종 최우수상 발표 대기</div>`;
    }
    if (topWinners.length === 0) {
        return `<div class="h-24 md:h-32 flex items-center justify-center text-amber-800/60 font-semibold text-sm">집계된 수상 데이터가 없습니다</div>`;
    }
    const tw = topWinners[0];
    return `
        <h3 class="text-3xl md:text-4xl font-black text-slate-900">${tw.name}</h3>
        <p class="text-base md:text-lg text-slate-600 mt-2">최종 종합 점수 <strong class="text-amber-600 text-2xl md:text-3xl">${tw.totalScore.toFixed(2)}점</strong></p>
        <div class="mt-3 text-xs md:text-sm font-semibold text-slate-600 bg-amber-100/70 py-1.5 px-4 rounded-xl border border-amber-300 inline-block">
            심사위원 평균 ${tw.score.toFixed(2)}점 + 임직원 투표 ${tw.voteScore}점
        </div>
        ${tw.awardNote ? `<div class="mt-2.5"><span class="inline-block text-xs md:text-sm font-extrabold text-amber-900 bg-amber-200/80 border border-amber-400 px-3 py-0.5 rounded-full">🏅 ${tw.awardNote}</span></div>` : ''}
    `;
}

function renderEncouragementInner(encouragementWinners, isRevealed) {
    if (!isRevealed) {
        return `<div class="h-20 md:h-28 flex items-center justify-center text-slate-400 font-bold text-base md:text-lg">❓ 발표 대기 중</div>`;
    }
    if (encouragementWinners.length === 0) {
        return `<div class="h-20 md:h-28 flex items-center justify-center text-slate-400 font-semibold text-sm">집계된 수상 데이터가 없습니다</div>`;
    }
    return `
        <div class="space-y-2.5 divide-y divide-slate-100">
            ${encouragementWinners.map((ew, idx) => `
                <div class="${idx > 0 ? 'pt-2.5' : ''}">
                    <h3 class="text-lg md:text-xl font-bold text-slate-900">${ew.name}</h3>
                    <p class="text-xs md:text-sm text-slate-500 mt-0.5">
                        종합 <strong class="text-emerald-600">${ew.totalScore.toFixed(2)}점</strong>
                        ${ew.awardNote ? `<span class="ml-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">${ew.awardNote}</span>` : ''}
                    </p>
                </div>
            `).join('')}
        </div>
    `;
}

function renderSpecialInner(specialWinners, isRevealed, selectedCategory) {
    if (!isRevealed) {
        return `
            <div class="py-6 flex items-center justify-center text-slate-400 font-bold text-base md:text-lg">
                ❓ 후원 특별상 수상자 발표 대기 중
            </div>
        `;
    }
    if (specialWinners.length === 0) {
        return `
            <div class="py-6 flex items-center justify-center text-slate-400 font-semibold text-sm">
                집계된 특별상 수상 데이터가 없습니다
            </div>
        `;
    }

    const gridCols = specialWinners.length >= 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : specialWinners.length === 3
            ? 'grid-cols-1 sm:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto';

    return `
        <div class="grid ${gridCols} gap-4 mt-2">
            ${specialWinners.map(sw => `
                <div class="bg-gradient-to-b from-purple-50/80 to-white border border-purple-200 rounded-xl p-4 text-center shadow-xs">
                    <span class="inline-block text-[11px] md:text-xs font-extrabold text-purple-800 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full mb-2">
                        ${sw.award}
                    </span>
                    <h4 class="text-lg md:text-xl font-extrabold text-slate-900">${sw.name}</h4>
                    <p class="text-xs text-slate-500 mt-1">종합 <strong class="text-purple-700">${sw.totalScore.toFixed(2)}점</strong></p>
                    ${sw.awardNote ? `<div class="mt-2 text-[11px] md:text-xs font-semibold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">${sw.awardNote}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * 전체화면이 풀리지 않도록 DOM 요소를 파괴하지 않고 내부 카드만 부드럽게 갱신 (In-place Update)
 */
export function updateCeremonyCards() {
    const container = document.getElementById('award-ceremony-container');
    if (!container) return;

    const {
        topWinners,
        runnerUpWinners,
        encouragementWinners,
        specialWinners,
        hasSpecialStage,
        maxLevel,
        thresholds,
        selectedCategory
    } = getCeremonyCardsData();

    // 다음 순위 공개 버튼 문구 동기화
    const nextBtn = container.querySelector('#next-reveal-btn');
    if (nextBtn) {
        nextBtn.innerHTML = `<span>${getNextRevealButtonLabel(currentRevealedLevel, hasSpecialStage)}</span>`;
        if (currentRevealedLevel >= maxLevel) {
            nextBtn.classList.remove('animate-pulse');
        } else {
            nextBtn.classList.add('animate-pulse');
        }
    }

    // 1. 특별상 섹션
    const specialCard = container.querySelector('.ceremony-card-special');
    if (specialCard) {
        const isRev = currentRevealedLevel >= thresholds.special;
        if (isRev) {
            specialCard.classList.remove('hidden-award');
            specialCard.classList.add('revealed');
        } else {
            specialCard.classList.remove('revealed');
            specialCard.classList.add('hidden-award');
        }
        const content = specialCard.querySelector('.award-content');
        if (content) {
            content.innerHTML = renderSpecialInner(specialWinners, isRev, selectedCategory);
        }
    }

    // 2. 장려상 카드
    const encouragementCard = container.querySelector('.ceremony-card-encouragement');
    if (encouragementCard) {
        const isRev = currentRevealedLevel >= thresholds.encouragement;
        if (isRev) {
            encouragementCard.classList.remove('hidden-award');
            encouragementCard.classList.add('revealed');
        } else {
            encouragementCard.classList.remove('revealed');
            encouragementCard.classList.add('hidden-award');
        }
        const content = encouragementCard.querySelector('.award-content');
        if (content) {
            content.innerHTML = renderEncouragementInner(encouragementWinners, isRev);
        }
    }

    // 3. 우수상 카드 (복수 수상 지원)
    const runnerUpCard = container.querySelector('.ceremony-card-runnerup');
    if (runnerUpCard) {
        const isRev = currentRevealedLevel >= thresholds.runnerUp;
        if (isRev) {
            runnerUpCard.classList.remove('hidden-award');
            runnerUpCard.classList.add('revealed');
        } else {
            runnerUpCard.classList.remove('revealed');
            runnerUpCard.classList.add('hidden-award');
        }
        const content = runnerUpCard.querySelector('.award-content');
        if (content) {
            content.innerHTML = renderRunnerUpInner(runnerUpWinners, isRev);
        }
    }

    // 4. 최우수상 카드 (1위)
    const topWinnerCard = container.querySelector('.ceremony-card-top');
    if (topWinnerCard) {
        const isRev = currentRevealedLevel >= thresholds.top;
        if (isRev) {
            topWinnerCard.classList.remove('hidden-award');
            topWinnerCard.classList.add('revealed', 'scale-105', 'ring-4', 'ring-amber-400');
        } else {
            topWinnerCard.classList.remove('revealed', 'scale-105', 'ring-4', 'ring-amber-400');
            topWinnerCard.classList.add('hidden-award');
        }
        const content = topWinnerCard.querySelector('.award-content');
        if (content) {
            content.innerHTML = renderTopWinnerInner(topWinners, isRev);
        }
    }
}

export function renderAwardCeremony(isStandalone = false) {
    const {
        topWinners,
        runnerUpWinners,
        encouragementWinners,
        specialWinners,
        hasSpecialStage,
        maxLevel,
        thresholds,
        selectedCategory,
        presenters
    } = getCeremonyCardsData();

    const isMuted = soundEngine.isMuted;
    const categoryName = CATEGORY_DISPLAY_NAMES[selectedCategory] || selectedCategory;
    const meta = CATEGORY_METADATA[selectedCategory] || {};

    let controlsHtml = '';
    if (!isStandalone) {
        let categoryOptions = '';
        Object.keys(presenters).forEach(cat => {
            const cMeta = CATEGORY_METADATA[cat] || {};
            categoryOptions += `<option value="${cat}" ${cat === selectedCategory ? 'selected' : ''}>${cMeta.icon ? `${cMeta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[cat] || cat} 부문</option>`;
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
                <button id="next-reveal-btn" class="h-9 text-xs md:text-sm font-black px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg shadow transition flex items-center justify-center gap-1.5 flex-shrink-0 whitespace-nowrap ${currentRevealedLevel >= maxLevel ? '' : 'animate-pulse'}">
                    <span>${getNextRevealButtonLabel(currentRevealedLevel, hasSpecialStage)}</span>
                </button>
            </div>
        `;
    }

    let headerHtml = '';
    if (isStandalone) {
        headerHtml = `
            <div class="py-4 md:py-5 px-6 md:px-10 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-sky-500/15 border-2 border-amber-300/80 rounded-2xl text-center shadow-md mb-4">
                <div class="inline-flex items-center gap-1.5 mb-1">
                    <span class="text-[11px] md:text-xs font-extrabold tracking-widest text-amber-700 uppercase bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-full shadow-xs">
                        🏆 GRAND AWARD CEREMONY
                    </span>
                </div>
                <h1 class="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                    ${appState.currentYear} 경영혁신 경진대회 시상식 
                    <span class="inline-block text-amber-600 font-black ml-2 drop-shadow-xs">(${meta.icon ? `${meta.icon} ` : ''}${categoryName} 부문)</span>
                </h1>
                <p class="text-xs md:text-sm lg:text-base text-slate-500 font-medium mt-1">
                    영예의 수상 과제를 발표합니다.
                </p>
            </div>
        `;
    } else {
        headerHtml = `
            <div class="p-4 md:p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-sky-500/10 border border-amber-200/80 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div class="min-w-0 flex-1">
                    <span class="inline-block text-[11px] font-extrabold tracking-wider text-amber-700 uppercase bg-amber-100/90 border border-amber-300/60 px-2.5 py-0.5 rounded-md shadow-xs">AWARD CEREMONY</span>
                    <h2 class="text-xl md:text-2xl font-black text-slate-900 mt-1 whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
                        ${appState.currentYear} 경영혁신 경진대회 시상식 (${categoryName} 부문)
                    </h2>
                    <p class="text-xs md:text-sm text-slate-500 mt-0.5 whitespace-nowrap">
                        ${hasSpecialStage ? '순차 공개: 특별상 ➔ 장려상 ➔ 우수상 ➔ 최우수상' : '순차 공개: 장려상 ➔ 우수상 ➔ 최우수상'}
                    </p>
                </div>
                ${controlsHtml}
            </div>
        `;
    }

    const isRunnerUpRev = currentRevealedLevel >= thresholds.runnerUp;
    const isTopRev = currentRevealedLevel >= thresholds.top;
    const isEncRev = currentRevealedLevel >= thresholds.encouragement;
    const isSpecialRev = currentRevealedLevel >= thresholds.special;

    let specialStageHtml = '';
    if (hasSpecialStage) {
        specialStageHtml = `
            <!-- 후원 특별상 스테이지 -->
            <div class="ceremony-card ceremony-card-special ${isSpecialRev ? 'revealed' : 'hidden-award'} bg-white border-2 border-purple-300 rounded-2xl p-5 md:p-6 shadow-md transition-all duration-700">
                <div class="flex items-center justify-center gap-2 mb-3">
                    <span class="text-xl">🎁</span>
                    <span class="text-xs md:text-sm font-extrabold text-purple-800 uppercase tracking-wider bg-purple-100 border border-purple-300 px-3.5 py-1 rounded-full">
                        후원 특별상 (${selectedCategory === 'support' ? '4개 과제' : `${specialWinners.length || 2}개 과제`})
                    </span>
                </div>
                <div class="award-content">
                    ${renderSpecialInner(specialWinners, isSpecialRev, selectedCategory)}
                </div>
            </div>
        `;
    }

    let html = `
        <div id="award-ceremony-container" class="space-y-6 transition-all relative ${isStandalone ? 'standalone-stage' : ''}">
            ${headerHtml}

            <!-- 본상 시상대 연출 컨테이너 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-6 pb-2 ceremony-podium-grid">
                
                <!-- 우수상 (왼쪽 — 복수 수상 지원) -->
                <div class="order-2 md:order-1 ceremony-card ceremony-card-runnerup ${isRunnerUpRev ? 'revealed' : 'hidden-award'} bg-white border-2 border-sky-300 rounded-2xl p-6 md:p-7 shadow-lg text-center transform transition-all duration-700">
                    <div class="w-14 h-14 md:w-18 md:h-18 mx-auto mb-3 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-3xl font-black shadow-inner">
                        🥈
                    </div>
                    <span class="text-xs md:text-sm font-bold text-sky-700 uppercase tracking-widest bg-sky-50 border border-sky-200 px-3.5 py-1 rounded-full">
                        우수상${selectedCategory === 'support' && !appState.isArchiveMode() ? ' (2팀)' : ''}
                    </span>
                    <div class="award-content mt-4">
                        ${renderRunnerUpInner(runnerUpWinners, isRunnerUpRev)}
                    </div>
                </div>

                <!-- 1위: 최우수상 (가운데, 가장 높음) -->
                <div class="order-1 md:order-2 ceremony-card ceremony-card-top ${isTopRev ? 'revealed scale-105 ring-4 ring-amber-400' : 'hidden-award'} bg-gradient-to-b from-amber-50 to-white border-2 border-amber-400 rounded-2xl p-7 md:p-9 shadow-2xl text-center transform transition-all duration-700 md:-translate-y-4">
                    <div class="w-18 h-18 md:w-24 md:h-24 mx-auto mb-3 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-4xl md:text-5xl font-black shadow-inner animate-bounce">
                        👑
                    </div>
                    <span class="text-xs md:text-sm font-black text-amber-900 uppercase tracking-widest bg-amber-300 px-4 py-1.5 rounded-full shadow">🏆 영예의 최우수상</span>
                    <div class="award-content mt-5">
                        ${renderTopWinnerInner(topWinners, isTopRev)}
                    </div>
                </div>

                <!-- 장려상 (오른쪽 — 복수 수상 지원) -->
                <div class="order-3 md:order-3 ceremony-card ceremony-card-encouragement ${isEncRev ? 'revealed' : 'hidden-award'} bg-white border-2 border-emerald-300 rounded-2xl p-6 md:p-7 shadow-lg text-center transform transition-all duration-700">
                    <div class="w-14 h-14 md:w-18 md:h-18 mx-auto mb-3 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-black shadow-inner">
                        🥉
                    </div>
                    <span class="text-xs md:text-sm font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
                        장려상${!appState.isArchiveMode() ? ` (${selectedCategory === 'support' ? '3팀' : '2팀'})` : ''}
                    </span>
                    <div class="award-content mt-4">
                        ${renderEncouragementInner(encouragementWinners, isEncRev)}
                    </div>
                </div>

            </div>

            ${specialStageHtml}
        </div>
    `;

    return html;
}

export function handleNextReveal(isRemote = false) {
    if (!isRemote) {
        broadcastCeremonyAction('NEXT_REVEAL');
    }

    const { maxLevel, thresholds } = getCeremonyCardsData();

    if (currentRevealedLevel >= maxLevel) {
        updateCeremonyCards();
        return;
    }

    currentRevealedLevel++;

    if (currentRevealedLevel === thresholds.top) {
        // 최우수상: 대형 승리 팡파레 + 기립 박수/환호 + 대형 폭죽
        soundEngine.playGrandFanfareWithCheer();
        setTimeout(() => {
            updateCeremonyCards();
            triggerConfetti();
        }, 600);
    } else {
        // 특별상 / 장려상 / 우수상: 드럼롤 -> 카드 오픈 -> 트럼펫 팡파레
        soundEngine.playDrumRoll();
        setTimeout(() => {
            updateCeremonyCards();
            soundEngine.playRevealFanfare();
        }, 600);
    }
}

export function handleResetCeremony(isRemote = false) {
    if (!isRemote) {
        broadcastCeremonyAction('RESET');
    }
    currentRevealedLevel = 0;
    updateCeremonyCards();
}
