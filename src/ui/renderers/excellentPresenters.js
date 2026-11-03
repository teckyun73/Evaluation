/**
 * excellentPresenters.js
 * 우수 발표자 투표 2열 카드형 렌더링 모듈 (부문별 선택 상태 배지 제공)
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';

export function renderExcellentPresenters() {
    const presenters = appState.presenters;
    const categories = Object.keys(presenters);
    const mySelections = appState.excellentPresenterSelections[appState.loginId]?.selections || {};
    const isSubmitted = appState.excellentPresenterSelections[appState.loginId]?.submitted === true;
    const selectedCount = categories.filter(cat => Boolean(mySelections[cat])).length;

    let introHTML = `
        <div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div class="flex-grow">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="font-extrabold text-slate-900 text-base">🗳️ 부문별 우수 발표자 투표</span>
                    <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${selectedCount === categories.length ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
                        선택 현황: ${selectedCount} / ${categories.length}개 부문
                    </span>
                </div>
                <p class="text-slate-700 text-sm md:text-base">${INTRO_TEXTS.excellent_presenters}</p>
            </div>
            <button id="excellent-presenter-submit-btn" class="w-full md:w-auto flex-shrink-0 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 disabled:cursor-not-allowed font-semibold text-sm shadow-sm" ${isSubmitted ? 'disabled' : ''}>
                ${isSubmitted ? '제출 완료' : '최종 제출'}
            </button>
        </div>
    `;

    let contentHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">`;

    categories.forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const selectedName = mySelections[category] || null;
        const catPresenters = presenters[category] || [];

        contentHTML += `
            <div class="bg-white rounded-2xl shadow-sm border ${selectedName ? 'border-sky-300 ring-1 ring-sky-100' : 'border-slate-200'} overflow-hidden">
                <div class="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-start gap-2">
                    <div>
                        <h3 class="font-extrabold text-base md:text-lg text-slate-900">
                            ${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category} 부문 (${catPresenters.length}건)
                        </h3>
                        ${meta.jobScope ? `<p class="text-xs text-slate-500 mt-0.5">${meta.jobScope}</p>` : ''}
                    </div>
                    <span class="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${selectedName ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-slate-200/80 text-slate-600'}">
                        ${selectedName ? `✓ 선택됨` : '1개 선택'}
                    </span>
                </div>
                <div class="divide-y divide-slate-100">
        `;

        catPresenters.forEach((p, index) => {
            const isChecked = selectedName === p.name;
            contentHTML += `
                <label class="flex items-center gap-3.5 px-5 py-3.5 transition ${isSubmitted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-sky-50/50'} ${isChecked ? 'bg-sky-50/80' : 'bg-white'}" data-category="${category}">
                    <input type="checkbox" class="excellent-presenter-checkbox h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 ${isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}" 
                           data-category="${category}" data-presenter-name="${p.name}" 
                           ${isChecked ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
                    <span class="text-xs font-bold text-slate-400 w-6">#${index + 1}</span>
                    <span class="font-semibold text-sm md:text-base ${isChecked ? 'text-sky-900 font-bold' : 'text-slate-800'} flex-grow">${p.name}</span>
                    ${isChecked ? `<span class="text-xs font-bold text-sky-600 bg-white px-2 py-0.5 rounded border border-sky-200">선택</span>` : ''}
                </label>
            `;
        });

        contentHTML += `
                </div>
            </div>
        `;
    });

    contentHTML += `</div>`;
    return introHTML + contentHTML;
}
