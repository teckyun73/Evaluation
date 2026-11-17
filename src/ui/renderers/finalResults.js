/**
 * finalResults.js
 * 관리자 최종 결과 확인, 카지노 배팅 스타일 훈격/특별상 카드 이동 보드,
 * 세부 수정 표, 최종 훈격 요약 섹션(PNG 저장/별도 창) 및 시상식 실시간 동기화 모듈
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, INTRO_TEXTS, AWARD_SLOTS_2026 } from '../../config/constants.js';
import { appState } from '../../state/appState.js?v=20261117_v5';
import { calculateResults } from '../../utils/calculator.js?v=20261117_v5';
import { renderFinalResultsCharts } from '../chartManager.js';

const awardsBoardChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('awards_board_sync_channel')
    : null;

// 카지노 배팅 보드 UI 상태 (선택된 부문 및 클릭-맞교환용 선택 카드)
let activeCasinoCategory = null;
let selectedCasinoCard = null; // { category, index } | null

export function broadcastAwardsBoardUpdate() {
    if (!awardsBoardChannel || !appState.finalResultsData) return;
    try {
        awardsBoardChannel.postMessage({
            action: 'FINAL_AWARDS_UPDATED',
            payload: {
                year: appState.currentYear,
                eventInfo: appState.eventInfo,
                finalResultsData: appState.finalResultsData
            }
        });
    } catch (e) {
        console.warn('Broadcast awards board update failed:', e);
    }
}

export function initializeFinalResultsData() {
    if (!appState.finalResultsData) {
        const computed = calculateResults(
            appState.presenters,
            appState.evaluationCriteria,
            appState.allScores,
            appState.excellentPresenterSelections
        );
        appState.finalResultsData = JSON.parse(JSON.stringify(computed));
    }
}

function getAwardBadgeStyleClass(award = '-') {
    if (!award || award === '-') {
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
    if (award === '최우수') {
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    if (award === '우수') {
        return 'bg-sky-100 text-sky-800 border-sky-300';
    }
    if (award === '장려') {
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    return 'bg-purple-100 text-purple-800 border-purple-300';
}

/**
 * 카지노 배팅 테이블 존 정의 생성 (2026년 훈격 슬롯 기준 / 2025년 아카이브 호환)
 */
function buildCasinoBettingZones(category, items) {
    const slots = AWARD_SLOTS_2026[category] || null;
    if (!slots) {
        // 2025년 아카이브 조회 전용 존 구성
        const legacyZones = [
            { zoneKey: 'top', tier: 'top', title: '👑 최우수', note: '부문 1위', slotIds: ['legacy_top'], awardName: '최우수', capacity: 1 },
            { zoneKey: 'runnerup', tier: 'runnerup', title: '🥈 우수', note: '부문 2위', slotIds: ['legacy_run'], awardName: '우수', capacity: 1 },
            { zoneKey: 'encouragement', tier: 'encouragement', title: '🥉 장려', note: category === 'ai' ? '2팀' : '1팀', slotIds: ['legacy_enc'], awardName: '장려', capacity: category === 'ai' ? 2 : 1 },
            { zoneKey: 'unassigned', tier: 'unassigned', title: '🃏 미수상 대기 덱', note: '-', slotIds: [], awardName: '-', capacity: items.length }
        ];
        return legacyZones;
    }

    const zones = [];
    const mainTierConfigs = [
        { tier: 'top', zoneKey: 'main_top', icon: '👑', title: '최우수' },
        { tier: 'runnerup', zoneKey: 'main_runnerup', icon: '🥈', title: '우수' },
        { tier: 'encouragement', zoneKey: 'main_encouragement', icon: '🥉', title: '장려' }
    ];

    mainTierConfigs.forEach(cfg => {
        const matched = slots.filter(s => s.tier === cfg.tier);
        if (matched.length > 0) {
            const singleNote = matched[0].note || '';
            const noteText = matched.length > 1 ? `${singleNote} × ${matched.length}팀` : singleNote;
            zones.push({
                zoneKey: cfg.zoneKey,
                group: 'main',
                tier: cfg.tier,
                title: `${cfg.icon} ${cfg.title}`,
                note: noteText,
                slotIds: matched.map(s => s.awardId),
                slots: matched,
                awardName: cfg.title,
                capacity: matched.length
            });
        }
    });

    const specialSlots = slots.filter(s => s.tier === 'special');
    specialSlots.forEach(slot => {
        zones.push({
            zoneKey: `slot_${slot.awardId}`,
            group: 'special',
            tier: 'special',
            title: `🎁 ${slot.selectLabel || slot.award}`,
            shortTitle: `🎁 ${slot.award}`,
            note: slot.note || '',
            slotIds: [slot.awardId],
            slots: [slot],
            awardName: slot.award,
            capacity: 1
        });
    });

    zones.push({
        zoneKey: 'unassigned',
        group: 'holding',
        tier: 'unassigned',
        title: '🃏 수상 제외 / 교체 대기 덱',
        note: '임시 대기 또는 수상 제외',
        slotIds: [],
        slots: [],
        awardName: '-',
        capacity: Math.max(items.length, 1)
    });

    return zones;
}

