import { getHymnListText } from './hymns.js'

export const SERMON_STEP_ITEMS = {
  narrative: [
    { key: 'context', label: '전후 문맥', text: '- 본문의 전후 문맥' },
    { key: 'position', label: '위치와 역할', text: '- 해당 성경책에서의 위치와 역할' },
    { key: 'structure', label: '서사 구조', text: '- 서사 구조적 의미와 흐름' },
    { key: 'canonical', label: '정경 신학', text: '- 정경 전체에서의 신학적 위치' },
  ],
  original: [
    { key: 'source', label: '원어 텍스트 기반', text: '- 구약이면 BHS(히브리어), 신약이면 NA28(헬라어)와 LXX 기반' },
    { key: 'parsing', label: '주요구절 파싱', text: '- 본문 주요 구절의 문법적 파싱 (동사의 시제·법·태·인칭·수, 명사의 격·수·성 등 원어 문법 구조 분석)' },
    { key: 'words', label: '주요 단어 분석', text: '- 주요 단어와 문구의 원어 분석' },
    { key: 'usage', label: '신구약 용례', text: '- 신구약 성경에서의 용례 비교' },
    { key: 'meaning', label: '신학적 함의', text: '- 어근과 의미의 신학적 함의' },
  ],
  message: [
    { key: 'christology', label: '기독론적 관점', text: '- 기독론적 관점: 이 본문이 그리스도를 어떻게 가리키는지, 대표적인 신학자들(칼빈, 루터, 바르트, 라이트 등)과 설교가들이 이 본문을 기독론적으로 어떻게 해석해 왔는지 구체적으로 설명' },
    { key: 'original_audience', label: '최초 청중 메시지', text: '- 최초 청중 메시지: 본문이 원래 청중에게 전달하려 한 메시지' },
    { key: 'today', label: '오늘날 메시지', text: '- 오늘날 메시지: 오늘날 교회와 신자에게 전하는 메시지' },
  ],
  lesson: [
    { key: 'god', label: '하나님 성품', text: '- 하나님의 성품과 사역에 대한 교훈' },
    { key: 'jesus', label: '예수님의 실천적 모범', text: '- 예수님이 이 본문에서 보여주시는 실천적 모범' },
    { key: 'human', label: '인간 본성', text: '- 인간의 본성과 반응에 대한 교훈' },
    { key: 'lessons', label: '본문의 교훈', text: '- 본문에서 도출할 수 있는 핵심 교훈 5가지 (각 교훈을 간결하게 제목으로 제시하고 설명)' },
  ],
  text_study: [
    { key: 'main_theme', label: '주요 신학적 주제', text: '- 본문의 주요 신학적 주제' },
    { key: 'history', label: '신학적 해석 역사', text: '- 신학적 해석 역사: 교부, 중세, 개혁신학, 근대 주요 신학자들이 이 본문을 어떻게 해석해 왔는지 구체적으로 설명' },
    { key: 'modern', label: '현대 신학자 해석', text: '- 현대 주요 신학자들의 해석: 대표적인 현대 신학자들이 이 본문을 어떻게 해석하는지 구체적으로 설명' },
    { key: 'rabbi', label: '정통 랍비 해석', text: '- 정통 랍비 해석: 유대교 정통 랍비 전통에서 이 본문(또는 해당 구약 본문)을 어떻게 해석해 왔는지 설명' },
  ],
  research: [
    { key: 'literary', label: '문학적 관점', text: '- 문학적 관점: 문학 비평가의 틀로 본문의 장르, 문체, 서사 구조, 수사법이 본문 의미에 어떻게 기여하는지 해석' },
    { key: 'historical', label: '역사적 관점', text: '- 역사적 관점: 역사가의 해석학적 틀로 본문의 사건과 의미를 해석 (고고학적 사실 규명이 아닌 역사적 해석학)' },
    { key: 'philosophical', label: '철학적 관점', text: '- 철학적 관점: 철학자의 틀로 본문이 담고 있는 세계관, 존재론, 윤리적 함의를 해석' },
    { key: 'sociological', label: '사회학적 관점', text: '- 사회학적 관점: 사회학자의 틀로 당시 사회 구조, 권력 관계, 문화적 맥락이 본문 의미에 미치는 영향을 해석' },
    { key: 'psychological', label: '심리학적 관점', text: '- 심리학적 관점: 심리학자의 틀로 본문 인물의 내면 동기, 감정, 행동 패턴을 해석' },
  ],
  illustration: [
    { key: 'biblical', label: '성경 예화', text: '- 성경 예화: 본문과 연결되는 구약 예화 2개, 신약 예화 2개 (각 예화마다 본문과 연결되는 이유 설명)' },
    { key: 'historical', label: '역사적 사건', text: '- 역사적 사건: 본문과 연결되는 국내 역사적 사건 2개, 국외 역사적 사건 2개 (각 사건마다 본문과 연결되는 이유 설명)' },
    { key: 'literary', label: '문학 예화', text: '- 문학 예화: 본문과 연결되는 국내 문학 작품 예화 2개, 국외 문학 작품 예화 2개 (각 예화마다 본문과 연결되는 이유 설명)' },
    { key: 'modern', label: '현대 언론 예화', text: '- 현대 언론 예화: 레거시 언론에 보도된 사건사고에서 볼 수 있는 현대인의 삶 예화 2개 (각 예화마다 본문과 연결되는 이유 설명)' },
  ],
  hymns: [
    { key: 'before_hymn', label: '설교 전 찬송가', text: '- 설교 전 찬송가 1곡 (대한찬송가공회 2006년 발행, 총 645장 기준으로 번호, 제목, 선택 이유)' },
    { key: 'before_ccm', label: '설교 전 CCM', text: '- 설교 전 CCM 1곡 (제목, 아티스트, 선택 이유)' },
    { key: 'after_hymn', label: '설교 후 찬송가', text: '- 설교 후 찬송가 1곡 (대한찬송가공회 2006년 발행, 총 645장 기준으로 번호, 제목, 선택 이유)' },
    { key: 'after_ccm', label: '설교 후 CCM', text: '- 설교 후 CCM 1곡 (제목, 아티스트, 선택 이유)' },
    { key: 'explanation', label: '연결 설명', text: '- 각 곡이 본문 메시지와 어떻게 연결되는지, 예배 흐름에서 어떤 역할을 하는지 설명' },
  ],
  application: [
    { key: 'personal', label: '개인 적용', text: '- 개인 적용: 지금까지의 해설(원어, 역사적 배경, 신학적 의미, 교훈)을 바탕으로 개인 신앙 생활에 구체적으로 어떻게 적용할 수 있는지 제시' },
    { key: 'community', label: '공동체 적용', text: '- 공동체 적용: 지금까지의 해설을 바탕으로 교회 공동체가 함께 실천하거나 변화해야 할 내용을 구체적으로 제시' },
    { key: 'social', label: '사회 적용', text: '- 사회 적용: 지금까지의 해설을 바탕으로 사회와 세상을 향해 이 본문이 요구하는 실천을 구체적으로 제시' },
    { key: 'practical', label: '구체적 실천', text: '- 구체적 실천: 지금까지의 해설에서 도출한 이번 주 바로 실천할 수 있는 구체적 행동 3~5가지 제시' },
  ],
}

