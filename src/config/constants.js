/**
 * constants.js
 * 2026년 경영혁신 경진대회 메타데이터, 2개 부문(지원·기술) 배점 기준, 포상(훈격) 테이블 및 2025 아카이브 마스터 상수 정의
 */

export const SCHEMA_VERSION_2026 = "2026-v2";

export const EVENT_INFO = {
    YEAR: "2026",
    TITLE: "2026 경영혁신 경진대회 평가 시스템",
    SUBTITLE: "실시간 온라인 평가 & 투표 시스템",
    DOC_LINK: "https://drive.google.com/file/d/1AyafN2H5GZ4dOcM6lpkk_ziknGKnJN-w/view?usp=drive_link",
    DOC_TITLE: "2026년 경영혁신경진대회 식순 및 발표 요약문집",
    TOTAL_VOTERS: 200 // 기본 투표자 정원
};

/**
 * 2025년 과거 대회 영구 보존 원본 설정 (절대 불변 마스터 데이터 — 4개 부문 체제 완벽 봉인)
 */
export const ORIGINAL_2025_CONFIG = {
    eventInfo: {
        YEAR: "2025",
        TITLE: "2025 경영혁신 경진대회 평가 시스템",
        SUBTITLE: "실시간 온라인 평가 & 투표 시스템",
        DOC_LINK: "https://drive.google.com/file/d/1AyafN2H5GZ4dOcM6lpkk_ziknGKnJN-w/view?usp=drive_link",
        DOC_TITLE: "2025년 경영혁신경진대회 식순 및 발표 요약문집",
        TOTAL_VOTERS: 200
    },
    presenters: {
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
    },
    evaluationCriteria: {
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
    }
};

/**
 * 2026년 기본 발표자 슬롯 (지원 부문 10건 / 기술 부문 6건 — 설정 관리에서 자유 변경 가능)
 */
export const PRESENTERS = {
    "support": [
        { id: "support-1", name: "지원과제 1" },
        { id: "support-2", name: "지원과제 2" },
        { id: "support-3", name: "지원과제 3" },
        { id: "support-4", name: "지원과제 4" },
        { id: "support-5", name: "지원과제 5" },
        { id: "support-6", name: "지원과제 6" },
        { id: "support-7", name: "지원과제 7" },
        { id: "support-8", name: "지원과제 8" },
        { id: "support-9", name: "지원과제 9" },
        { id: "support-10", name: "지원과제 10" }
    ],
    "technology": [
        { id: "tech-1", name: "기술과제 1" },
        { id: "tech-2", name: "기술과제 2" },
        { id: "tech-3", name: "기술과제 3" },
        { id: "tech-4", name: "기술과제 4" },
        { id: "tech-5", name: "기술과제 5" },
        { id: "tech-6", name: "기술과제 6" }
    ]
};

/**
 * 2026년 확정 부문별 평가 배점 기준 (1안 확정: AI 활용 독립 항목 포함 6개 항목, 총 100점)
 */
