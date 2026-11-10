/**
 * appState.js
 * 애플리케이션 전역 상태 및 동적 설정 관리 모듈
 */

import {
    PRESENTERS,
    EVALUATION_CRITERIA,
    EVENT_INFO,
    ORIGINAL_2025_CONFIG,
    SCHEMA_VERSION_2026
} from '../config/constants.js';

const SYSTEM_TABS = new Set([
    'results',
    'presentation_results',
    'radar_analysis',
    'award_ceremony',
    'live_vote_status',
    'detailed_results',
    'voter_detailed_results',
    'final_results',
    'excellent_presenters',
    'admin_settings'
]);

const PREFERRED_CATEGORY_ORDER = ['support', 'technology', '6s', 'six_sigma', 'rnd', 'ai'];

function normalizeCategoryOrder(mapObj) {
    if (!mapObj || typeof mapObj !== 'object') return mapObj;
    const ordered = {};
    PREFERRED_CATEGORY_ORDER.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(mapObj, key)) {
            ordered[key] = mapObj[key];
        }
    });
    Object.keys(mapObj).forEach(key => {
        if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
            ordered[key] = mapObj[key];
        }
    });
    return ordered;
}

export const appState = {
    loginId: null,
    currentUserRole: 'evaluator',
    activeTab: 'support',
    allScores: {},
    submissionStatus: {},
    allSubmissions: {},
    excellentPresenterSelections: {},
    finalResultsData: null,
    awardOverrides: {}, // 관리자 수동 확정 훈격/특별상 매핑 { [presenterId]: { awardId, award, note, tier } }
    selectedPresentationCategory: 'support',
    saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
    isOnline: navigator.onLine,
    voterEmail: null,
    currentYear: 2026, // 기본값: 2026년 대회

    // 연도별 설정 독립 저장소 (2025년 불변 마스터 보존 및 2026년 신규 2개 부문 설정 격리)
    yearConfigs: {
        2025: {
            presenters: JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.presenters)),
            evaluationCriteria: JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.evaluationCriteria)),
            eventInfo: JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.eventInfo)),
            awardOverrides: {}
        },
        2026: {
            presenters: JSON.parse(JSON.stringify(PRESENTERS)),
            evaluationCriteria: JSON.parse(JSON.stringify(EVALUATION_CRITERIA)),
            eventInfo: JSON.parse(JSON.stringify(EVENT_INFO)),
            awardOverrides: {}
        }
    },

    // 현재 활성 연도의 대회 설정 데이터
    presenters: JSON.parse(JSON.stringify(PRESENTERS)),
    evaluationCriteria: JSON.parse(JSON.stringify(EVALUATION_CRITERIA)),
    eventInfo: JSON.parse(JSON.stringify(EVENT_INFO)),

    listeners: new Set(),

    isArchiveMode() {
        return this.currentYear === 2025;
    },

    getFirstCategory() {
        const keys = Object.keys(this.presenters || {});
        return keys[0] || (this.currentYear === 2025 ? '6s' : 'support');
    },

    ensureValidCategorySelection() {
        const validCategories = Object.keys(this.presenters || {});
        if (validCategories.length === 0) return;

        if (!validCategories.includes(this.selectedPresentationCategory)) {
            this.selectedPresentationCategory = validCategories[0];
        }

        if (!SYSTEM_TABS.has(this.activeTab) && !validCategories.includes(this.activeTab)) {
            this.activeTab = validCategories[0];
        }
    },

    setYear(year) {
        const parsedYear = parseInt(year, 10) || 2026;
        if (this.currentYear !== parsedYear) {
            // 1. 이전 연도의 최신 설정을 캐시에 보관 (단, 2025년 불변 마스터는 오염 방지를 위해 덮어쓰지 않음)
            if (this.currentYear !== 2025) {
                this.yearConfigs[this.currentYear] = {
                    presenters: JSON.parse(JSON.stringify(this.presenters)),
                    evaluationCriteria: JSON.parse(JSON.stringify(this.evaluationCriteria)),
                    eventInfo: JSON.parse(JSON.stringify(this.eventInfo)),
                    awardOverrides: JSON.parse(JSON.stringify(this.awardOverrides || {}))
                };
            }

            this.currentYear = parsedYear;

            // 2. 연도 전환 시 점수/투표 인메모리 캐시 초기화
            this.allScores = {};
            this.submissionStatus = {};
            this.allSubmissions = {};
            this.excellentPresenterSelections = {};
            this.finalResultsData = null;

            // 3. 목표 연도의 설정 완벽 복원
            if (parsedYear === 2025) {
                // 2025년은 절대 불변 원본 마스터(4개 부문)로 100% 강제 원복
                this.presenters = JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.presenters));
                this.evaluationCriteria = JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.evaluationCriteria));
                this.eventInfo = JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.eventInfo));
                this.awardOverrides = {};
            } else {
                // 2026년 이후: 저장된 연도별 설정 또는 기본값(지원·기술 2개 부문) 복원
                const targetConfig = this.yearConfigs[parsedYear] || {
                    presenters: JSON.parse(JSON.stringify(PRESENTERS)),
                    evaluationCriteria: JSON.parse(JSON.stringify(EVALUATION_CRITERIA)),
                    eventInfo: JSON.parse(JSON.stringify(EVENT_INFO)),
                    awardOverrides: {}
                };
                this.presenters = JSON.parse(JSON.stringify(targetConfig.presenters));
                this.evaluationCriteria = JSON.parse(JSON.stringify(targetConfig.evaluationCriteria));
                this.eventInfo = JSON.parse(JSON.stringify(targetConfig.eventInfo));
                this.awardOverrides = JSON.parse(JSON.stringify(targetConfig.awardOverrides || {}));
            }

            this.ensureValidCategorySelection();

            this.notify('YEAR_CHANGED', { year: parsedYear });
            this.notify('CONFIG_CHANGED', {
                presenters: this.presenters,
                evaluationCriteria: this.evaluationCriteria,
                eventInfo: this.eventInfo,
                awardOverrides: this.awardOverrides
            });
        }
    },

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    },

    notify(eventType, payload) {
        for (const listener of this.listeners) {
            try {
                listener(eventType, payload, this);
            } catch (err) {
                console.error("State listener error:", err);
            }
        }
    },

    setLogin(id, role) {
        this.loginId = id;
        this.currentUserRole = role;
        this.notify('LOGIN_CHANGED', { id, role });
    },

    setActiveTab(tab) {
        this.activeTab = tab;
        this.notify('TAB_CHANGED', { tab });
    },

    setPresentationCategory(category) {
        this.selectedPresentationCategory = category;
        this.notify('PRESENTATION_CATEGORY_CHANGED', { category });
    },

    setSaveStatus(status) {
        this.saveStatus = status;
        this.notify('SAVE_STATUS_CHANGED', { status });
    },

    setOnlineStatus(online) {
        this.isOnline = online;
        this.notify('ONLINE_STATUS_CHANGED', { online });
    },

    setPresenterScoreData(presenterId, data) {
        this.allScores[presenterId] = data;
        this.finalResultsData = null;
        this.notify('SCORES_CHANGED', { presenterId, data });
    },

    deletePresenterScoreData(presenterId) {
        delete this.allScores[presenterId];
        this.finalResultsData = null;
        this.notify('SCORES_CHANGED', { presenterId });
    },

    setSubmissions(submissions) {
        this.submissionStatus = submissions || {};
        this.notify('SUBMISSIONS_CHANGED', this.submissionStatus);
    },

    setAllSubmissions(allSubs) {
        this.allSubmissions = allSubs || {};
        this.notify('ALL_SUBMISSIONS_CHANGED', this.allSubmissions);
    },

    setExcellentPresenterSelections(selections) {
        this.excellentPresenterSelections = selections || {};
        this.finalResultsData = null;
        this.notify('VOTES_CHANGED', this.excellentPresenterSelections);
    },

    setAwardOverrides(overrides) {
        this.awardOverrides = overrides || {};
        if (this.currentYear !== 2025 && this.yearConfigs[this.currentYear]) {
            this.yearConfigs[this.currentYear].awardOverrides = JSON.parse(JSON.stringify(this.awardOverrides));
        }
        this.finalResultsData = null;
        this.notify('AWARD_OVERRIDES_CHANGED', this.awardOverrides);
    },

    applyRemoteConfig(config, year) {
        const targetYear = parseInt(year, 10) || this.currentYear;

        // 2025년은 절대 불변 마스터 유지 (외부 설정에 의한 오염 원천 차단)
        if (targetYear === 2025) {
            this.presenters = JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.presenters));
            this.evaluationCriteria = JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.evaluationCriteria));
            this.eventInfo = JSON.parse(JSON.stringify(ORIGINAL_2025_CONFIG.eventInfo));
            this.awardOverrides = {};
            this.finalResultsData = null;
            this.ensureValidCategorySelection();
            this.notify('CONFIG_CHANGED', ORIGINAL_2025_CONFIG);
            return;
        }

        if (!config) return;

        // 2026년 신규 2개 부문 스키마 검증 (구형 4개 부문 테스트 설정이 덮어쓰는 현상 원천 차단)
        const isValid2026Schema =
            config.schemaVersion === SCHEMA_VERSION_2026 ||
            Boolean(config.presenters && ('support' in config.presenters || 'technology' in config.presenters));

        if (!this.yearConfigs[targetYear]) {
            this.yearConfigs[targetYear] = {
                presenters: JSON.parse(JSON.stringify(PRESENTERS)),
                evaluationCriteria: JSON.parse(JSON.stringify(EVALUATION_CRITERIA)),
                eventInfo: JSON.parse(JSON.stringify(EVENT_INFO)),
                awardOverrides: {}
            };
        }

        if (isValid2026Schema) {
            if (config.presenters) {
                this.yearConfigs[targetYear].presenters = normalizeCategoryOrder(JSON.parse(JSON.stringify(config.presenters)));
            }
            if (config.evaluationCriteria) {
                this.yearConfigs[targetYear].evaluationCriteria = normalizeCategoryOrder(JSON.parse(JSON.stringify(config.evaluationCriteria)));
            }
            if (config.awardOverrides !== undefined) {
                this.yearConfigs[targetYear].awardOverrides = JSON.parse(JSON.stringify(config.awardOverrides || {}));
            }
        }
        if (config.eventInfo) {
            const mergedEventInfo = {
                ...EVENT_INFO,
                ...JSON.parse(JSON.stringify(config.eventInfo))
            };
            // 2026년 설정에 과거 2025년 기본 PDF 링크가 남아있을 경우 2026년 신규 기본 링크로 자동 교체
            const legacy2025DocLink = ORIGINAL_2025_CONFIG.eventInfo.DOC_LINK;
            if (!mergedEventInfo.DOC_LINK || mergedEventInfo.DOC_LINK.trim() === legacy2025DocLink) {
                mergedEventInfo.DOC_LINK = EVENT_INFO.DOC_LINK;
            }
            this.yearConfigs[targetYear].eventInfo = mergedEventInfo;
        }

        // 현재 활성 연도와 일치할 때만 인메모리 적용 및 알림
        if (targetYear === this.currentYear) {
            this.presenters = JSON.parse(JSON.stringify(this.yearConfigs[targetYear].presenters));
            this.evaluationCriteria = JSON.parse(JSON.stringify(this.yearConfigs[targetYear].evaluationCriteria));
            this.eventInfo = JSON.parse(JSON.stringify(this.yearConfigs[targetYear].eventInfo));
            this.awardOverrides = JSON.parse(JSON.stringify(this.yearConfigs[targetYear].awardOverrides || {}));
            this.finalResultsData = null;
            this.ensureValidCategorySelection();
            this.notify('CONFIG_CHANGED', config);
        }
    },

    updateScoreInMemory(presenterId, loginId, criterionKey, scoreValue) {
        if (!this.allScores[presenterId]) {
            this.allScores[presenterId] = { scores: {} };
        }
        if (!this.allScores[presenterId].scores) {
            this.allScores[presenterId].scores = {};
        }
        if (!this.allScores[presenterId].scores[loginId]) {
            this.allScores[presenterId].scores[loginId] = {};
        }
        this.allScores[presenterId].scores[loginId][criterionKey] = scoreValue;
        this.finalResultsData = null;
    },

    resetFinalResultsCache() {
        this.finalResultsData = null;
    }
};