/**
 * 현재 부문 발표자 카드를 각 배팅 테이블 존에 매핑
 */
function assignItemsToZones(zones, items) {
    const map = new Map();
    zones.forEach(z => map.set(z.zoneKey, []));

    const unassignedZone = zones.find(z => z.zoneKey === 'unassigned');

    items.forEach((p, itemIndex) => {
        let matchedZone = null;

        if (p.awardId && p.awardId !== '-') {
            matchedZone = zones.find(z => z.slotIds.includes(p.awardId));
        }
        if (!matchedZone && p.award && p.award !== '-') {
            matchedZone = zones.find(z =>
                z.zoneKey !== 'unassigned' &&
                z.awardName === p.award &&
                (!p.awardNote || !z.note || z.note.includes(p.awardNote) || map.get(z.zoneKey).length < z.capacity)
            ) || zones.find(z => z.zoneKey !== 'unassigned' && z.awardName === p.award);
        }

        if (matchedZone) {
            map.get(matchedZone.zoneKey).push({ item: p, itemIndex });
        } else if (unassignedZone) {
            map.get('unassigned').push({ item: p, itemIndex });
        }
    });

    return map;
}

function getZoneClass(tier) {
    switch (tier) {
        case 'top': return 'zone-top';
        case 'runnerup': return 'zone-runnerup';
        case 'encouragement': return 'zone-encouragement';
        case 'special': return 'zone-special';
        default: return 'zone-unassigned';
    }
}

function getZoneHeaderBadgeClass(tier) {
    switch (tier) {
        case 'top': return 'bg-amber-400 text-slate-950 border-amber-200';
        case 'runnerup': return 'bg-sky-400 text-slate-950 border-sky-200';
        case 'encouragement': return 'bg-emerald-400 text-slate-950 border-emerald-200';
        case 'special': return 'bg-purple-300 text-purple-950 border-purple-100';
        default: return 'bg-slate-600 text-slate-100 border-slate-500';
    }
}

/**
 * 개별 발표자 카지노 카드 HTML 생성 (발표자 '[회사명] 홍길동 사원', '종합점수', '초기 훈격수준' 필수 포함)
 */
