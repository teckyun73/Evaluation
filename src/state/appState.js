/**
 * appState.js
 * 애플리케이션 전역 상태 및 동적 설정 관리 모듈
 */

import { PRESENTERS, EVALUATION_CRITERIA, EVENT_INFO } from '../config/constants.js';

export const appState = {
    loginId: null,
    currentUserRole: 'evaluator',
    activeTab: '6s',
    allScores: {},
    submissionStatus: {},
    allSubmissions: {},
    excellentPresenterSelections: {},
    finalResultsData: null,
    selectedPresentationCategory: '6s',
    saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
    isOnline: navigator.onLine,
    
    // 동적 대회 설정 데이터 (Firestore 연동)
    presenters: JSON.parse(JSON.stringify(PRESENTERS)),
    evaluationCriteria: JSON.parse(JSON.stringify(EVALUATION_CRITERIA)),
    eventInfo: JSON.parse(JSON.stringify(EVENT_INFO)),

    listeners: new Set(),

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

    setDynamicConfig(config) {
        if (!config) return;
        if (config.presenters) this.presenters = config.presenters;
        if (config.evaluationCriteria) this.evaluationCriteria = config.evaluationCriteria;
        if (config.eventInfo) this.eventInfo = config.eventInfo;
        this.finalResultsData = null;
        this.notify('CONFIG_CHANGED', config);
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