export const WORSHIP_STEP_ITEMS = {
  call_verse: [
    { key: 'verse', label: '추천 구절', text: '- 예배의 부름으로 적합한 구절 1~2개 추천 (장절 + 본문 전체)' },
    { key: 'lectionary', label: '성경정과 참조', text: '- 해당 주일의 성서정과 본문을 참조하여 구절 선택' },
    { key: 'calendar', label: '교회력 참조', text: '- 현재 교회력 절기(대강절/성탄절/주현절/사순절/부활절/성령강림절 등)에 맞게 선택' },
    { key: 'season', label: '계절 참조', text: '- 자연 계절(봄/여름/가을/겨울)의 분위기를 반영하여 선택' },
  ],
  call_prayer: [
    { key: 'lectionary', label: '성경정과 참조', text: '- 해당 주일의 성서정과 본문을 기도문에 반영' },
    { key: 'calendar', label: '교회력 참조', text: '- 현재 교회력 절기에 맞는 기도문 작성' },
    { key: 'season', label: '계절 참조', text: '- 자연 계절 분위기를 기도문에 담아 작성' },
  ],
  confession: [],
  forgiveness: [],
  worship_prayer: [],
  offering: [],
  responsive_reading: [
    { key: 'lectionary', label: '성경정과 참조', text: '- 해당 주일의 성서정과 본문과 연결되는 교독문 선택' },
    { key: 'calendar', label: '교회력 참조', text: '- 현재 교회력 절기에 맞는 교독문 선택' },
    { key: 'full', label: '교독문 전문', text: '- 선택한 교독문 전문 (인도자/회중 구분하여 작성)' },
  ],
  opening_hymns: [
    { key: 'hymnal', label: '찬송가', text: '- 찬송가에서 예배를 여는 곡 1~2곡 추천 (대한찬송가공회 2006년 발행, 총 645장 기준으로 번호, 제목, 선택 이유)' },
    { key: 'ccm', label: 'CCM', text: '- 예배를 여는 CCM 1~2곡 추천 (제목, 아티스트, 선택 이유)' },
  ],
  pre_sermon_hymns: [
    { key: 'hymnal', label: '찬송가', text: '- 찬송가에서 설교 전 곡 1~2곡 추천 (대한찬송가공회 2006년 발행, 총 645장 기준으로 번호, 제목, 선택 이유)' },
    { key: 'ccm', label: 'CCM', text: '- 설교 전 CCM 1~2곡 추천 (제목, 아티스트, 선택 이유)' },
  ],
  post_sermon_hymns: [
    { key: 'hymnal', label: '찬송가', text: '- 찬송가에서 설교 후 응답/결단 곡 1~2곡 추천 (대한찬송가공회 2006년 발행, 총 645장 기준으로 번호, 제목, 선택 이유)' },
    { key: 'ccm', label: 'CCM', text: '- 설교 후 응답/결단을 위한 CCM 1~2곡 추천 (제목, 아티스트, 선택 이유)' },
  ],
  benediction: [],
  sending: [
    { key: 'verse', label: '추천 구절', text: '- 파송에 어울리는 성경구절 1개 추천 (장절 + 본문)' },
    { key: 'declaration', label: '파송 선언문', text: '- 세상으로 나아가는 파송 선언문 (3~5줄)' },
  ],
}