export const EVALUATION_CRITERIA = {
    "support": [
        {
            key: "strategy_alignment",
            name: "주제 선정 및 경영전략 연계성",
            max: 15,
            desc: "경영방침 부합도, 현장 핵심 문제 발굴 타당성 및 목표 수준"
        },
        {
            key: "analysis_creativity",
            name: "원인 분석 및 개선안 창의성",
            max: 15,
            desc: "현상 파악·원인 분석의 논리성 및 기존 관행을 넘어선 해결 아이디어의 참신성"
        },
        {
            key: "ai_utilization",
            name: "AI 및 디지털 도구 활용도",
            max: 15,
            desc: "생성형 AI, 데이터 분석, 업무 자동화 등 AI·디지털 도구를 활용한 문제 해결 및 스마트 개선 노력"
        },
        {
            key: "achievement_impact",
            name: "개선 성과 및 목표 달성도",
            max: 25,
            desc: "생산성·품질·서비스 향상, 원가절감·매출기여 등 정량/정성적 성과 달성도"
        },
        {
            key: "sustainability",
            name: "표준화 및 현업 지속가능성",
            max: 15,
            desc: "업무 표준화, 사후 관리체계 실행력 및 타 부서 수평전개(Best Practice) 파급성"
        },
        {
            key: "presentation_effort",
            name: "발표 완성도 및 추진 노력도",
            max: 15,
            desc: "발표 구성·전달력, 구성원 협업/실행 노력도 및 질의응답 대응력"
        }
    ],
    "technology": [
        {
            key: "tech_relevance",
            name: "기술 과제 선정 타당성",
            max: 15,
            desc: "연구·개발·수리(IT/전기/전자 등) 과제의 기술적 중요성, 난이도 및 해결 필요성"
        },
        {
            key: "tech_creativity",
            name: "기술적 창의성 및 차별성",
            max: 20,
            desc: "핵심 기술·회로/시스템 설계·수리 기법의 독창성 및 엔지니어링 전문성"
        },
        {
            key: "tech_ai_utilization",
            name: "AI·데이터 기술 접목 및 활용도",
            max: 15,
            desc: "연구·설계·수리(불량 진단/예측/자동화)·검증 과정에서의 AI 모델·데이터·AI 엔지니어링 도구 활용 수준"
        },
        {
            key: "tech_performance",
            name: "성능 향상도 및 기술 완성도",
            max: 20,
            desc: "기존 대비 성능·정확도·수리율·신뢰성 개선 수준 및 테스트/실증 완성도"
        },
        {
            key: "tech_practicality",
            name: "실용성 및 현장/사업 파급효과",
            max: 15,
            desc: "실제 수리·연구·제품 현업 적용성, 기술 내재화 및 비용 절감·사업 기여도"
        },
        {
            key: "tech_scalability",
            name: "확장성 및 발표 전달력",
            max: 15,
            desc: "향후 기술 고도화·표준 기술 확산 가능성 및 비전공자도 이해하기 쉬운 발표 전달력"
        }
    ]
};

/**
 * 부문 표시명 (2026년 신규 2개 부문 + 2025년 아카이브 4개 부문 호환)
 */
export const CATEGORY_DISPLAY_NAMES = {
    "support": "지원",
    "technology": "기술",
    "6s": "6S",
    "six_sigma": "6시그마",
    "rnd": "R&D",
    "ai": "AI"
};

/**
 * 부문별 직무 범위 및 아이콘 메타데이터
 */
export const CATEGORY_METADATA = {
    "support": {
        icon: "🏢",
        tabLabel: "🏢 지원 부문",
        subTitle: "하위: 6S (10건)",
        jobScope: "영업 · 서비스 · 경영 · 생산(품질)"
    },
    "technology": {
        icon: "🔬",
        tabLabel: "🔬 기술 부문",
        subTitle: "하위: R&D · 6σ (6건)",
        jobScope: "연구(R&D) · 수리(IT · 전기 · 전자 등)"
    },
    "6s": { icon: "", tabLabel: "6S", subTitle: "", jobScope: "" },
    "six_sigma": { icon: "", tabLabel: "6시그마", subTitle: "", jobScope: "" },
    "rnd": { icon: "", tabLabel: "R&D", subTitle: "", jobScope: "" },
    "ai": { icon: "", tabLabel: "AI", subTitle: "", jobScope: "" }
};

/**
 * 2026년 부문별 포상(훈격) 기준 테이블 (개인 성명 제거 완료, 총 16개 PJT / 합계 7,900,000원)
 */
