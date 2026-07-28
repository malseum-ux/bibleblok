export const SERMON_STEPS = [
  { index: 0, key: 'narrative', label: { ko: '서사적 해설', en: 'Narrative Commentary' } },
  { index: 1, key: 'original', label: { ko: '원어 해설', en: 'Original Language' } },
  { index: 2, key: 'message', label: { ko: '본문 메시지', en: 'Message' } },
  { index: 3, key: 'lesson', label: { ko: '교훈', en: 'Lessons' } },
  { index: 4, key: 'research', label: { ko: '확장 연구', en: 'Extended Research' } },
  { index: 5, key: 'application', label: { ko: '적용', en: 'Application' } },
]

export const WORSHIP_STEPS = [
  { index: 0, key: 'call_verse', label: { ko: '예배의 부름 - 성경구절', en: 'Call to Worship (Scripture)' } },
  { index: 1, key: 'call_prayer', label: { ko: '예배의 부름 - 기도문', en: 'Call to Worship (Prayer)' } },
  { index: 2, key: 'confession', label: { ko: '참회의 기도문', en: 'Prayer of Confession' } },
  { index: 3, key: 'forgiveness', label: { ko: '용서의 선언 - 성경구절', en: 'Assurance of Pardon' } },
  { index: 4, key: 'worship_prayer', label: { ko: '예배를 위한 기도문', en: 'Prayer for Worship' } },
  { index: 5, key: 'offering', label: { ko: '봉헌기도문', en: 'Offertory Prayer' } },
  { index: 6, key: 'hymns', label: { ko: '예배를 위한 찬송', en: 'Suggested Hymns' } },
  { index: 7, key: 'benediction', label: { ko: '축도', en: 'Benediction' } },
  { index: 8, key: 'sending', label: { ko: '파송의 말씀', en: 'Sending Word' } },
]

export const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
]

export const BIBLE_VERSIONS = [
  { code: '개역개정성경', label: '개역개정' },
  { code: '공동번역성경', label: '공동번역' },
  { code: '새한글성경', label: '새한글성경' },
]

export const THEMES = [
  { code: 'system', label: { ko: '시스템', en: 'System' } },
  { code: 'light', label: { ko: '라이트', en: 'Light' } },
  { code: 'dark', label: { ko: '다크', en: 'Dark' } },
]