function renderPresenterCasinoCardHTML(category, item, itemIndex, isArchive) {
    const suitSymbols = ['♠', '♥', '♦', '♣'];
    const suit = suitSymbols[itemIndex % suitSymbols.length];
    const isRedSuit = suit === '♥' || suit === '♦';

    const initialRank = item.initialRank || (itemIndex + 1);
    const initialAward = item.initialAward || '-';
    const initialLevelText = initialAward !== '-'
        ? `초기: ${initialRank}위 · ${initialAward}`
        : `초기: ${initialRank}위 · 미배정`;

    const isModified = item.initialAward !== undefined && (item.award || '-') !== (item.initialAward || '-');
    const isSelected = selectedCasinoCard &&
        selectedCasinoCard.category === category &&
        selectedCasinoCard.index === itemIndex;

    const totalScoreText = (Number(item.totalScore) || 0).toFixed(2);
    const fullName = item.name || '-';

    return `
        <div class="casino-presenter-card rounded-xl p-3 relative flex flex-col justify-between gap-2 min-w-[195px] flex-1 max-w-[260px] ${isSelected ? 'card-selected' : ''}"
             ${isArchive ? '' : 'draggable="true"'}
             data-category="${category}"
             data-index="${itemIndex}"
             data-presenter-id="${item.id}">
            <!-- 상단 코너: 카드 번호/문양 & 드래그 핸들 -->
            <div class="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black ${isRedSuit ? 'text-rose-600' : 'text-slate-800'}">${suit} #${initialRank}</span>
                    ${isModified ? `<span class="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">이동됨</span>` : ''}
                </div>
                ${!isArchive ? `<span class="text-slate-400 text-xs font-bold tracking-tighter" title="카드를 드래그하거나 클릭하여 이동">⋮⋮ 이동</span>` : ''}
            </div>

            <!-- 발표자명: [회사명] 홍길동 사원 -->
            <div class="font-extrabold text-slate-900 text-sm leading-snug break-keep" title="${fullName}">
                ${fullName}
            </div>

            <!-- 종합점수 & 초기 훈격수준 -->
            <div class="flex flex-col gap-1 pt-1 border-t border-slate-100">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-semibold text-slate-500">종합점수</span>
                    <span class="text-sm font-black text-blue-600 tabular-nums">${totalScoreText}점</span>
                </div>
                <div class="flex items-center justify-between gap-1 bg-slate-100/90 rounded-md px-2 py-1 border border-slate-200/80">
                    <span class="text-[10px] font-bold text-slate-500 whitespace-nowrap">초기 훈격수준</span>
                    <span class="text-[11px] font-extrabold text-slate-700 truncate" title="${initialLevelText}">${initialLevelText}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 카지노 배팅 테이블 존 1개 HTML 생성
 */
function renderCasinoBetZoneHTML(category, zone, assignedEntries, isArchive) {
    const currentCount = assignedEntries.length;
    const zoneClass = getZoneClass(zone.tier);
    const badgeClass = getZoneHeaderBadgeClass(zone.tier);
    const displayTitle = zone.shortTitle || zone.title;
    const emptySlotsCount = Math.max(0, zone.capacity - currentCount);

    let cardsHTML = assignedEntries
        .map(({ item, itemIndex }) => renderPresenterCasinoCardHTML(category, item, itemIndex, isArchive))
        .join('');

    if (emptySlotsCount > 0 && zone.zoneKey !== 'unassigned') {
        for (let i = 0; i < emptySlotsCount; i++) {
            const slotMeta = zone.slots && zone.slots[currentCount + i];
            const spotHint = slotMeta?.note ? `${slotMeta.note} 자리` : '이곳에 카드 놓기';
            cardsHTML += `
                <div class="border-2 border-dashed border-amber-200/35 rounded-xl px-3 py-5 min-w-[180px] flex-1 max-w-[240px] flex flex-col items-center justify-center text-center text-emerald-100/65 text-xs font-semibold pointer-events-none">
                    <span class="text-base mb-0.5 opacity-75">🂠</span>
                    <span>${spotHint}</span>
                </div>
            `;
        }
    } else if (currentCount === 0 && zone.zoneKey === 'unassigned') {
        cardsHTML = `
            <div class="w-full py-3 text-center text-xs text-slate-300/75 font-medium pointer-events-none">
                수상에서 제외하거나 임시 대기시킬 발표자 카드를 이 테이블로 옮길 수 있습니다. (현재 전원 배정됨 ✓)
            </div>
        `;
    }

    return `
        <div class="casino-bet-zone ${zoneClass} rounded-2xl p-3.5 flex flex-col gap-3"
             data-zone-key="${zone.zoneKey}"
             data-category="${category}">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="text-xs font-extrabold px-2.5 py-1 rounded-full border shadow-xs truncate ${badgeClass}">
                        ${displayTitle}
                    </span>
                    ${zone.note ? `<span class="text-[11px] font-medium text-emerald-100/85 truncate">${zone.note}</span>` : ''}
                </div>
                <span class="text-[11px] font-extrabold px-2 py-0.5 rounded bg-black/30 text-amber-200 border border-amber-300/30 whitespace-nowrap">
                    ${zone.zoneKey === 'unassigned' ? `${currentCount}명 대기` : `${currentCount} / ${zone.capacity}명`}
                </span>
            </div>

            <div class="flex flex-wrap gap-2.5 items-stretch">
                ${cardsHTML}
            </div>
        </div>
    `;
}

/**
 * 카지노 배팅 테이블 전체 섹션 HTML 생성
 */
export function renderCasinoBettingBoardHTML(finalData, isArchive) {
    if (!finalData) return '';
    const categories = Object.keys(finalData);
    if (categories.length === 0) return '';

    if (!activeCasinoCategory || !categories.includes(activeCasinoCategory)) {
        activeCasinoCategory = categories[0];
    }

    const items = finalData[activeCasinoCategory] || [];
    const zones = buildCasinoBettingZones(activeCasinoCategory, items);
    const assignedMap = assignItemsToZones(zones, items);

    const mainZones = zones.filter(z => z.group === 'main' || (!z.group && z.zoneKey !== 'unassigned'));
    const specialZones = zones.filter(z => z.group === 'special');
    const unassignedZone = zones.find(z => z.zoneKey === 'unassigned');

    const selectedItem = selectedCasinoCard &&
        selectedCasinoCard.category === activeCasinoCategory &&
        items[selectedCasinoCard.index]
        ? items[selectedCasinoCard.index]
        : null;

    const categoryTabsHTML = categories.map(cat => {
        const meta = CATEGORY_METADATA[cat] || {};
        const isActive = cat === activeCasinoCategory;
        const count = (finalData[cat] || []).length;
        return `
            <button type="button"
                    class="casino-category-tab-btn text-xs font-extrabold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 whitespace-nowrap ${isActive ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-md' : 'bg-black/30 text-emerald-100 border-emerald-400/30 hover:bg-black/45'}"
                    data-category="${cat}">
                <span>${meta.icon ? meta.icon : ''} ${CATEGORY_DISPLAY_NAMES[cat] || cat} 부문</span>
                <span class="text-[11px] px-1.5 py-0.5 rounded-full leading-none ${isActive ? 'bg-slate-900/15 text-slate-950' : 'bg-white/10 text-emerald-100'}">${count}건</span>
            </button>
        `;
    }).join('');

    return `
        <section id="casino-betting-section" class="mb-8">
            <div class="casino-felt-board rounded-3xl p-4 md:p-6 text-white">
                <!-- 테이블 상단 레일 헤더 -->
                <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 mb-5 border-b border-amber-300/25">
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                            <span class="text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/40">
                                ♠ ♥ AWARD TABLE ♦ ♣
                            </span>
                            ${isArchive ? `<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-200 border border-slate-500">조회 전용</span>` : `<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">드래그 & 드롭 또는 카드 클릭 맞교환</span>`}
                        </div>
                        <h2 class="text-xl md:text-2xl font-black text-white tracking-tight">
                            훈격 · 특별상 직관 배치 보드
                        </h2>
                        <p class="text-xs md:text-sm text-emerald-100/85 mt-0.5">
                            발표자 카드를 원하는 <strong>훈격 / 특별상 테이블</strong>로 드래그해 놓거나 다른 카드 위에 올려 1:1 맞교환하세요. 아래 수정 표와 요약 보드에 실시간 반영됩니다.
                        </p>
                    </div>

                    <div class="flex flex-wrap sm:flex-nowrap items-center gap-1.5 flex-shrink-0">
                        ${categoryTabsHTML}
                        ${!isArchive ? `
                        <button type="button" id="casino-save-awards-btn" class="text-xs font-extrabold px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg border border-purple-300/40 shadow-md transition whitespace-nowrap flex items-center gap-1">
                            <span>💾</span>
                            <span>현재 배치 확정 저장</span>
                        </button>
                        ` : ''}
                    </div>
                </div>

                ${selectedItem && !isArchive ? `
                <div class="mb-4 px-4 py-2.5 rounded-xl bg-amber-400/20 border border-amber-300 text-amber-100 text-xs md:text-sm font-bold flex flex-wrap items-center justify-between gap-2">
                    <span>🃏 선택된 카드: <strong class="text-white">${selectedItem.name}</strong> (${(Number(selectedItem.totalScore) || 0).toFixed(2)}점) — 이동할 훈격 테이블 또는 맞교환할 발표자 카드를 클릭하세요.</span>
                    <button type="button" id="casino-cancel-select-btn" class="text-xs px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-amber-200 border border-amber-300/40">선택 해제</button>
                </div>
                ` : ''}

                <!-- 본상 훈격 테이블 영역 -->
                <div class="mb-5">
                    <div class="text-xs font-extrabold tracking-wider uppercase text-amber-300/90 mb-2.5 flex items-center gap-2">
                        <span>🏆 본상 훈격 테이블</span>
                        <span class="h-px flex-1 bg-amber-300/20"></span>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
                        ${mainZones.map(z => renderCasinoBetZoneHTML(activeCasinoCategory, z, assignedMap.get(z.zoneKey) || [], isArchive)).join('')}
                    </div>
                </div>

                <!-- 후원 특별상 테이블 영역 -->
                ${specialZones.length > 0 ? `
                <div class="mb-5">
                    <div class="text-xs font-extrabold tracking-wider uppercase text-purple-200/90 mb-2.5 flex items-center gap-2">
                        <span>🎁 후원 특별상 테이블</span>
                        <span class="h-px flex-1 bg-purple-300/20"></span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 ${specialZones.length >= 4 ? 'xl:grid-cols-4' : ''} gap-3.5 items-stretch">
                        ${specialZones.map(z => renderCasinoBetZoneHTML(activeCasinoCategory, z, assignedMap.get(z.zoneKey) || [], isArchive)).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- 미배정 / 대기 덱 영역 -->
                ${unassignedZone ? `
                <div>
                    ${renderCasinoBetZoneHTML(activeCasinoCategory, unassignedZone, assignedMap.get('unassigned') || [], isArchive)}
                </div>
                ` : ''}
            </div>
        </section>
    `;
}

/**
 * 두 발표자의 현재 훈격(award, awardId, awardTier, awardNote)을 1:1 맞교환
 */
export function swapCasinoCards(category, indexA, indexB) {
    if (!appState.finalResultsData?.[category]) return false;
    const list = appState.finalResultsData[category];
    const a = list[indexA];
    const b = list[indexB];
    if (!a || !b || indexA === indexB) return false;

    const prevA = {
        award: a.award || '-',
        awardId: a.awardId || '-',
        awardTier: a.awardTier || '',
        awardNote: a.awardNote || ''
    };
    const prevB = {
        award: b.award || '-',
        awardId: b.awardId || '-',
        awardTier: b.awardTier || '',
        awardNote: b.awardNote || ''
    };

    Object.assign(a, prevB);
    Object.assign(b, prevA);
    selectedCasinoCard = null;
    syncAllFinalResultViews(category);
    return true;
}

/**
 * 발표자 카드를 특정 '훈격 / 특별상' 배팅 테이블 존으로 이동 (빈 슬롯 우선, 만석 시 기존 카드와 자동 맞교환)
 */
export function moveCasinoCardToZone(category, fromIndex, targetZoneKey) {
    if (!appState.finalResultsData?.[category]) return false;
    const items = appState.finalResultsData[category];
    const item = items[fromIndex];
    if (!item) return false;

    const zones = buildCasinoBettingZones(category, items);
    const targetZone = zones.find(z => z.zoneKey === targetZoneKey);
    if (!targetZone) return false;

    if (targetZoneKey === 'unassigned') {
        item.award = '-';
        item.awardId = '-';
        item.awardTier = '';
        item.awardNote = '';
        selectedCasinoCard = null;
        syncAllFinalResultViews(category);
        return true;
    }

    // 이미 같은 테이블에 배치된 카드면 무시
    if (item.awardId && targetZone.slotIds.includes(item.awardId)) {
        selectedCasinoCard = null;
        updateCasinoBettingBoard();
        return false;
    }

    // 빈 슬롯 탐색
    const usedSlotIds = new Set(items.map(p => p.awardId).filter(Boolean));
    const emptySlotId = targetZone.slotIds.find(sid => !usedSlotIds.has(sid));

    if (emptySlotId) {
        const matchedSlot = (AWARD_SLOTS_2026[category] || []).find(s => s.awardId === emptySlotId);
        if (matchedSlot) {
            item.award = matchedSlot.award;
            item.awardId = matchedSlot.awardId;
            item.awardTier = matchedSlot.tier;
            item.awardNote = matchedSlot.note || '';
            selectedCasinoCard = null;
            syncAllFinalResultViews(category);
            return true;
        }
    }

    // 테이블이 정원 만석인 경우 해당 테이블의 마지막 카드와 1:1 맞교환
    const assignedMap = assignItemsToZones(zones, items);
    const occupants = assignedMap.get(targetZoneKey) || [];
    if (occupants.length > 0) {
        const targetOccupant = occupants[occupants.length - 1];
        if (targetOccupant && targetOccupant.itemIndex !== fromIndex) {
            return swapCasinoCards(category, fromIndex, targetOccupant.itemIndex);
        }
    }

    return false;
}

export function setActiveCasinoCategory(category) {
    activeCasinoCategory = category;
    selectedCasinoCard = null;
    updateCasinoBettingBoard();
}

export function selectCasinoCardForMove(category, index) {
    if (appState.isArchiveMode()) return;
    if (selectedCasinoCard && selectedCasinoCard.category === category && selectedCasinoCard.index === index) {
        selectedCasinoCard = null;
        updateCasinoBettingBoard();
        return;
    }
    if (selectedCasinoCard && selectedCasinoCard.category === category) {
        swapCasinoCards(category, selectedCasinoCard.index, index);
        return;
    }
    selectedCasinoCard = { category, index };
    updateCasinoBettingBoard();
}

export function clearCasinoCardSelection() {
    selectedCasinoCard = null;
    updateCasinoBettingBoard();
}

export function getSelectedCasinoCard() {
    return selectedCasinoCard;
}

/**
 * 카지노 배팅 보드 DOM만 부분 갱신
 */
export function updateCasinoBettingBoard() {
    if (typeof document === 'undefined') return;
    const slot = document.getElementById('casino-betting-board-slot');
    if (slot && appState.finalResultsData) {
        slot.innerHTML = renderCasinoBettingBoardHTML(appState.finalResultsData, appState.isArchiveMode());
    }
}

/**
 * 카지노 보드 이동 결과를 상단 수정 표 드롭다운 + 하단 요약 보드 + 별도 창에 즉시 동기화
 */
function syncAllFinalResultViews(category) {
    const items = appState.finalResultsData?.[category] || [];

    // 상단 수정 가능 표 행의 드롭다운 및 비고 텍스트 즉시 동기화
    if (typeof document !== 'undefined') {
        items.forEach((p, idx) => {
            const row = document.querySelector(`tr[data-category="${category}"][data-index="${idx}"]`);
            if (!row) return;
            const selectEl = row.querySelector('.final-award-select');
            if (selectEl) {
                const targetVal = p.awardId || (p.award === '-' ? '-' : '');
                if (targetVal) selectEl.value = targetVal;
            }
            const awardTextEl = row.querySelector('.final-award-cell');
            if (awardTextEl) {
                awardTextEl.textContent = p.award || '-';
            }
            const noteEl = row.querySelector('.final-award-note');
            if (noteEl) {
                noteEl.textContent = p.awardNote || '';
            }
        });
    }

    updateCasinoBettingBoard();
    updateFinalAwardsSummaryBoard();
}

/**
 * '훈격 / 특별상' | '발표자' | '종합점수' 순서의 정리된 부문별 훈격 요약 카드 HTML 생성
 * (최종 결과 내 별도 요약 섹션 및 별도 창 awards-board.html 공용 렌더러)
 */
export function renderFinalAwardsBoardCardsHTML(finalData, options = {}) {
    if (!finalData) return '';
    const showCategoryPngBtn = options.showCategoryPngBtn !== false;
    const isStandalone = Boolean(options.isStandalone);

    const categories = Object.keys(finalData);
    const gridClass = categories.length === 1
        ? 'grid grid-cols-1 gap-6'
        : 'grid grid-cols-1 lg:grid-cols-2 gap-6';

    let html = `<div class="${gridClass}">`;

    categories.forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const displayName = CATEGORY_DISPLAY_NAMES[category] || category;
        const items = finalData[category] || [];
        const headerBg = category === 'technology'
            ? 'bg-indigo-50/80 border-indigo-100'
            : 'bg-sky-50/80 border-sky-100';

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div class="px-5 py-3.5 ${headerBg} border-b flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-extrabold text-slate-900">
                            ${meta.icon ? `${meta.icon} ` : ''}${displayName} 부문
                        </span>
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                            총 ${items.length}건
                        </span>
                    </div>
                    ${showCategoryPngBtn ? `
                    <button type="button" class="download-category-awards-png-btn text-xs font-semibold px-2.5 py-1.5 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-300 rounded-lg transition shadow-2xs flex items-center gap-1 whitespace-nowrap" data-category="${category}">
                        <span>📷</span>
                        <span>${displayName} PNG 저장</span>
                    </button>
                    ` : ''}
                </div>

                <div class="overflow-x-auto flex-1">
                    <table class="w-full text-left border-collapse ${isStandalone ? 'text-base' : 'text-sm'}">
                        <thead class="text-xs font-bold text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="px-4 py-3 whitespace-nowrap">훈격 / 특별상</th>
                                <th class="px-4 py-3 whitespace-nowrap">발표자</th>
                                <th class="px-4 py-3 text-right whitespace-nowrap">종합점수</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
        `;

        items.forEach((p, idx) => {
            const awardLabel = p.award || '-';
            const badgeClass = getAwardBadgeStyleClass(awardLabel);
            const rowBg = idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white';

            html += `
                <tr class="${rowBg} hover:bg-sky-50/40 transition">
                    <td class="px-4 py-3 align-middle">
                        <div class="flex flex-col items-start gap-0.5">
                            <span class="inline-block ${isStandalone ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5'} font-extrabold rounded-full border whitespace-nowrap ${badgeClass}">
                                ${awardLabel}
                            </span>
                            ${p.awardNote ? `<span class="text-[11px] text-slate-500 font-medium">${p.awardNote}</span>` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3 align-middle font-bold text-slate-900 whitespace-nowrap">
                        ${p.name || '-'}
                    </td>
                    <td class="px-4 py-3 align-middle text-right font-extrabold text-blue-600 tabular-nums whitespace-nowrap ${isStandalone ? 'text-lg' : 'text-base'}">
                        ${(Number(p.totalScore) || 0).toFixed(2)}
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    return html;
}

/**
 * 상단 편집 표 또는 카지노 보드 수정 시 별도 요약 섹션 DOM 즉시 갱신 및 별도 창 브로드캐스트
 */
export function updateFinalAwardsSummaryBoard() {
    if (typeof document !== 'undefined') {
        const slot = document.getElementById('final-awards-summary-board');
        if (slot && appState.finalResultsData) {
            slot.innerHTML = renderFinalAwardsBoardCardsHTML(appState.finalResultsData, {
                showCategoryPngBtn: true
            });
        }
    }
    broadcastAwardsBoardUpdate();
}

export function renderFinalResults() {
    initializeFinalResultsData();
    const isArchive = appState.isArchiveMode();
    const finalData = appState.finalResultsData;
    const presenters = appState.presenters;
    const hasCustomOverrides = !isArchive && appState.awardOverrides && Object.keys(appState.awardOverrides).length > 0;

    let introHTML = `
        <div class="p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div class="text-slate-700 text-sm md:text-base">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-extrabold text-amber-900">🏅 최종 훈격 및 특별상 확정 관리</span>
                    ${hasCustomOverrides ? `<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">수동 지정 훈격 적용 중</span>` : `<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">종합점수 순위 자동 배정 기준</span>`}
                </div>
                <p>${INTRO_TEXTS.final_results}</p>
            </div>
            ${!isArchive ? `
            <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
                <button id="reset-final-awards-btn" class="text-xs md:text-sm font-semibold px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-xs transition whitespace-nowrap">
                    ↺ 점수 순위대로 자동 재산정
                </button>
                <button id="save-final-awards-btn" class="text-xs md:text-sm font-bold px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition whitespace-nowrap">
                    💾 훈격 확정 저장 (시상식 동기화)
                </button>
            </div>
            ` : ''}
        </div>
    `;

    // 1. 카지노 배팅 테이블 스타일 직관적 카드 배치 보드
    const casinoBoardHTML = `
        <div id="casino-betting-board-slot">
            ${renderCasinoBettingBoardHTML(finalData, isArchive)}
        </div>
    `;

    // 2. 중단: 세부 점수 수정 표(8 cols) + 부문별 점수 차트(4 cols)
    let contentHTML = `<div class="grid grid-cols-1 xl:grid-cols-12 gap-8">`;

    contentHTML += `
        <div class="xl:col-span-8">
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 훈격 ${isArchive ? '(조회 전용)' : '(수정 및 특별상 지정 가능)'}</h2>
            <div class="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
                <table class="w-full text-sm text-left text-slate-500">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th class="px-3 py-3 whitespace-nowrap">부문</th>
                            <th class="px-3 py-3 whitespace-nowrap">발표자</th>
                            <th class="px-2.5 py-3 text-right whitespace-nowrap">평균점수</th>
                            <th class="px-2.5 py-3 text-right whitespace-nowrap">투표점수</th>
                            <th class="px-2.5 py-3 text-right whitespace-nowrap">종합점수</th>
                            <th class="px-3 py-3 whitespace-nowrap">훈격 / 특별상 지정</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    Object.keys(finalData).forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const categoryAwardSlots = AWARD_SLOTS_2026[category] || null;

        finalData[category].forEach((p, index) => {
            const presenterOptions = (presenters[category] || [])
                .map(option => `<option value="${option.id}" ${option.id === p.id ? 'selected' : ''}>${option.name}</option>`)
                .join('');

            let awardCellInner = '';
            if (categoryAwardSlots && !isArchive) {
                const slotOptions = categoryAwardSlots.map(slot => {
                    const isSelected = p.awardId
                        ? p.awardId === slot.awardId
                        : (p.award === slot.award && (!p.awardNote || p.awardNote === slot.note));
                    return `<option value="${slot.awardId}" ${isSelected ? 'selected' : ''}>${slot.selectLabel}</option>`;
                }).join('');

                awardCellInner = `
                    <select class="final-award-select bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs md:text-sm font-bold text-slate-800 w-full min-w-[195px] focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="-" ${(!p.award || p.award === '-') ? 'selected' : ''}>- (수상 제외)</option>
                        ${slotOptions}
                    </select>
                    ${p.awardNote ? `<div class="final-award-note text-[11px] text-slate-400 mt-1">${p.awardNote}</div>` : `<div class="final-award-note text-[11px] text-slate-400 mt-1"></div>`}
                `;
            } else {
                awardCellInner = `<span class="final-award-cell font-bold" ${isArchive ? '' : 'contenteditable="true"'}>${p.award}</span>`;
            }

            contentHTML += `
                <tr class="bg-white border-b hover:bg-slate-50/60" data-category="${category}" data-index="${index}">
                    ${index === 0 ? `<td class="px-3 py-4 font-bold text-slate-900 bg-slate-50/60 border-r border-slate-100 whitespace-nowrap" rowspan="${finalData[category].length}">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category}</td>` : ''}
                    <td class="px-3 py-3">
                        <select class="final-presenter-select bg-white border border-slate-300 rounded-md p-1.5 text-xs md:text-sm font-medium text-slate-800 w-full min-w-[130px]" ${isArchive ? 'disabled' : ''}>
                            ${presenterOptions}
                        </select>
                    </td>
                    <td class="px-2.5 py-3 text-right final-score-cell" ${isArchive ? '' : 'contenteditable="true"'}>${p.score.toFixed(2)}</td>
                    <td class="px-2.5 py-3 text-right final-vote-score-cell" ${isArchive ? '' : 'contenteditable="true"'}>${p.voteScore}</td>
                    <td class="px-2.5 py-3 text-right final-total-score-cell font-extrabold text-blue-600">${p.totalScore.toFixed(2)}</td>
                    <td class="px-3 py-3">${awardCellInner}</td>
                </tr>
            `;
        });
    });

    contentHTML += `</tbody></table></div></div>`;

    contentHTML += `
        <div class="xl:col-span-4">
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 점수 차트 (수정 반영)</h2>
            <div class="space-y-6">
    `;

    Object.keys(presenters).forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const chartHeight = Math.max(200, presenters[category].length * 38 + 60);
        contentHTML += `
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-bold text-slate-800 mb-2">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category} 부문 종합 점수</h3>
                <div class="chart-container mx-auto" style="height:${chartHeight}px">
                    <canvas id="final-${category}-chart"></canvas>
                </div>
            </div>
        `;
    });

    contentHTML += `</div></div></div>`;

    // 3. 하단 별도 섹션: 최종 훈격 확정 요약 보드 (훈격/특별상 -> 발표자 -> 종합점수 순서, PNG 저장 및 별도 창 보기 지원)
    const summarySectionHTML = `
        <section id="final-awards-summary-section" class="mt-10 pt-8 border-t-2 border-slate-200">
            <div class="bg-gradient-to-r from-slate-50 via-sky-50/70 to-indigo-50/70 border border-slate-200 rounded-2xl p-5 mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                <div>
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h2 class="text-xl md:text-2xl font-extrabold text-slate-900">📋 부문별 최종 훈격 확정 요약 보드</h2>
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">공유 · 보고 · 시상 발표용</span>
                    </div>
                    <p class="text-xs md:text-sm text-slate-600">
                        상단 카지노 보드 또는 표에서 조정한 내용이 실시간 반영되며, <strong>훈격 / 특별상 ➔ 발표자 ➔ 종합점수</strong> 순서로 깔끔하게 정리되어 <strong>PNG 그림파일 저장</strong> 및 <strong>별도 창(세션) 보기</strong>가 가능합니다.
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <button type="button" id="download-all-awards-png-btn" class="text-xs md:text-sm font-bold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap">
                        <span>🖼️</span>
                        <span>전체 훈격표 PNG 저장</span>
                    </button>
                    <button type="button" id="open-awards-board-window-btn" class="text-xs md:text-sm font-bold px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap">
                        <span>🖥️</span>
                        <span>별도 창(세션)으로 보기</span>
                    </button>
                </div>
            </div>

            <div id="final-awards-summary-board">
                ${renderFinalAwardsBoardCardsHTML(finalData, { showCategoryPngBtn: true })}
            </div>
        </section>
    `;

    setTimeout(() => {
        renderFinalResultsCharts(finalData);
    }, 0);

    return introHTML + casinoBoardHTML + contentHTML + summarySectionHTML;
}