export const DAWN_STEP_ITEMS = {
  exposition: [
    { key: 'intro', label: '본문 소개/배경', text: '- 본문의 역사적·문학적 배경을 간략히 서술' },
    { key: 'message', label: '핵심 내용 해설', text: '- 본문의 핵심 내용을 해설하듯 풀어서 서술' },
    { key: 'closing', label: '마무리 서술', text: '- 본문이 전하는 의미와 통찰로 마무리' },
  ],
  core_message: [
    { key: 'proclamation', label: '핵심 메시지', text: '- 이 본문이 전하는 단 하나의 핵심 메시지를 명확하게 서술' },
    { key: 'points', label: '핵심 포인트', text: '- 그 메시지를 뒷받침하는 핵심 포인트 2~3가지를 설명하듯 서술' },
    { key: 'closing', label: '마무리', text: '- 핵심 메시지를 정리하며 마무리' },
  ],
  meditation: [
    { key: 'intro', label: '도입', text: '- 본문의 핵심 주제를 묵상의 출발점으로 제시' },
    { key: 'questions', label: '묵상 질문', text: '- 깊이 생각해 볼 묵상 질문 2~3개 (질문 후 짧은 해설 포함)' },
    { key: 'verse', label: '핵심 구절', text: '- 반복해서 되새길 핵심 구절 1개와 그 의미 서술' },
  ],
  application: [
    { key: 'action', label: '실천 적용', text: '- 이 본문에서 도출되는 구체적인 실천 적용 (가정/직장/교회/이웃 중 한 영역)' },
    { key: 'connection', label: '본문 연결', text: '- 그 적용이 본문 어디에서 나오는지 설명' },
    { key: 'closing', label: '마무리', text: '- 본문이 이끄는 결단의 방향을 서술하며 마무리 (짧은 기도문 한 줄 포함)' },
  ],
  prayer_topics: [
    { key: 'personal', label: '개인 기도', text: '- 개인 기도 (본문 말씀을 내 삶에 적용하는 기도)' },
    { key: 'church', label: '교회 기도', text: '- 교회 공동체를 위한 기도' },
    { key: 'nation', label: '나라와 이웃', text: '- 나라와 이웃을 위한 기도' },
  ],
  hymn: [
    { key: 'hymnal', label: '찬송가 추천', text: '- 찬송가 1곡 (대한찬송가공회 2006년 발행, 총 645장 기준으로 번호, 제목, 이 본문과 연결되는 이유 2~3줄)' },
    { key: 'ccm', label: 'CCM 추천', text: '- CCM 1곡 (제목, 아티스트, 이 본문과 연결되는 이유 2~3줄)' },
  ],
}

function buildItems(items, selectedKeys) {
  const list = selectedKeys ? items.filter(i => selectedKeys.includes(i.key)) : items
  return list.map(i => i.text).filter(Boolean).join('\n')
}

