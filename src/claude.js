// AI 요청 — 지시문은 서버(Supabase 함수 bibleblok-generate)가 조립한다
// 앱은 "무엇을 만들지"(kind)와 재료(params)만 보낸다. 지시문을 고치려면 서버의
// bibleblok_app/supabase/functions/_shared/bibleblok_prompts.js 를 고치고 함수를 다시 올리면 된다.
// 플러터 앱(lib/services/ai.dart)도 같은 서버·같은 kind 를 쓴다.
import { AI_URL, aiHeaders } from './supabase.js'

// 지시 항목 목록 — 화면의 체크박스 이름과 key 용 (실제 지시문 글은 서버에 있다)
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
  deep_questions: [
    { key: 'inductive', label: '귀납법적 질문', text: '- 귀납법적 질문과 해설: 본문의 구체적 사실과 관찰에서 출발해 교훈을 도출하는 질문 3~5개와 각 질문에 대한 해설' },
    { key: 'deductive', label: '연역법적 질문', text: '- 연역법적 질문과 해설: 교훈의 핵심 명제에서 출발해 구체적 삶의 상황에 적용하는 질문 3~5개와 각 질문에 대한 해설' },
    { key: 'dialectical', label: '변증법적 질문', text: '- 변증법적 질문과 해설(정반합): 교훈에 대한 긍정 명제(정)와 그에 맞서는 반론(반), 그 긴장을 통합하는 새로운 이해(합)로 구성된 질문 3~5개와 각 질문에 대한 해설' },
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
    { key: 'words', label: '주요 단어·문구', text: '- 본문의 주요 단어와 문구를 해설 (신학적·언어적 의미 포함)' },
    { key: 'meaning', label: '본문 주요 의미', text: '- 본문이 전달하는 주요 의미와 신학적 핵심을 해설' },
    { key: 'message', label: '핵심 내용 해설', text: '- 본문 전체를 종합하여 해설하듯 풀어서 서술' },
  ],
  core_message: [
    { key: 'proclamation', label: '핵심 메시지', text: '- 이 본문이 전하는 단 하나의 핵심 메시지를 명확하게 서술' },
    { key: 'points', label: '핵심 포인트', text: '- 그 메시지를 뒷받침하는 핵심 포인트 2~3가지를 설명하듯 서술' },
  ],
  meditation: [
    { key: 'questions', label: '묵상 질문', text: '- 깊이 생각해 볼 묵상 질문 2~3개 (질문 후 짧은 해설 포함)' },
    { key: 'verse', label: '핵심 구절', text: '- 반복해서 되새길 핵심 구절 1개와 그 의미 서술' },
  ],
  application: [
    { key: 'connection', label: '본문 연결', text: '- 이 실천적 교훈이 본문 어디에서 나오는지 먼저 설명' },
    { key: 'action', label: '실천 적용', text: '- 본문에서 이끌어낸 구체적인 실천적 교훈 (가정/직장/교회/이웃 중 한 영역)' },
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

export function generateCellMaterial(passage, bible, lang, stepKey, onChunk, customText = '', userKeyword = '', sermonContext = '', memory = '') {
  return streamKind('cell', { passage, bible, lang, stepKey, customText, userKeyword, sermonContext, memory }, onChunk)
}

export function generateSermonStep(stepKey, passage, emphasis, lang, bible, seriesCtx, onChunk, selectedItems = null, userKeyword = '', customText = '', memory = '') {
  return streamKind('sermonStep', { stepKey, passage, emphasis, lang, bible, seriesCtx, selectedItems, userKeyword, customText, memory }, onChunk)
}

export function generateWorshipCombined(date, season, lectionary, lang, bible, stepSelectedItems, onChunk, userKeyword = '', customStepTexts = {}, memory = '') {
  return streamKind('worshipCombined', { date, season, lectionary, lang, bible, stepSelectedItems, userKeyword, customStepTexts, memory }, onChunk)
}

export function generateDawnCombined(passage, emphasis, lang, bible, seriesCtx, stepSelectedItems, onChunk, userKeyword = '', customStepTexts = {}, memory = '') {
  return streamKind('dawnCombined', { passage, emphasis, lang, bible, seriesCtx, stepSelectedItems, userKeyword, customStepTexts, memory }, onChunk)
}

export function executeInlineCommand(instruction, contextBefore, contextAfter, lang, bible, passage, title, onChunk, stepsData = null, useTheological = false) {
  return streamKind('inlineCommand', { instruction, contextBefore, contextAfter, lang, bible, passage, title, stepsData, useTheological }, onChunk)
}

// 드래그로 선택한 부분만 지시대로 고친다 (내용·핵심 유지)
export function executeSelectionEdit(selectedText, instruction, contextBefore, contextAfter, lang, bible, passage, title, onChunk) {
  return streamKind('selectionEdit', { selectedText, instruction, contextBefore, contextAfter, lang, bible, passage, title }, onChunk)
}

export function refineDraft(draft, lang, bible, onChunk) {
  return streamKind('refineDraft', { draft, lang, bible }, onChunk)
}

// 성서정과 조회 — 짧게 한 번에 (스트리밍 없음)
export async function fetchLectionary(date, season, bible) {
  const response = await fetch(AI_URL, {
    method: 'POST',
    headers: await aiHeaders(),
    body: JSON.stringify({ kind: 'lectionary', params: { date, season, bible } }),
  })
  if (!response.ok) throw new Error('API error')
  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// 생성마다 자기 중단 장치를 갖는다 — 동시에 여러 생성이 돌아도 서로 덮어쓰지 않음
const _activeControllers = new Set()

export function stopCurrentGeneration() {
  _activeControllers.forEach(c => c.abort())
  _activeControllers.clear()
}

async function streamKind(kind, params, onChunk) {
  const controller = new AbortController()
  _activeControllers.add(controller)
  try {
    return await runStream(kind, params, onChunk, controller.signal)
  } finally {
    _activeControllers.delete(controller)
  }
}

async function runStream(kind, params, onChunk, signal) {
  const response = await fetch(AI_URL, {
    method: 'POST',
    signal,
    headers: await aiHeaders(),
    body: JSON.stringify({ kind, params }),
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
    reader.releaseLock()
  }

  return fullText
}