export const AWARD_SLOTS_2026 = {
    "support": [
        {
            awardId: "sup_top_1",
            award: "최우수",
            tier: "top",
            prizeType: "상금",
            amount: 600000,
            attribution: "경영혁신실",
            note: "상금 60만원",
            selectLabel: "최우수 (상금 60만원)"
        },
        {
            awardId: "sup_run_1",
            award: "우수",
            tier: "runnerup",
            prizeType: "상금",
            amount: 400000,
            attribution: "경영혁신실",
            note: "상금 40만원",
            selectLabel: "우수 [1] (상금 40만원)"
        },
        {
            awardId: "sup_run_2",
            award: "우수",
            tier: "runnerup",
            prizeType: "상금",
            amount: 400000,
            attribution: "경영혁신실",
            note: "상금 40만원",
            selectLabel: "우수 [2] (상금 40만원)"
        },
        {
            awardId: "sup_enc_1",
            award: "장려",
            tier: "encouragement",
            prizeType: "상금",
            amount: 200000,
            attribution: "경영혁신실",
            note: "상금 20만원",
            selectLabel: "장려 [1] (상금 20만원)"
        },
        {
            awardId: "sup_enc_2",
            award: "장려",
            tier: "encouragement",
            prizeType: "상금",
            amount: 200000,
            attribution: "경영혁신실",
            note: "상금 20만원",
            selectLabel: "장려 [2] (상금 20만원)"
        },
        {
            awardId: "sup_enc_3",
            award: "장려",
            tier: "encouragement",
            prizeType: "상금",
            amount: 200000,
            attribution: "경영혁신실",
            note: "상금 20만원",
            selectLabel: "장려 [3] (상금 20만원)"
        },
        {
            awardId: "sup_sp_1",
            award: "특별상_대한상공회의소 센터장",
            tier: "special",
            prizeType: "상금",
            amount: 500000,
            attribution: "후원",
            note: "상금 50만원 (수상자 계좌이체)",
            selectLabel: "특별상_대한상공회의소 센터장 (상금 50만원)"
        },
        {
            awardId: "sup_sp_2",
            award: "특별상_시앤피컨설팅",
            tier: "special",
            prizeType: "상품",
            amount: 500000,
            attribution: "후원",
            note: "갤럭시 워치9 (블루투스, 40mm)",
            selectLabel: "특별상_시앤피컨설팅 (갤럭시 워치9)"
        },
        {
            awardId: "sup_sp_3",
            award: "특별상_미래교육연구소",
            tier: "special",
            prizeType: "상품",
            amount: 500000,
            attribution: "후원",
            note: "다이슨 에어랩 i.d.™ 멀티 스타일러",
            selectLabel: "특별상_미래교육연구소 [다이슨 에어랩]"
        },
        {
            awardId: "sup_sp_4",
            award: "특별상_미래교육연구소",
            tier: "special",
            prizeType: "상품",
            amount: 500000,
            attribution: "후원",
            note: "BOSE QC 울트라 헤드폰 2세대",
            selectLabel: "특별상_미래교육연구소 [BOSE QC 울트라 헤드폰]"
        }
    ],
    "technology": [
        {
            awardId: "tech_top_1",
            award: "최우수",
            tier: "top",
            prizeType: "상금",
            amount: 1000000,
            attribution: "경영혁신실",
            note: "상금 100만원",
            selectLabel: "최우수 (상금 100만원)"
        },
        {
            awardId: "tech_run_1",
            award: "우수",
            tier: "runnerup",
            prizeType: "상금",
            amount: 600000,
            attribution: "경영혁신실",
            note: "상금 60만원",
            selectLabel: "우수 (상금 60만원)"
        },
        {
            awardId: "tech_enc_1",
            award: "장려",
            tier: "encouragement",
            prizeType: "상금",
            amount: 400000,
            attribution: "경영혁신실",
            note: "상금 40만원",
            selectLabel: "장려 [1] (상금 40만원)"
        },
        {
            awardId: "tech_enc_2",
            award: "장려",
            tier: "encouragement",
            prizeType: "상금",
            amount: 400000,
            attribution: "경영혁신실",
            note: "상금 40만원",
            selectLabel: "장려 [2] (상금 40만원)"
        },
        {
            awardId: "tech_sp_1",
            award: "특별상_대한상공회의소 단장",
            tier: "special",
            prizeType: "상금",
            amount: 1000000,
            attribution: "후원",
            note: "상금 100만원 (수상자 계좌이체)",
            selectLabel: "특별상_대한상공회의소 단장 (상금 100만원)"
        },
        {
            awardId: "tech_sp_2",
            award: "특별상_한국AI워크랩 대표",
            tier: "special",
            prizeType: "상품",
            amount: 500000,
            attribution: "후원",
            note: "LG 그램뷰 3세대 17인치",
            selectLabel: "특별상_한국AI워크랩 대표 (LG 그램뷰 17인치)"
        }
    ]
};