const SERMON_STEP_PROMPTS = {
  narrative: (passage, lang, bible, selectedKeys = null) => `
당신은 성경 신학자입니다. 다음 성경 본문에 대해 서사적 관점에서 해설해 주세요.
A4 용지 3~4매 분량(약 2,500~4,000자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음을 포함하세요:
${buildItems(SERMON_STEP_ITEMS.narrative, selectedKeys)}
`,
  text_study: (passage, lang, bible, selectedKeys = null) => `
당신은 성경 신학 전문가입니다. 다음 본문을 신학적으로 깊이 연구해 주세요.
A4 용지 3~4매 분량(약 2,500~4,000자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음을 포함하세요:
${buildItems(SERMON_STEP_ITEMS.text_study, selectedKeys)}
`,
  original: (passage, lang, bible, selectedKeys = null) => `
당신은 성경 원어 전문가입니다. 다음 본문을 원어로 해설해 주세요.
A4 용지 3~4매 분량(약 2,500~4,000자)으로 상세하게 작성해 주세요.

[원어 표기 원칙]
히브리어 단어나 헬라어 단어를 언급할 때는 반드시 원어 문자를 직접 표기하고, 괄호 안에 한글 음가를 함께 표기하세요.
예시) 히브리어: אֱלֹהִים (엘로힘), 헬라어: λόγος (로고스)
원어 문자 없이 한글 설명만 쓰지 마세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음을 포함하세요:
${buildItems(SERMON_STEP_ITEMS.original, selectedKeys)}
`,
  message: (passage, lang, bible, selectedKeys = null) => `
앞서 분석한 내용을 바탕으로 이 본문이 전하는 핵심 메시지를 정리해 주세요.
A4 용지 3~4매 분량(약 2,500~4,000자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

${buildItems(SERMON_STEP_ITEMS.message, selectedKeys)}
`,
  lesson: (passage, lang, bible, selectedKeys = null) => `
이 본문에서 배울 수 있는 신앙적 교훈을 정리해 주세요.
A4 용지 3~4매 분량(약 2,500~4,000자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

${buildItems(SERMON_STEP_ITEMS.lesson, selectedKeys)}
`,
  research: (passage, lang, bible, selectedKeys = null) => `
이 본문을 다양한 학문적 관점으로 확장 연구해 주세요.
A4 용지 3~4매 분량(약 2,500~4,000자)으로 상세하게 작성해 주세요.

각 관점은 해당 분야 전문가(문학 비평가, 역사가, 철학자, 사회학자, 심리학자)가 실제로 사용하는 분석 틀과 개념을 활용하여, 그 관점에서 본문이 어떤 의미를 갖는지 해석하세요. 단순한 배경 나열이 아니라 전문가적 해석이어야 합니다.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음 관점을 포함하세요:
${buildItems(SERMON_STEP_ITEMS.research, selectedKeys)}
`,
  illustration: (passage, lang, bible, selectedKeys = null) => `
당신은 설교 전문가입니다. 다음 본문의 메시지를 효과적으로 전달할 수 있는 예화를 제시해 주세요.
A4 용지 3~4매 분량(약 2,500~4,000자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음을 포함하세요:
${buildItems(SERMON_STEP_ITEMS.illustration, selectedKeys)}
`,
  hymns: (passage, lang, bible, selectedKeys = null) => `
당신은 교회 음악 전문가입니다. 다음 설교 본문의 메시지에 어울리는 찬송과 CCM을 선별해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}
찬송가 기준: 대한찬송가공회 2006년 발행 찬송가 (총 645장)

[대한찬송가공회 찬송가 전체 목록 - 반드시 이 목록의 번호와 제목을 그대로 사용하세요]
${getHymnListText()}

다음을 포함하세요:
${buildItems(SERMON_STEP_ITEMS.hymns, selectedKeys)}
`,
  application: (passage, lang, bible, selectedKeys = null) => `
지금까지의 해설을 종합하여 오늘날 삶에 적용하는 내용을 작성해 주세요.
A4 용지 3~4매 분량(약 2,500~4,000자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

${buildItems(SERMON_STEP_ITEMS.application, selectedKeys)}
`,
}

