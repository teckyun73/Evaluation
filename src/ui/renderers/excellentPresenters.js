/**
 * excellentPresenters.js
 * 우수 발표자 투표 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';

export function renderExcellentPresenters() {
    const presenters = appState.presenters;
    const mySelections = appState.excellentPresenterSelections[appState.loginId]?.selections || {};
    const isSubmitted = appState.excellentPresenterSelections[appState.loginId]?.submitted === true;

    let introHTML = `
        <div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <p class="text-slate-700 mb-2 md:mb-0 md:mr-4 flex-grow text-sm md:text-base">${INTRO_TEXTS.excellent_presenters}</p>
            <button id="excellent-presenter-submit-btn" class="w-full md:w-auto flex-shrink-0 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 disabled:cursor-not-allowed font-semibold text-sm shadow-sm" ${isSubmitted ? 'disabled' : ''}>
                ${isSubmitted ? '제출 완료' : '최종 제출'}
            </button>
        </div>
    `;

    let contentHTML = `<div class="overflow-x-auto bg-white rounded-lg shadow border border-slate-200">`;
    contentHTML += `<table class="w-full text-sm text-left text-slate-500">`;
    contentHTML += `
        <thead class="text-xs text-slate-700 uppercase bg-slate-100">
            <tr>
                <th class="px-6 py-3.5 text-center">선택</th>
                <th class="px-6 py-3.5">부문</th>
                <th class="px-6 py-3.5">발표자</th>
            </tr>
        </thead>
        <tbody>
    `;

    Object.keys(presenters).forEach(category => {
        presenters[category].forEach((p, index) => {
            const isChecked = mySelections[category] === p.name;
            contentHTML += `
                <tr class="bg-white border-b hover:bg-slate-50 transition" data-category="${category}">
                    <td class="px-6 py-4 text-center">
                        <input type="checkbox" class="excellent-presenter-checkbox h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer" 
                               data-category="${category}" data-presenter-name="${p.name}" 
                               ${isChecked ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}>
                    </td>
                    ${index === 0 ? `<td class="px-6 py-4 font-bold text-slate-900" rowspan="${presenters[category].length}">${CATEGORY_DISPLAY_NAMES[category] || category}</td>` : ''}
                    <td class="px-6 py-4 font-medium text-slate-900">${p.name}</td>
                </tr>
            `;
        });
    });

    contentHTML += `</tbody></table></div>`;
    return introHTML + contentHTML;
}
