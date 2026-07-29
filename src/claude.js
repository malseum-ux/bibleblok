const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

const SERMON_STEP_PROMPTS = {
  narrative: (passage, lang, bible) => `
당신은 성경 신학자입니다. 다음 성경 본문에 대해 서사적 관점에서 해설해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음을 포함하세요:
- 본문의 전후 문맥
- 해당 성경책(예: 창세기)에서의 위치와 역할
- 서사 구조적 의미와 흐름
- 정경 전체에서의 신학적 위치
`,
  original: (passage, lang, bible) => `
당신은 성경 원어 전문가입니다. 다음 본문을 원어로 해설해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음을 포함하세요:
- 구약이면 BHS(히브리어), 신약이면 NA28(헬라어)와 LXX 기반
- 주요 단어와 문구의 원어 분석
- 신구약 성경에서의 용례 비교
- 어근과 의미의 신학적 함의
`,
  message: (passage, lang, bible) => `
앞서 분석한 내용을 바탕으로 이 본문이 전하는 핵심 메시지를 정리해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 본문이 최초 청중에게 전달하려 한 메시지
- 오늘날 교회와 신자에게 전하는 메시지
- 기독론적 관점에서의 메시지
`,
  lesson: (passage, lang, bible) => `
이 본문에서 배울 수 있는 신앙적 교훈을 정리해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 하나님의 성품과 사역에 대한 교훈
- 인간의 본성과 반응에 대한 교훈
- 신앙 생활에 대한 실천적 교훈
`,
  research: (passage, lang, bible) => `
이 본문을 다양한 학문적 관점으로 확장 연구해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음 관점을 포함하세요:
- 문학적 관점 (장르, 문체, 수사법)
- 역사적 관점 (시대적 배경, 고고학)
- 사회학적 관점 (당시 사회 구조, 문화)
- 심리학적 관점 (인물의 내면, 동기)
- 철학적 관점 (세계관, 윤리)
`,
  illustration: (passage, lang, bible) => `
당신은 설교 전문가입니다. 다음 본문의 메시지를 효과적으로 전달할 수 있는 예화를 제시해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음을 포함하세요:
- 본문의 핵심 메시지를 잘 담은 역사적/문화적 예화 1-2개
- 현대 생활에서 공감할 수 있는 예화 1-2개
- 각 예화가 본문과 어떻게 연결되는지 설명
- 설교에서 예화를 사용하는 위치와 방법 제안
`,
  hymns: (passage, lang, bible) => `
당신은 교회 음악 전문가입니다. 다음 설교 본문의 메시지에 어울리는 찬송과 CCM을 선별해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

다음을 포함하세요:

[설교 전]
- 한국 찬송가 1곡 (번호, 제목, 선택 이유)
- CCM 1곡 (제목, 아티스트, 선택 이유)

[설교 후]
- 한국 찬송가 1곡 (번호, 제목, 선택 이유)
- CCM 1곡 (제목, 아티스트, 선택 이유)

각 곡이 본문 메시지와 어떻게 연결되는지, 예배 흐름에서 어떤 역할을 하는지 설명해 주세요.
`,
  application: (passage, lang, bible) => `
지금까지의 해설을 종합하여 오늘날 삶에 적용하는 내용을 작성해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 상세하게 작성해 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 개인 신앙 생활에의 적용
- 공동체(교회)에의 적용
- 사회와 세상을 향한 적용
- 구체적이고 실천 가능한 적용점
`,
}

const SERMON_STEP_PROMPTS_WITH_EMPHASIS = {
  narrative: (passage, emphasis, lang, bible) =>
    SERMON_STEP_PROMPTS.narrative(passage, lang, bible) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  original: (passage, emphasis, lang, bible) =>
    SERMON_STEP_PROMPTS.original(passage, lang, bible) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  message: (passage, emphasis, lang, bible) =>
    SERMON_STEP_PROMPTS.message(passage, lang, bible) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  lesson: (passage, emphasis, lang, bible) =>
    SERMON_STEP_PROMPTS.lesson(passage, lang, bible) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  research: (passage, emphasis, lang, bible) =>
    SERMON_STEP_PROMPTS.research(passage, lang, bible) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  illustration: (passage, emphasis, lang, bible) =>
    SERMON_STEP_PROMPTS.illustration(passage, lang, bible) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  hymns: (passage, emphasis, lang, bible) =>
    SERMON_STEP_PROMPTS.hymns(passage, lang, bible) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
  application: (passage, emphasis, lang, bible) =>
    SERMON_STEP_PROMPTS.application(passage, lang, bible) +
    (emphasis ? `\n\n설교자가 강조하고 싶은 주제: ${emphasis}` : ''),
}