const SERMON_STEP_PROMPTS_WITH_EMPHASIS = {
  narrative: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.narrative(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  text_study: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.text_study(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  original: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.original(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  message: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.message(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  lesson: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.lesson(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  research: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.research(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  illustration: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.illustration(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  hymns: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.hymns(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  application: (passage, emphasis, lang, bible, selectedKeys) =>
    SERMON_STEP_PROMPTS.application(passage, lang, bible, selectedKeys) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
}

const WORSHIP_STEP_PROMPTS = {
  call_verse: (date, season, lectionary, lang, bible, selectedKeys = null) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[예배의 부름 성경구절]
${buildItems(WORSHIP_STEP_ITEMS.call_verse, selectedKeys)}
`,
  call_prayer: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[예배의 부름 기도문]
절기 분위기를 담아 회중을 예배로 부르는 기도문을 작성해 주세요. (15~22줄 분량)
진행 지시어나 괄호 안 설명 없이 바로 낭독할 수 있는 기도문 본문만 작성하세요.
`,
  confession: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[참회의 기도문]
해당 절기에 맞는 참회의 기도문을 작성해 주세요. (15~22줄 분량)
말과 생각과 행동, 그리고 마땅히 해야 할 일을 하지 않은 태만까지, 구체적인 죄의 영역을 짚어 주세요.
단, 특정 개인이나 상황에 국한되지 않고 누구나 공감할 수 있는 일반적인 언어로 작성하세요.
삶의 반성과 진실한 회개의 내용이 담기도록 하세요.
진행 지시어나 괄호 안 설명 없이 바로 낭독할 수 있는 기도문 본문만 작성하세요.
`,
  forgiveness: (date, season, lectionary, lang, bible, selectedKeys = null) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[용서의 선언 성경구절]
위 날짜·절기·성서정과와 어울리는 하나님의 용서와 사죄를 선언하는 성경구절을 3~5개 제시해 주세요.
각 구절마다 다음 형식으로 작성하세요:

구절 참조 (예: 요한일서 1:9)
구절 전문 (${bible || '개역개정성경'} 기준)
→ 이 구절이 용서의 선언으로 적합한 이유 한 줄

구약과 신약을 골고루 포함하고, 예배 중 회중 앞에서 낭독하기에 적합한 구절로 선별하세요.
${buildItems(WORSHIP_STEP_ITEMS.forgiveness, selectedKeys)}
`,
  worship_prayer: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[예배를 위한 기도문]
다음 순서로 구성된 기도문을 45~60줄 분량으로 작성해 주세요.
1. 찬양 - 하나님의 성품과 위대하심을 높임
2. 감사 - 절기와 삶 속에서 베푸신 은혜에 감사
3. 회개 - 말씀 앞에 나아가기 전 죄를 고백하고 용서를 구함
4. 중보 - 국가와 지도자, 사회의 연약한 이웃, 교회와 오늘의 예배를 위해 기도
5. 간구 - 각 가정과 성도 개인의 필요를 위해 기도
진행 지시어나 괄호 안 설명 없이 바로 낭독할 수 있는 기도문 본문만 작성하세요.
`,
  offering: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[봉헌기도문]
헌금의 감사와 절기 정신을 담은 봉헌기도문을 작성해 주세요. (12~18줄 분량)
진행 지시어나 괄호 안 설명 없이 바로 낭독할 수 있는 기도문 본문만 작성하세요.
`,
  responsive_reading: (date, season, lectionary, lang, bible, selectedKeys = null) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[교독문]
반드시 찬송가공회(한국찬송가공회)에서 발행한 찬송가 뒤에 수록된 교독문만을 참고하세요.
${buildItems(WORSHIP_STEP_ITEMS.responsive_reading, selectedKeys)}
`,
  opening_hymns: (date, season, lectionary, lang, bible, selectedKeys = null) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[대한찬송가공회 찬송가 전체 목록 - 반드시 이 목록의 번호와 제목을 그대로 사용하세요]
${getHymnListText()}

[예배를 여는 찬양]
예배를 시작하며 회중의 마음을 하나님께 향하게 하는 찬양을 추천해 주세요.
${buildItems(WORSHIP_STEP_ITEMS.opening_hymns, selectedKeys)}
`,
  pre_sermon_hymns: (date, season, lectionary, lang, bible, selectedKeys = null) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[대한찬송가공회 찬송가 전체 목록 - 반드시 이 목록의 번호와 제목을 그대로 사용하세요]
${getHymnListText()}

[설교전찬양]
설교를 앞두고 회중이 말씀을 받을 준비를 하도록 돕는 찬양을 추천해 주세요.
${buildItems(WORSHIP_STEP_ITEMS.pre_sermon_hymns, selectedKeys)}
`,
  post_sermon_hymns: (date, season, lectionary, lang, bible, selectedKeys = null) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[대한찬송가공회 찬송가 전체 목록 - 반드시 이 목록의 번호와 제목을 그대로 사용하세요]
${getHymnListText()}

[설교후찬양]
설교 후 회중이 말씀에 응답하고 결단하도록 돕는 찬양을 추천해 주세요.
${buildItems(WORSHIP_STEP_ITEMS.post_sermon_hymns, selectedKeys)}
`,
  benediction: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[축도]
다음 형식을 반드시 따르세요:
"주 예수 그리스도의 은혜와, [절기/말씀에 담긴 하나님의 성품]하나님의 사랑과, [절기/예배 흐름에 어울리는 표현]성령의 위로(교통)하심이 [오늘 이 자리에 모인/예배드린] 성도 위에 함께 하시기를 축원하노라."
삼위 각각의 수식어를 절기와 오늘 말씀에 어울리게 채워 주세요. (전체 5~8줄 분량)
진행 지시어나 괄호 안 설명 없이 바로 낭독할 수 있는 축도문 본문만 작성하세요.
`,
  sending: (date, season, lectionary, lang, bible, selectedKeys = null) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[파송의 말씀]
${buildItems(WORSHIP_STEP_ITEMS.sending, selectedKeys)}
`,
}

const DAWN_STEP_PROMPTS = {
  exposition: (passage, lang, bible, seriesCtx, selectedKeys = null) => `
당신은 성경 해설서를 집필하는 신학 저술가입니다. 아래 본문을 해설 에세이 형식으로 서술하세요.
형식: 출판된 성경 묵상집에 실리는 해설 글. 독자 호칭(여러분·우리·성도 등) 없음. "~이다", "~한다", "~된다" 서술체만 사용.
분량: 약 1,200~1,800자.

본문: ${passage}
번역본: ${bible || '개역개정성경'}
언어: ${lang === 'ko' ? '한국어' : 'English'}
${seriesCtx ? `\n${seriesCtx}` : ''}

${buildItems(DAWN_STEP_ITEMS.exposition, selectedKeys)}
`,
  core_message: (passage, lang, bible, seriesCtx, selectedKeys = null) => `
당신은 성경 해설서를 집필하는 신학 저술가입니다. 이 본문의 핵심 주제를 해설 에세이로 서술하세요.
형식: 출판된 성경 묵상집의 핵심 메시지 페이지. 독자 호칭(여러분·우리·성도 등) 없음. "~이다", "~한다" 서술체만 사용.
분량: 약 900~1,200자.

본문: ${passage}
번역본: ${bible || '개역개정성경'}
언어: ${lang === 'ko' ? '한국어' : 'English'}
${seriesCtx ? `\n${seriesCtx}` : ''}

${buildItems(DAWN_STEP_ITEMS.core_message, selectedKeys)}
`,
  meditation: (passage, lang, bible, seriesCtx, selectedKeys = null) => `
당신은 성경 해설서를 집필하는 신학 저술가입니다. 이 본문을 묵상 에세이로 서술하세요.
형식: 출판된 성경 묵상집의 묵상 페이지. 독자 호칭(여러분·우리·성도 등) 없음. "~이다", "~한다" 서술체만 사용.
분량: 약 900~1,200자.

본문: ${passage}
번역본: ${bible || '개역개정성경'}
언어: ${lang === 'ko' ? '한국어' : 'English'}

${buildItems(DAWN_STEP_ITEMS.meditation, selectedKeys)}
`,
  application: (passage, lang, bible, seriesCtx, selectedKeys = null) => `
당신은 성경 해설서를 집필하는 신학 저술가입니다. 이 본문의 삶의 적용을 해설 에세이로 서술하세요.
형식: 출판된 성경 묵상집의 적용 페이지. 독자 호칭(여러분·우리·성도 등) 없음. "~이다", "~한다" 서술체만 사용.
분량: 약 900~1,200자.

본문: ${passage}
번역본: ${bible || '개역개정성경'}
언어: ${lang === 'ko' ? '한국어' : 'English'}

${buildItems(DAWN_STEP_ITEMS.application, selectedKeys)}
`,
  prayer_topics: (passage, lang, bible, seriesCtx, selectedKeys = null) => `
당신은 새벽 기도회를 섬기는 목회자입니다. 오늘 본문을 중심으로 성도들이 함께 기도할 내용을 작성해 주세요.
약 800~1,100자, 성도들이 바로 따라 기도할 수 있는 실제 기도문 형식으로 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

${buildItems(DAWN_STEP_ITEMS.prayer_topics, selectedKeys)}
- 각 기도는 4~6문장, 성도들이 마음으로 따라할 수 있는 언어로
`,
  hymn: (passage, lang, bible, seriesCtx, selectedKeys = null) => `
당신은 교회 음악을 잘 아는 목회자입니다. 오늘 새벽 기도 본문에 가장 잘 어울리는 찬송을 추천해 주세요.
간결하고 실용적으로, 목회자가 바로 선곡에 참고할 수 있게 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}
찬송가 기준: 대한찬송가공회 2006년 발행 찬송가 (총 645장)

[대한찬송가공회 찬송가 전체 목록 - 반드시 이 목록의 번호와 제목을 그대로 사용하세요]
${getHymnListText()}

${buildItems(DAWN_STEP_ITEMS.hymn, selectedKeys)}
`,
}

export async function generateSermonStep(stepKey, passage, emphasis, lang, bible, seriesCtx, onChunk, selectedItems = null, userKeyword = '', customText = '') {

  const prompt = SERMON_STEP_PROMPTS_WITH_EMPHASIS[stepKey]?.(passage, emphasis, lang, bible, selectedItems)
  let fullPrompt = seriesCtx
    ? prompt + `\n\n${seriesCtx}\n\n[강해설교 연속성 지침]\n- 위 이전 설교들의 본문 흐름과 신학적 주제를 반드시 파악하세요.\n- 이번 본문이 시리즈 전체에서 어떤 위치에 있는지 의식하며 작성하세요.\n- 이전 설교에서 다룬 내용을 반복하지 말고, 자연스럽게 그 위에 쌓아가세요.\n- 회중이 앞 설교의 흐름을 기억하며 이번 말씀을 들을 수 있도록 연결 고리를 살려 주세요.`
    : prompt
  fullPrompt += `\n\n[문체 지침]\n모든 내용은 "~이다", "~한다" 형식의 평서체(이다체)로 작성하세요. "~입니다", "~합니다" 등의 존댓말은 사용하지 마세요.\n\n[중복 지양 지침]\n이 결과는 설교 준비의 여러 단계 중 하나입니다. 본문 소개나 배경 설명을 서론으로 반복하지 마세요. 이 단계 고유의 내용에 바로 집중하여 작성하세요.`
  if (customText) fullPrompt += `\n${customText}`
  if (userKeyword) fullPrompt += `\n\n[필수 반영 — 아래 키워드/지시를 결과에 반드시 명확하게 담으세요]: ${userKeyword}`
  return streamCompletion(fullPrompt, onChunk)
}

export async function generateWorshipCombined(date, season, lectionary, lang, bible, stepSelectedItems, onChunk, userKeyword = '', customStepTexts = {}) {

  // 단계별로 선택된 지시항목을 사용해 동적으로 프롬프트 구성
  const sel = (key) => {
    const items = WORSHIP_STEP_ITEMS[key] || []
    if (items.length === 0) return ''
    const selected = stepSelectedItems?.[key]
    return buildItems(items, selected ?? items.map(i => i.key))
  }

  let prompt = `예배 인도자를 위한 완성된 주일 예배 가이드를 A4 3~4장 분량(약 4,000~5,500자)으로 작성해 주세요.
각 순서별로 예배에서 바로 사용할 수 있게 실용적으로 작성해 주세요.
기도문과 축도문은 진행 지시어나 괄호 안 설명 없이 바로 낭독할 수 있는 본문만 작성하세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

다음 예배 순서를 모두 포함하세요:

[1. 예배의 부름 성경구절]
${sel('call_verse')}

[2. 예배의 부름 기도문]
- 절기 분위기를 담아 회중을 예배로 부르는 기도문 (8~12줄)

[3. 예배를 여는 찬양]
- 예배를 시작하며 회중의 마음을 하나님께 향하게 하는 찬양 추천
${sel('opening_hymns')}

[4. 참회의 기도문]
- 해당 절기에 맞는 참회의 기도문 (8~12줄)
- 말과 생각과 행동, 마땅히 해야 할 일을 하지 않은 태만까지 구체적인 죄의 영역을 짚되, 누구나 공감할 수 있는 일반적인 언어로 작성

[5. 용서의 선언]
${sel('forgiveness')}

[6. 교독문]
반드시 찬송가공회(한국찬송가공회) 찬송가 뒤에 수록된 교독문만을 참고하세요.
${sel('responsive_reading')}

[7. 설교전찬양]
- 설교를 앞두고 회중이 말씀을 받을 준비를 하도록 돕는 찬양 추천
${sel('pre_sermon_hymns')}

[8. 예배를 위한 기도문]
- 찬양 → 감사 → 회개 → 중보(국가/사회/교회/예배) → 간구(가정/성도의 필요) 순서로 구성 (45~60줄)

[9. 봉헌기도문]
- 헌금의 감사와 절기 정신을 담은 봉헌기도문 (8~12줄)

[10. 설교후찬양]
- 설교 후 회중이 말씀에 응답하고 결단하도록 돕는 찬양 추천
${sel('post_sermon_hymns')}

[11. 파송의 말씀]
${sel('sending')}

[12. 축도]
- "주 예수 그리스도의 은혜와, ~~~하나님의 사랑과, ~~~성령의 위로(교통)하심이 ~~~ 성도 위에 함께 하시기를 축원하노라" 형식으로 작성. 삼위 각각의 수식어를 절기와 말씀에 맞게 채울 것. (8~12줄)
`
  const extraCustom = Object.values(customStepTexts).filter(Boolean).join('\n')
  if (extraCustom) prompt += `\n\n[추가 지시항목]\n${extraCustom}`
  if (userKeyword) prompt += `\n[필수 반영 — 아래 키워드/지시를 결과에 반드시 명확하게 담으세요]: ${userKeyword}`
  return streamCompletion(prompt, onChunk)
}

const DAWN_STYLE_SYSTEM = '절대로 "사랑하는 여러분", "함께", "~해 봅시다", "~하십시오", "~하세요" 같은 구어체·청중 호칭 표현을 사용하지 마세요. 모든 내용은 문어체(해설체)로, 독자가 혼자 읽으며 이해할 수 있는 산문으로 서술하세요.'

export async function generateDawnCombined(passage, emphasis, lang, bible, seriesCtx, stepSelectedItems, onChunk, userKeyword = '', customStepTexts = {}) {

  const sel = (key) => {
    const items = DAWN_STEP_ITEMS[key] || []
    if (items.length === 0) return ''
    const selected = stepSelectedItems?.[key]
    return buildItems(items, selected ?? items.map(i => i.key))
  }

  let prompt = `아래 본문을 바탕으로 새벽 기도회 전체 순서에 사용할 수 있는 말씀 자료를 A4 3~4장 분량(약 4,000~5,500자)으로 문어체로 작성해 주세요.
"사랑하는 여러분", "~해 봅시다", "~하십시오" 같은 구어체·청중 호칭은 절대 사용하지 말고, 설명하듯·해설하듯 서술하는 문어 산문으로 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}
${seriesCtx ? `\n${seriesCtx}\n이 시리즈의 흐름을 이어가는 내용을 써 주세요.` : ''}
${emphasis ? `\n강조하고 싶은 주제: ${emphasis}` : ''}

다음 내용을 모두 포함하세요:

[1. 본문 해설]
${sel('exposition')}
- 문어체 해설 형식으로 작성

[2-4. 핵심 메시지 · 묵상 · 적용]
아래 구조를 두 번 반복하세요. 첫 번째 핵심 메시지를 전한 뒤, 바로 이어서 그에 따른 묵상 안내와 적용을 제시합니다. 그 다음 두 번째 핵심 메시지와 그에 따른 묵상·적용을 이어서 작성합니다.

[핵심 메시지 1]
${sel('core_message')}

[묵상 1]
${sel('meditation')}

[적용 1]
${sel('application')}

[핵심 메시지 2]
${sel('core_message')}

[묵상 2]
${sel('meditation')}

[적용 2]
${sel('application')}

[5. 기도 제목]
${sel('prayer_topics')}
- 각 기도는 4~6문장, 성도들이 마음으로 따라할 수 있는 언어로

[6. 찬송 추천]
${sel('hymn')}
`
  const extraCustom = Object.values(customStepTexts).filter(Boolean).join('\n')
  if (extraCustom) prompt += `\n\n[추가 지시항목]\n${extraCustom}`
  if (userKeyword) prompt += `\n[필수 반영 — 아래 키워드/지시를 결과에 반드시 명확하게 담으세요]: ${userKeyword}`
  return streamCompletion(prompt, onChunk, DAWN_STYLE_SYSTEM)
}

export async function generateWorshipStep(stepKey, date, season, lectionary, lang, bible, onChunk, selectedItems = null, userKeyword = '') {

  let prompt = WORSHIP_STEP_PROMPTS[stepKey]?.(date, season, lectionary, lang, bible, selectedItems)
  if (userKeyword) prompt += `\n\n[필수 반영 — 아래 키워드/지시를 결과에 반드시 명확하게 담으세요]: ${userKeyword}`
  return streamCompletion(prompt, onChunk)
}

export async function generateDawnStep(stepKey, passage, emphasis, lang, bible, seriesCtx, onChunk, selectedItems = null, userKeyword = '') {

  const promptFn = DAWN_STEP_PROMPTS[stepKey]
  if (!promptFn) throw new Error('Unknown step key: ' + stepKey)
  const base = promptFn(passage, lang, bible, seriesCtx, selectedItems)
  let prompt = emphasis ? base + `\n\n강조하고 싶은 주제: ${emphasis}` : base
  if (userKeyword) prompt += `\n\n[필수 반영 — 아래 키워드/지시를 결과에 반드시 명확하게 담으세요]: ${userKeyword}`
  const extra = ['exposition', 'core_message', 'meditation', 'application'].includes(stepKey) ? DAWN_STYLE_SYSTEM : ''
  return streamCompletion(prompt, onChunk, extra)
}

export async function executeInlineCommand(instruction, contextBefore, contextAfter, lang, bible, passage, title, onChunk) {

  const bibleRef = bible || (lang === 'en' ? 'ESV' : '개역개정')
  const sermonInfo = [
    passage ? `설교 본문: ${passage}` : '',
    title ? `설교 제목: ${title}` : '',
  ].filter(Boolean).join('\n')

  const prompt = `당신은 설교 작성 전문가입니다.

아래 설교문의 지정된 위치에 들어갈 내용을 생성해 주세요.
모든 답변은 반드시 설교 본문 말씀을 중심으로 작성하세요.

${sermonInfo}

[지시사항]: ${instruction}

[앞 문맥]
${contextBefore.slice(-600)}

[뒤 문맥]
${contextAfter.slice(0, 600)}

생성된 내용만 출력하세요. 별도 설명이나 머리말 없이.
[사용 성경]: ${bibleRef}`

  return streamCompletion(prompt, onChunk)
}

export async function refineDraft(draft, lang, bible, onChunk) {

  const bibleRef = bible || (lang === 'en' ? 'ESV' : '개역개정')
  const prompt = lang === 'en'
    ? `You are a sermon writing expert.

Below is a sermon draft assembled from multiple research stages. Please refine it into a single, naturally flowing sermon.

[Principles]
- Preserve the original order and core content
- Connect paragraph transitions naturally
- Remove duplicate expressions (keep only once)
- Do not add or delete content arbitrarily
- Ensure it reads as a coherent, well-structured sermon
[Bible version]: ${bibleRef}

[Sermon draft]
${draft}`
    : `당신은 설교 작성 전문가입니다.

아래는 여러 단계에서 작성된 설교 초안입니다. 이 내용을 자연스럽고 유기적으로 흐르는 하나의 설교문으로 다듬어 주세요.

[다듬기 원칙]
- 원래 내용의 순서와 핵심을 최대한 유지할 것
- 단락 간 전환을 자연스럽게 연결할 것
- 중복되는 표현은 한 번만 남길 것
- 임의로 내용을 추가하거나 삭제하지 말 것
- 설교문으로서의 언어 흐름을 갖출 것
[사용 성경]: ${bibleRef}

[설교 초안]
${draft}`

  return streamCompletion(prompt, onChunk)
}

let _currentAbortController = null

export function stopCurrentGeneration() {
  _currentAbortController?.abort()
  _currentAbortController = null
}

async function streamCompletion(prompt, onChunk, systemExtra = '') {
  _currentAbortController = new AbortController()
  const signal = _currentAbortController.signal
  const baseSystem = '결과를 반드시 일반 텍스트로만 작성하세요. ##, **, ***, --, ---, > 같은 마크다운 기호를 절대 사용하지 마세요. 제목은 줄 바꿈으로, 강조는 일반 문장으로 표현하세요. 단락 사이에 빈 줄을 두 줄 이상 넣지 마세요. 항목 사이에도 불필요한 공백 줄을 넣지 마세요. 각 항목과 소제목에는 반드시 번호를 붙여(1. 2. 3. 형식) 내용이 한눈에 구조적으로 파악되도록 작성하세요. 찬송가를 추천할 때는 반드시 2006년 한국찬송가공회 발행 21세기찬송가(총 645장)를 기준으로 하세요. 번호와 제목을 스스로 교차 확인한 후 제시하되, 확신하지 못할 경우 번호 없이 제목만 제시하고 "번호는 직접 확인하세요"라고 안내하세요.'
  const systemContent = systemExtra ? baseSystem + '\n\n' + systemExtra : baseSystem
  const response = await fetch('/api/generate', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 8000,
      stream: true,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    let err
    try { err = await response.json() } catch { err = { error: { message: await response.text() } } }
    throw new Error(err.error?.message || 'API error')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data)
          const text = json.choices?.[0]?.delta?.content || ''
          if (text) {
            fullText += text
            onChunk?.(fullText)
          }
        } catch {}
      }
    }
    buffer += decoder.decode()
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim()
      if (data && data !== '[DONE]') {
        try {
          const json = JSON.parse(data)
          const text = json.choices?.[0]?.delta?.content || ''
          if (text) { fullText += text; onChunk?.(fullText) }
        } catch {}
      }
    }
  } finally {
    _currentAbortController = null
    reader.releaseLock()
  }

  return fullText
}
