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
당신은 예배 인도 전문 목회자입니다. 다음 예배를 위한 예배의 부름 성경구절을 선정하고 상세히 설명해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 해당 절기와 성서정과에 어울리는 성경구절 1-2개
- 구절 선택 이유와 신학적 근거 상세 설명
- 예배 공동체에 주는 의미
`,
  call_prayer: (date, season, lectionary, lang, bible) => `
예배의 부름 기도문을 작성해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 해당 절기의 분위기를 담은 예배의 부름 기도문
- 회중을 예배로 인도하는 내용
- 기도문 작성 배경 및 신학적 설명 포함
`,
  confession: (date, season, lectionary, lang, bible) => `
참회의 기도문을 작성해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 해당 절기에 맞는 죄 고백의 내용
- 하나님 앞에 나아가는 겸손한 마음을 담은 기도문
- 기도문 신학적 배경 설명 포함
`,
  forgiveness: (date, season, lectionary, lang, bible) => `
용서의 선언에 적합한 성경구절을 선정하고 상세히 설명해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 하나님의 용서와 은혜를 선포하는 구절
- 구절 선택 이유와 신학적 근거 상세 설명
- 예배 현장에서의 선포 방식 제안
`,
  worship_prayer: (date, season, lectionary, lang, bible) => `
예배를 위한 기도문을 작성해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 오늘 예배 전체를 위한 기도
- 말씀 선포와 성령의 역사를 구하는 내용
- 기도문 신학적 배경 설명 포함
`,
  offering: (date, season, lectionary, lang, bible) => `
봉헌기도문을 작성해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 헌금의 의미와 감사를 담은 기도문
- 해당 절기의 정신을 반영
- 봉헌 신학과 성경적 근거 설명 포함
`,
  hymns: (date, season, lectionary, lang, bible) => `
오늘 예배에 적합한 찬송을 추천하고 상세히 설명해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 한국 찬송가 번호와 제목
- 예배 순서별(입례, 말씀 전, 응답, 봉헌, 파송) 추천
- 각 찬송 선택 이유와 절기와의 연관성 상세 설명
`,
  benediction: (date, season, lectionary, lang, bible) => `
축도 말씀을 작성해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 해당 절기에 어울리는 축도 본문과 내용
- 삼위일체 하나님의 이름으로 드리는 축복
- 축도 신학적 배경과 설명 포함
`,
  sending: (date, season, lectionary, lang, bible) => `
파송의 말씀을 작성해 주세요.
A4 용지 2~3매 분량(약 1,500~2,500자)으로 작성해 주세요.

날짜: ${date}
교회력 절기: ${season || '일반 주일'}
성서정과 본문: ${lectionary || '미지정'}
응답 언어: ${lang === 'ko' ? '한국어' : 'English'}
기본 번역본: ${bible || '개역개정성경'}

- 세상으로 파송하는 말씀과 선언
- 해당 절기의 사명과 소명을 담은 내용
- 파송 신학과 선교적 함의 설명 포함
`,
}

export async function generateSermonStep(stepKey, passage, emphasis, lang, bible, onChunk) {
  if (!API_KEY) {
    throw new Error('API_KEY_MISSING')
  }
  const prompt = SERMON_STEP_PROMPTS_WITH_EMPHASIS[stepKey]?.(passage, emphasis, lang, bible)
  return streamCompletion(prompt, onChunk)
}

export async function generateWorshipStep(stepKey, date, season, lectionary, lang, bible, onChunk) {
  if (!API_KEY) {
    throw new Error('API_KEY_MISSING')
  }
  const prompt = WORSHIP_STEP_PROMPTS[stepKey]?.(date, season, lectionary, lang, bible)
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