const WORSHIP_STEP_PROMPTS = {
  call_verse: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[예배의 부름 성경구절]
- 추천 구절 1~2개 (장절 + 본문 전체)
- 선택 이유 (2~3줄)
`,
  call_prayer: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[예배의 부름 기도문]
절기 분위기를 담아 회중을 예배로 부르는 기도문을 작성해 주세요. (10~15줄 분량)
`,
  confession: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[참회의 기도문]
해당 절기에 맞는 죄 고백의 기도문을 작성해 주세요. (10~15줄 분량)
`,
  forgiveness: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[용서의 선언 성경구절]
- 하나님의 용서와 은혜를 선포하는 구절 1~2개 (장절 + 본문 전체)
- 선택 이유 (2~3줄)
- 선포 방식 제안 (1~2줄)
`,
  worship_prayer: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[예배를 위한 기도문]
말씀 선포와 성령의 역사를 구하는 기도문을 작성해 주세요. (10~15줄 분량)
`,
  offering: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[봉헌기도문]
헌금의 감사와 절기 정신을 담은 봉헌기도문을 작성해 주세요. (8~12줄 분량)
`,
  responsive_reading: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[교독문]
- 대한예수교장로회 예배모범 교독문 번호와 제목 제안 (해당하는 경우)
- 또는 해당 절기에 맞는 교독문 전문 (인도자/회중 구분하여 작성)
`,
  hymns: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[예배 찬송 추천]
예배 순서별로 추천해 주세요:
- 입례송: 찬송가 번호/제목 + 이유 한 줄
- 말씀 전: 찬송가 번호/제목 + 이유 한 줄
- 응답송: 찬송가 번호/제목 + 이유 한 줄
- 봉헌송: 찬송가 번호/제목 + 이유 한 줄
- 파송송: 찬송가 번호/제목 + 이유 한 줄
- CCM 1~2곡 추가 추천 (제목, 아티스트)
`,
  benediction: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 바로 사용할 수 있게 작성해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[축도]
해당 절기에 어울리는 축도문을 삼위일체 하나님의 이름으로 작성해 주세요. (5~8줄 분량)
`,
  sending: (date, season, lectionary, lang, bible) => `
예배 인도자를 위한 실용적인 제안입니다. 간결하게 답해 주세요.

날짜: ${date} | 절기: ${season || '일반 주일'} | 성서정과: ${lectionary || '미지정'}
번역본: ${bible || '개역개정성경'} | 언어: ${lang === 'ko' ? '한국어' : 'English'}

[파송의 말씀]
- 추천 성경구절 1개 (장절 + 본문)
- 세상으로 나아가는 파송 선언문 (3~5줄)
`,
}

const DAWN_STEP_PROMPTS = {
  exposition: (passage, lang, bible, seriesCtx) => `
당신은 새벽 기도회를 섬기는 목회자입니다. 다음 본문으로 성도들이 하루를 시작할 때 들을 새벽 메시지를 직접 작성해 주세요.
5~10분 낭독 분량(약 800~1,200자)으로 목회자가 회중에게 직접 전하는 말씀 형식으로 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}
${seriesCtx ? `\n${seriesCtx}\n이 시리즈의 흐름을 이어가는 메시지를 써 주세요.` : ''}

- 본문을 자연스럽게 소개하고 배경을 간략히 설명
- 본문의 핵심 내용을 따뜻하고 힘 있게 풀어서 전달
- 오늘 하루를 시작하는 성도들에게 힘과 위로를 주는 마무리
- 설교문 형식으로 작성 (학술 분석 아님)
`,
  core_message: (passage, lang, bible, seriesCtx) => `
당신은 새벽 기도회를 섬기는 목회자입니다. 이 본문의 핵심 메시지를 성도들에게 전하는 글로 직접 작성해 주세요.
약 600~800자, 목회자가 강단에서 말하듯 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}
${seriesCtx ? `\n${seriesCtx}\n시리즈 흐름을 살린 핵심 메시지를 써 주세요.` : ''}

