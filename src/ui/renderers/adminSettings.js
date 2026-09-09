/**
 * adminSettings.js
 * 관리자 전용 발표자, 평가 기준, 대회 정보 및 보안/비밀번호 관리 뷰
 * (2025년 과거 아카이브 모드 시 읽기 전용 잠금 완벽 적용)
 */

import { CATEGORY_DISPLAY_NAMES } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { saveRemoteConfig, changeSystemPassword } from '../../services/firestoreService.js';
import { showMessage } from '../modal.js';

export function renderAdminSettings() {
    const isArchive = appState.isArchiveMode();
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;
    const eventInfo = appState.eventInfo;

    const inputStateAttr = isArchive ? 'disabled readonly' : '';
    const inputClassExtra = isArchive ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white';

    let html = `
        <div class="space-y-8">
            ${isArchive ? `
            <div class="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-center gap-3 text-amber-950 shadow-sm">
                <span class="text-3xl flex-shrink-0">🔒</span>
                <div>
                    <h3 class="font-extrabold text-amber-900 text-sm md:text-base">[2025년 과거 기록 보관소 - 설정 수정 잠금]</h3>
                    <p class="text-xs md:text-sm text-amber-800 mt-0.5 leading-relaxed">
                        현재 2025년 과거 기록을 열람 중입니다. 과거 대회의 발표자 명단과 배점 기준은 데이터 무결성 보존을 위해 <strong>영구 수정 불가(읽기 전용)</strong> 상태입니다.
                        2026년 대회의 발표자나 배점을 수정하시려면 상단 헤더에서 <strong>[📅 2026년 대회 (진행 중)]</strong>를 선택해 주세요.
                    </p>
                </div>
            </div>
            ` : ''}

            <div class="p-4 bg-purple-50 border border-purple-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-xl font-bold text-purple-900">대회 및 보안 설정 관리 (${appState.currentYear}년)</h2>
                    <p class="text-sm text-purple-700 mt-0.5">대회 메타데이터, 발표자 명단, 배점 기준 및 시스템 보안 비밀번호를 직접 관리합니다.</p>
                </div>
                <div class="flex gap-2">
                    <button id="save-config-btn" ${isArchive ? 'disabled' : ''} class="${isArchive ? 'bg-slate-400 cursor-not-allowed opacity-60' : 'bg-purple-600 hover:bg-purple-700'} text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        ${isArchive ? '설정 저장 불가 (과거 보존 모드)' : '설정 저장 및 전체 적용'}
                    </button>
                </div>
            </div>

            <!-- 1. 기본 대회 정보 설정 -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-4 border-b pb-2">1. 대회 기본 정보</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">대회 제목</label>
                        <input type="text" id="config-title" value="${eventInfo.TITLE || ''}" ${inputStateAttr} class="w-full px-3 py-2 border rounded-md text-sm ${inputClassExtra}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">연도</label>
                        <input type="text" id="config-year" value="${eventInfo.YEAR || appState.currentYear}" ${inputStateAttr} class="w-full px-3 py-2 border rounded-md text-sm ${inputClassExtra}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">발표 요약문집 PDF 링크 URL</label>
                        <input type="text" id="config-doc-link" value="${eventInfo.DOC_LINK || ''}" ${inputStateAttr} class="w-full px-3 py-2 border rounded-md text-sm ${inputClassExtra}">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">투표자 정원 (진척도 기준 인원)</label>
                        <input type="number" id="config-total-voters" value="${eventInfo.TOTAL_VOTERS || 200}" ${inputStateAttr} class="w-full px-3 py-2 border rounded-md text-sm ${inputClassExtra}">
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
                    ${!isArchive ? `<button class="add-presenter-btn text-xs font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 px-2.5 py-1 rounded border border-sky-200" data-category="${category}">+ 발표자 추가</button>` : ''}
                </div>
                <div class="space-y-2" id="presenter-list-${category}">
        `;

        presenters[category].forEach((p, idx) => {
            html += `
                <div class="flex items-center gap-2 bg-white p-2 border rounded-md" data-category="${category}" data-index="${idx}">
                    <span class="text-xs font-bold text-slate-400 w-6">${idx + 1}</span>
                    <input type="text" value="${p.name}" ${inputStateAttr} class="presenter-name-input flex-grow px-2 py-1 text-sm border rounded ${inputClassExtra}" placeholder="성명 및 직급 (또는 회사명)">
                    ${!isArchive ? `<button class="delete-presenter-btn text-red-500 hover:text-red-700 text-xs px-2 py-1" data-category="${category}" data-index="${idx}">삭제</button>` : ''}
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
                    <input type="text" value="${c.name}" ${inputStateAttr} class="criterion-name-input flex-grow px-2 py-1 text-xs border rounded ${inputClassExtra}" placeholder="항목명">
                    <input type="number" value="${c.max}" ${inputStateAttr} class="criterion-max-input w-16 px-2 py-1 text-xs border rounded text-center ${inputClassExtra}" placeholder="배점">
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

            <!-- 4. 시스템 보안 및 비밀번호 관리 (SHA-256 암호화 동적 변경) -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-2 border-b pb-2 flex items-center gap-2">
                    <span class="text-indigo-600">🔐</span> 4. 시스템 보안 및 비밀번호 관리
                </h3>
                <p class="text-xs text-slate-500 mb-6">비밀번호는 SHA-256 단방향 암호화되어 안전하게 보관됩니다. 변경 시 즉시 반영됩니다.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- 관리자 비밀번호 변경 -->
                    <div class="border border-indigo-100 rounded-xl p-5 bg-indigo-50/40">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="text-sm font-bold text-indigo-900">👑 관리자(Admin) 비밀번호 변경</span>
                        </div>
                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-600 mb-1">새 관리자 비밀번호</label>
                                <input type="password" id="new-admin-password" placeholder="새 관리자 비밀번호 입력" class="w-full px-3 py-2 border rounded-md text-sm bg-white">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-600 mb-1">새 관리자 비밀번호 확인</label>
                                <input type="password" id="new-admin-password-confirm" placeholder="새 관리자 비밀번호 재입력" class="w-full px-3 py-2 border rounded-md text-sm bg-white">
                            </div>
                            <button id="change-admin-pw-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition shadow-sm">
                                관리자 비밀번호 변경 적용
                            </button>
                        </div>
                    </div>

                    <!-- 심사위원 비밀번호 변경 -->
                    <div class="border border-sky-100 rounded-xl p-5 bg-sky-50/40">
                        <div class="flex items-center gap-2 mb-3">
                            <span class="text-sm font-bold text-sky-900">⚖️ 심사위원(평가자) 비밀번호 변경</span>
                        </div>
                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-600 mb-1">새 심사위원 비밀번호</label>
                                <input type="password" id="new-evaluator-password" placeholder="새 심사위원 비밀번호 입력" class="w-full px-3 py-2 border rounded-md text-sm bg-white">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-600 mb-1">새 심사위원 비밀번호 확인</label>
                                <input type="password" id="new-evaluator-password-confirm" placeholder="새 심사위원 비밀번호 재입력" class="w-full px-3 py-2 border rounded-md text-sm bg-white">
                            </div>
                            <button id="change-evaluator-pw-btn" class="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2 rounded-lg transition shadow-sm">
                                심사위원 비밀번호 변경 적용
                            </button>
                        </div>
                    </div>
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
    if (appState.isArchiveMode()) {
        showMessage("과거 아카이브(2025년) 모드에서는 설정을 저장할 수 없습니다. 과거 데이터는 영구 보존됩니다.");
        return;
    }

    const newConfig = {
        eventInfo: {
            TITLE: document.getElementById('config-title')?.value || appState.eventInfo.TITLE,
            YEAR: document.getElementById('config-year')?.value || String(appState.currentYear),
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
        await saveRemoteConfig(newConfig);
        // 현재 연도 캐시에도 즉시 반영
        appState.applyRemoteConfig(newConfig, appState.currentYear);
        showMessage(`[${appState.currentYear}년] 대회 설정이 성공적으로 저장되었습니다. 모든 클라이언트에 실시간 반영됩니다.`);
    } catch (error) {
        console.error("Config save error:", error);
        showMessage("설정 저장 중 오류가 발생했습니다: " + error.message);
    }
}

/**
 * 비밀번호 변경 핸들러
 */
export async function handleChangePassword(role) {
    const pwInputId = role === 'admin' ? 'new-admin-password' : 'new-evaluator-password';
    const confirmInputId = role === 'admin' ? 'new-admin-password-confirm' : 'new-evaluator-password-confirm';
    const roleName = role === 'admin' ? '관리자' : '심사위원';

    const pw = document.getElementById(pwInputId)?.value || '';
    const confirm = document.getElementById(confirmInputId)?.value || '';

    if (!pw || pw.length < 4) {
        showMessage(`${roleName} 비밀번호는 최소 4자리 이상이어야 합니다.`);
        return;
    }

    if (pw !== confirm) {
        showMessage("비밀번호 확인이 일치하지 않습니다. 다시 입력해 주세요.");
        return;
    }

    showMessage(`${roleName} 비밀번호를 변경하시겠습니까? 즉시 암호화 적용되어 다음 로그인부터 새 비밀번호가 요구됩니다.`, true, async () => {
        try {
            await changeSystemPassword(role, pw);
            document.getElementById(pwInputId).value = '';
            document.getElementById(confirmInputId).value = '';
            showMessage(`${roleName} 비밀번호가 성공적으로 변경되었습니다.`);
        } catch (error) {
            console.error("Password change error:", error);
            showMessage("비밀번호 변경 중 오류가 발생했습니다: " + error.message);
        }
    });
}
