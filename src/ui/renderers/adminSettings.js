/**
 * adminSettings.js
 * 관리자 전용 발표자, 평가 기준 및 대회 정보 동적 설정 관리 뷰
 */

import { CATEGORY_DISPLAY_NAMES } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { saveEventConfig } from '../../services/firestoreService.js';
import { showMessage } from '../modal.js';

export function renderAdminSettings() {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;
    const eventInfo = appState.eventInfo;

    let html = `
        <div class="space-y-8">
            <div class="p-4 bg-purple-50 border border-purple-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-xl font-bold text-purple-900">대회 및 발표자 설정 관리</h2>
                    <p class="text-sm text-purple-700 mt-0.5">발표자 명단, 배점 기준 및 대회 정보를 직접 수정하고 실시간 저장합니다.</p>
                </div>
                <div class="flex gap-2">
                    <button id="save-config-btn" class="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        설정 저장 및 전체 적용
                    </button>
                </div>
            </div>

            <!-- 1. 기본 대회 정보 설정 -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-4 border-b pb-2">1. 대회 기본 정보</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">대회 제목</label>
                        <input type="text" id="config-title" value="${eventInfo.TITLE || ''}" class="w-full px-3 py-2 border rounded-md text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">연도</label>
                        <input type="text" id="config-year" value="${eventInfo.YEAR || '2026'}" class="w-full px-3 py-2 border rounded-md text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">발표 요약문집 PDF 링크 URL</label>
                        <input type="text" id="config-doc-link" value="${eventInfo.DOC_LINK || ''}" class="w-full px-3 py-2 border rounded-md text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">투표자 정원 (진척도 기준 인원)</label>
                        <input type="number" id="config-total-voters" value="${eventInfo.TOTAL_VOTERS || 200}" class="w-full px-3 py-2 border rounded-md text-sm">
                    </div>
                </div>
            </div>

            <!-- 2. 부문별 발표자 명단 관리 -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-4 border-b pb-2">2. 부문별 발표자 명단 관리</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    `;

    Object.keys(presenters).forEach(category => {
        html += `
            <div class="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-slate-800">${CATEGORY_DISPLAY_NAMES[category]} 발표자 (${presenters[category].length}명)</h4>
                    <button class="add-presenter-btn text-xs font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 px-2.5 py-1 rounded border border-sky-200" data-category="${category}">+ 발표자 추가</button>
                </div>
                <div class="space-y-2" id="presenter-list-${category}">
        `;

        presenters[category].forEach((p, idx) => {
            html += `
                <div class="flex items-center gap-2 bg-white p-2 border rounded-md" data-category="${category}" data-index="${idx}">
                    <span class="text-xs font-bold text-slate-400 w-6">${idx + 1}</span>
                    <input type="text" value="${p.name}" class="presenter-name-input flex-grow px-2 py-1 text-sm border rounded" placeholder="성명 및 직급">
                    <button class="delete-presenter-btn text-red-500 hover:text-red-700 text-xs px-2 py-1" data-category="${category}" data-index="${idx}">삭제</button>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>

            <!-- 3. 부문별 배점 기준 확인 -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-4 border-b pb-2">3. 부문별 평가 배점 기준 (총 100점)</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    `;

    Object.keys(criteria).forEach(category => {
        const totalMax = criteria[category].reduce((sum, c) => sum + (parseInt(c.max, 10) || 0), 0);
        html += `
            <div class="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-slate-800">${CATEGORY_DISPLAY_NAMES[category]} 배점 기준</h4>
                    <span class="text-xs font-bold px-2 py-0.5 rounded ${totalMax === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">총 ${totalMax}점</span>
                </div>
                <div class="space-y-2">
        `;

        criteria[category].forEach((c, idx) => {
            html += `
                <div class="flex items-center gap-2 bg-white p-2 border rounded-md" data-category="${category}" data-index="${idx}">
                    <input type="text" value="${c.name}" class="criterion-name-input flex-grow px-2 py-1 text-xs border rounded" placeholder="항목명">
                    <input type="number" value="${c.max}" class="criterion-max-input w-16 px-2 py-1 text-xs border rounded text-center" placeholder="배점">
                    <span class="text-xs text-slate-500">점</span>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    return html;
}

/**
 * 설정 저장 핸들러
 */
export async function handleSaveConfig() {
    const newConfig = {
        eventInfo: {
            TITLE: document.getElementById('config-title')?.value || appState.eventInfo.TITLE,
            YEAR: document.getElementById('config-year')?.value || appState.eventInfo.YEAR,
            DOC_LINK: document.getElementById('config-doc-link')?.value || appState.eventInfo.DOC_LINK,
            TOTAL_VOTERS: parseInt(document.getElementById('config-total-voters')?.value, 10) || 200
        },
        presenters: JSON.parse(JSON.stringify(appState.presenters)),
        evaluationCriteria: JSON.parse(JSON.stringify(appState.evaluationCriteria))
    };

    // 발표자 이름 폼 수집
    document.querySelectorAll('.presenter-name-input').forEach(input => {
        const row = input.closest('div[data-category]');
        if (row) {
            const cat = row.dataset.category;
            const idx = parseInt(row.dataset.index, 10);
            if (newConfig.presenters[cat] && newConfig.presenters[cat][idx]) {
                newConfig.presenters[cat][idx].name = input.value.trim();
            }
        }
    });

    // 배점 항목 폼 수집
    document.querySelectorAll('.criterion-name-input').forEach(input => {
        const row = input.closest('div[data-category]');
        if (row) {
            const cat = row.dataset.category;
            const idx = parseInt(row.dataset.index, 10);
            const maxInput = row.querySelector('.criterion-max-input');
            if (newConfig.evaluationCriteria[cat] && newConfig.evaluationCriteria[cat][idx]) {
                newConfig.evaluationCriteria[cat][idx].name = input.value.trim();
                newConfig.evaluationCriteria[cat][idx].max = parseInt(maxInput.value, 10) || 0;
            }
        }
    });

    try {
        await saveEventConfig(newConfig);
        showMessage("대회 설정이 성공적으로 저장되었습니다. 모든 클라이언트에 실시간 반영됩니다.");
    } catch (error) {
        console.error("Config save error:", error);
        showMessage("설정 저장 중 오류가 발생했습니다: " + error.message);
    }
}