- 오늘 이 말씀이 우리에게 전하는 단 하나의 메시지를 선명하게 선포
- 그 메시지를 뒷받침하는 핵심 포인트 2~3가지를 자연스럽게 풀어서 전달
- "오늘 하루 이 말씀을 붙들고 나아가십시오"라는 마음으로 마무리
`,
  meditation: (passage, lang, bible, seriesCtx) => `
당신은 새벽 기도회를 섬기는 목회자입니다. 성도들이 하루 중 말씀을 묵상하도록 안내하는 글을 직접 작성해 주세요.
약 600~800자, 목회자가 부드럽게 이끌어 가는 묵상 안내문 형식으로 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 성도들의 마음 문을 여는 짧은 도입
- 오늘 하루 마음에 품을 묵상 질문 2~3개 (질문 후 짧은 안내 포함)
- 하루 동안 반복해서 되새길 핵심 구절 1개로 마무리
`,
  application: (passage, lang, bible, seriesCtx) => `
당신은 새벽 기도회를 섬기는 목회자입니다. 오늘 말씀을 삶에 적용하도록 촉구하는 글을 직접 작성해 주세요.
약 600~800자, 구체적이고 따뜻하게, 성도들의 일상에 닿는 언어로 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 오늘 하루 딱 하나 실천할 수 있는 적용 (가정/직장/교회/이웃 중 한 영역)
- 그 적용이 왜 이 본문에서 나오는지 자연스럽게 연결
- 결단을 촉구하는 짧고 힘 있는 마무리 (기도문 한 줄 포함)
`,
  prayer_topics: (passage, lang, bible, seriesCtx) => `
당신은 새벽 기도회를 섬기는 목회자입니다. 오늘 본문을 중심으로 성도들이 함께 기도할 내용을 작성해 주세요.
약 500~700자, 성도들이 바로 따라 기도할 수 있는 실제 기도문 형식으로 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 개인 기도 (본문 말씀을 내 삶에 적용하는 기도)
- 교회 공동체를 위한 기도
- 나라와 이웃을 위한 기도
- 각 기도는 2~4문장, 성도들이 마음으로 따라할 수 있는 언어로
`,
  hymn: (passage, lang, bible, seriesCtx) => `
당신은 교회 음악을 잘 아는 목회자입니다. 오늘 새벽 기도 본문에 가장 잘 어울리는 찬송을 추천해 주세요.
간결하고 실용적으로, 목회자가 바로 선곡에 참고할 수 있게 써 주세요.

본문: ${passage}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 한국 찬송가 1곡 (번호, 제목, 이 본문과 연결되는 이유 2~3줄)
- CCM 1곡 (제목, 아티스트, 이 본문과 연결되는 이유 2~3줄)
`,
}

export async function generateSermonStep(stepKey, passage, emphasis, lang, bible, seriesCtx, onChunk) {
  if (!API_KEY) {
    throw new Error('API_KEY_MISSING')
  }
  const prompt = SERMON_STEP_PROMPTS_WITH_EMPHASIS[stepKey]?.(passage, emphasis, lang, bible)
  const fullPrompt = seriesCtx
    ? prompt + `\n\n${seriesCtx}\n이 시리즈의 흐름을 이어가도록 작성해 주세요.`
    : prompt
  return streamCompletion(fullPrompt, onChunk)
}

export async function generateWorshipStep(stepKey, date, season, lectionary, lang, bible, onChunk) {
  if (!API_KEY) {
    throw new Error('API_KEY_MISSING')
  }
  const prompt = WORSHIP_STEP_PROMPTS[stepKey]?.(date, season, lectionary, lang, bible)
  return streamCompletion(prompt, onChunk)
}

export async function generateDawnStep(stepKey, passage, emphasis, lang, bible, seriesCtx, onChunk) {
  if (!API_KEY) {
    throw new Error('API_KEY_MISSING')
  }
  const promptFn = DAWN_STEP_PROMPTS[stepKey]
  if (!promptFn) throw new Error('Unknown step key: ' + stepKey)
  const base = promptFn(passage, lang, bible, seriesCtx)
  const prompt = emphasis
    ? base + `\n\n강조하고 싶은 주제: ${emphasis}`
    : base
  return streamCompletion(prompt, onChunk)
}

async function streamCompletion(prompt, onChunk) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'API error')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
    for (const line of lines) {
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const text = json.delta?.text || ''
        if (text) {
          fullText += text
          onChunk?.(fullText)
        }
      } catch {}
    }
  }

  return fullText
}