export const VOTE_SCORE_MAP = [10, 7, 4, 1];

export const INTRO_TEXTS = {
    "support": "이 섹션에서는 <strong>지원(Support) 부문</strong>(영업, 서비스, 경영, 생산/품질 등) 발표 과제를 평가합니다. 경영전략 연계성, AI·디지털 도구 활용도 및 개선 성과를 중심으로 채점해 주세요. 점수는 실시간으로 자동 저장됩니다.",
    "technology": "이 섹션에서는 <strong>기술(Technology) 부문</strong>(연구, 수리[IT·전기·전자 등]) 발표 과제를 평가합니다. 기술적 창의성, AI·데이터 기술 접목 수준, 성능 완성도 및 실용성을 중심으로 채점해 주세요. 점수는 실시간으로 자동 저장됩니다.",
    "6s": "이 섹션에서는 **6S 부문** 발표자들의 과제를 평가합니다. 각 평가 항목의 배점을 참고하여 점수를 입력해 주세요. 점수는 실시간으로 자동 저장 및 집계됩니다.",
    "six_sigma": "이 섹션에서는 **6시그마 부문** 발표자들의 과제를 평가합니다. DMAIC 단계별 평가 항목을 기준으로 점수를 입력해 주세요. 모든 점수는 자동으로 실시간 저장됩니다.",
    "rnd": "이 섹션에서는 **R&D 부문** 발표자들의 과제를 평가합니다. 주제 선정부터 실용성까지 각 항목을 신중하게 평가해 주시기 바랍니다.",
    "ai": "이 섹션에서는 **AI 부문** 발표자들의 과제를 평가합니다. 데이터 활용, 모델의 창의성 및 성능을 중심으로 평가를 진행해 주세요.",
    "results": "이곳에서는 모든 평가자들의 점수를 합산한 <strong>종합 결과</strong>를 부문별로 확인할 수 있습니다. 심사위원 평균 점수와 임직원 투표 환산 점수(1위 10점, 2위 7점, 3위 4점, 4위 1점)를 합산하여 순위 및 훈격이 산정됩니다.",
    "presentation_results": "이곳에서는 부문별 <strong>발표 결과</strong>를 세로형 막대 그래프로 확인할 수 있습니다. 부문을 선택하여 평균점수, 투표점수 및 훈격을 시각적으로 비교해보세요.",
    "live_vote_status": "이곳에서는 <strong>실시간 투표 현황</strong>을 확인할 수 있습니다. 왼쪽에는 부문별 실시간 득표 현황이 차트로 표시되고, 오른쪽에는 득표 순위에 따른 환산 점수(10 / 7 / 4 / 1점)가 표시됩니다.",
    "detailed_results": "이곳에서는 각 평가자가 발표자별, 항목별로 부여한 모든 점수와 심사평을 상세하게 확인할 수 있습니다.",
    "voter_detailed_results": "이곳에서는 각 투표자가 부문별로 어떤 발표자에게 투표했는지 상세 내역을 확인할 수 있습니다.",
    "final_results": "이곳에서는 집계된 <strong>최종 결과 및 부문별 훈격(특별상 포함)</strong>을 확인하고, 필요한 경우 드롭다운 선택이나 직접 입력을 통해 조정한 뒤 시상식 화면에 즉시 동기화할 수 있습니다.",
    "excellent_presenters": "행사에 참여하신 여러분이 발표 내용과 추진 성과를 종합적으로 판단하여 가장 우수하다고 생각하는 과제를 <strong>각 부문별로 1개씩</strong> 선택해 주세요."
};
