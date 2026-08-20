/**
 * constants.js
 * 2026년 경영혁신 경진대회 메타데이터 및 시스템 상수 정의
 */

export const EVENT_INFO = {
    YEAR: "2026",
    TITLE: "2026 경영혁신 경진대회 평가 시스템",
    SUBTITLE: "실시간 온라인 평가 & 투표 시스템",
    DOC_LINK: "https://drive.google.com/file/d/1AyafN2H5GZ4dOcM6lpkk_ziknGKnJN-w/view?usp=drive_link",
    DOC_TITLE: "2026년 경영혁신경진대회 식순 및 발표 요약문집",
    TOTAL_VOTERS: 200 // 기본 투표자 정원
};

export const PRESENTERS = {
    "6s": [
        { id: "6s-1", name: "김동회 수석" },
        { id: "6s-2", name: "김형수 선임" },
        { id: "6s-3", name: "김하얀 사원" }
    ],
    "six_sigma": [
        { id: "ss-1", name: "장동은 책임" },
        { id: "ss-2", name: "이원근 책임" }
    ],
    "rnd": [
        { id: "rd-1", name: "김동겸 책임" },
        { id: "rd-2", name: "심선용 선임" },
        { id: "rd-3", name: "임장수 책임" }
    ],
    "ai": [
        { id: "ai-1", name: "엄동식 책임" },
        { id: "ai-2", name: "최창준 선임" },
        { id: "ai-3", name: "김선홍 선임" },
        { id: "ai-4", name: "박영환 선임" }
    ]
};

export const EVALUATION_CRITERIA = {
    "6s": [
        { key: "strategy", name: "경영전략과의 연계성", max: 20 },
        { key: "goal_setting", name: "목표 설정의 적정성", max: 10 },
        { key: "achievement", name: "목표 달성도", max: 10 },
        { key: "improvement", name: "개선후 향상도", max: 20 },
        { key: "sustainability", name: "관리체계 실행 정도", max: 20 },
        { key: "creativity", name: "창의성, 노력도", max: 20 }
    ],
    "six_sigma": [
        { key: "define", name: "정의(D)", max: 15 },
        { key: "measure", name: "측정(M)", max: 15 },
        { key: "analyze", name: "분석(A)", max: 20 },
        { key: "improve", name: "개선(I)", max: 25 },
        { key: "control", name: "관리(C)", max: 5 },
        { key: "best_practice", name: "Best Practice", max: 10 },
        { key: "attitude", name: "태도", max: 10 }
    ],
    "rnd": [
        { key: "topic", name: "주제 선정 타당성", max: 20 },
        { key: "creativity", name: "개선안 창의성", max: 20 },
        { key: "improvement", name: "개선안 향상도", max: 20 },
        { key: "completeness", name: "개선안 완성도", max: 20 },
        { key: "practicality", name: "개선안 실용성", max: 20 }
    ],
    "ai": [
        { key: "topic_ai", name: "주제 선정 타당성", max: 20 },
        { key: "data_usage", name: "데이터 활용 적정성", max: 20 },
        { key: "model_creativity", name: "모델/알고리즘 창의성", max: 20 },
        { key: "performance", name: "성능 및 효과성", max: 20 },
        { key: "scalability", name: "확장성 및 운영성", max: 20 }
    ]
};

export const CATEGORY_DISPLAY_NAMES = {
    "6s": "6S",
    "six_sigma": "6시그마",
    "rnd": "R&D",
    "ai": "AI"
};

export const VOTE_SCORE_MAP = [10, 7, 4, 1];

export const INTRO_TEXTS = {
    "6s": "이 섹션에서는 **6S 부문** 발표자들의 과제를 평가합니다. 각 평가 항목의 배점을 참고하여 점수를 입력해 주세요. 점수는 실시간으로 자동 저장 및 집계됩니다.",
    "six_sigma": "이 섹션에서는 **6시그마 부문** 발표자들의 과제를 평가합니다. DMAIC 단계별 평가 항목을 기준으로 점수를 입력해 주세요. 모든 점수는 자동으로 실시간 저장됩니다.",
    "rnd": "이 섹션에서는 **R&D 부문** 발표자들의 과제를 평가합니다. 주제 선정부터 실용성까지 각 항목을 신중하게 평가해 주시기 바랍니다.",
    "ai": "이 섹션에서는 **AI 부문** 발표자들의 과제를 평가합니다. 데이터 활용, 모델의 창의성 및 성능을 중심으로 평가를 진행해 주세요.",
    "results": "이곳에서는 모든 평가자들의 점수를 합산한 **최종 결과**를 부문별로 확인할 수 있습니다. 평균 점수와 투표 점수를 기준으로 순위가 매겨지며, 시각적인 비교를 위해 차트가 함께 제공됩니다.",
    "presentation_results": "이곳에서는 부문별 **발표 결과**를 세로형 막대 그래프로 확인할 수 있습니다. 드롭다운에서 부문을 선택하여 해당 부문의 평균점수, 투표점수 및 훈격을 시각적으로 비교해보세요.",
    "live_vote_status": "이곳에서는 **실시간 투표 현황**을 확인할 수 있습니다. 왼쪽에는 부문별 득표 현황이 차트로 표시되고, 오른쪽에는 득표 순위에 따른 환산 점수가 표시됩니다.",
    "detailed_results": "이곳에서는 각 평가자가 발표자별, 항목별로 부여한 모든 점수를 상세하게 확인할 수 있습니다. 이를 통해 평가자 간의 점수 편차를 분석하고, 평가의 공정성을 검토할 수 있습니다.",
    "voter_detailed_results": "이곳에서는 각 투표자가 부문별로 어떤 발표자에게 투표했는지 상세 내역을 확인할 수 있습니다. 이를 통해 투표 결과의 투명성을 확보하고 전체적인 투표 경향을 분석할 수 있습니다.",
    "final_results": "이곳에서는 집계된 **최종 결과**를 확인하고, 필요한 경우 직접 수정할 수 있습니다. 발표자 순서나 훈격 등을 드롭다운 메뉴와 직접 입력을 통해 조정하고 최종 결과를 확정하세요.",
    "excellent_presenters": "이곳에서는 행사에 참여하신 여러분이 발표 내용과 발표자 태도 등을 종합적으로 판단하여 가장 우수하다고 생각하는 발표자를 체크박스를 사용하여 선택합니다. 각 부문별로 1개만 선택해주세요."
};
