// // 지시문 안내 — 버튼을 누르면 창 위쪽에 펼쳐진다 (플러터 widgets/step_widgets.dart 의 SlashHelpPanel 과 같은 내용)

export function SlashHelpButton({ open, onToggle, lang }) {
  return (
    <button
      onClick={onToggle}
      title={lang === 'en' ? 'How to use // commands' : '// 지시문 쓰는 법'}
      style={{
        background: open ? 'var(--accent)' : 'transparent',
        color: open ? '#fff' : 'var(--text-muted)',
        border: '1px solid ' + (open ? 'var(--accent)' : 'var(--border)'),
        borderRadius: 5, padding: '2px 8px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {lang === 'en' ? '// Guide' : '지시문 안내'}
    </button>
  )
}

const ROWS = {
  ko: [
    ['//- 지시', '내 연구와 앞뒤 문맥을 참고해서 씁니다.'],
    ['//+ 지시', '내 연구·앞뒤 문맥에 신학자 관점까지 더해서 씁니다.'],
    ['// 지시', '연구·문맥 없이 신학자 관점으로 새로 씁니다.'],
  ],
  en: [
    ['//- text', 'Writes using your research and the surrounding text.'],
    ['//+ text', 'Adds theologians’ perspectives to your research and context.'],
    ['// text', 'Writes fresh from theologians’ perspectives, without research or context.'],
  ],
}

export function SlashHelpPanel({ lang }) {
  const ko = lang !== 'en'
  const code = { fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)', fontSize: 13, lineHeight: 1.7, color: 'var(--text)', flexShrink: 0 }}>
      <div style={{ marginBottom: 6 }}>
        {ko
          ? '글을 편집하다가 원하는 자리에 지시문을 쓰고 Enter를 누르면, 그 자리에 AI가 글을 써 넣습니다.'
          : 'While editing, type a command where you want text and press Enter — AI writes it in that spot.'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 12, rowGap: 2 }}>
        {ROWS[ko ? 'ko' : 'en'].map(([c, d]) => (
          <div key={c} style={{ display: 'contents' }}>
            <span style={code}>{c}</span>
            <span>{d}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>
        {ko
          ? '예: //- 이 부분에 예화 하나 추가 · 내 연구는 설교작성 탭의 다른 단계에 생성해 둔 내용입니다.'
          : 'e.g. //- add an illustration here · "Research" means content generated in the other Sermon steps.'}
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={{ fontWeight: 600 }}>{ko ? '드래그해서 고치기' : 'Drag to edit'}</span>
        {ko
          ? ' — 글을 드래그해 선택하면 수정 창이 뜹니다. "짧게 줄여", "부드럽게"처럼 지시하고 Enter를 누르면 선택한 부분만 고칩니다.'
          : ' — Select text to open the edit box. Type an instruction like "shorten" and press Enter to change only the selection.'}
      </div>
    </div>
  )
}
