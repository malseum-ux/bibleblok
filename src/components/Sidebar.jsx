import { useState } from 'react'

export default function Sidebar({ tab, items, selectedId, onSelect, onCreate, onDelete, steps, activeStep }) {
  const [expandedId, setExpandedId] = useState(null)

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <aside style={{
      width: 240,
      minWidth: 200,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 12px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tab === 'sermon' ? '설교 목록' : tab === 'worship' ? '예배 목록' : '새벽 목록'}
        </span>
        <button
          onClick={onCreate}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            width: 22,
            height: 22,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >+</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {items.length === 0 && (
          <div style={{ padding: '16px 12px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            {tab === 'sermon' ? '+ 버튼으로 설교를 추가하세요' : tab === 'worship' ? '+ 버튼으로 예배를 추가하세요' : '+ 버튼으로 새벽 기도를 추가하세요'}
          </div>
        )}
        {items.map(item => {
          const isExpanded = expandedId === item.id
          const isSelected = selectedId?.id === item.id && selectedId?.step == null
          return (
            <div key={item.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                }}
                onClick={() => {
                  toggleExpand(item.id)
                  onSelect({ id: item.id, step: null })
                }}
              >
                <span style={{
                  fontSize: 11,
                  marginRight: 4,
                  color: 'var(--text-muted)',
                  transform: isExpanded ? 'rotate(90deg)' : 'none',
                  display: 'inline-block',
                  transition: 'transform 0.15s',
                }}>▶</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-heading)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {tab === 'sermon'
                      ? (item.title || item.passage || '제목 없음')
                      : (item.date || '날짜 없음')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {tab === 'sermon' ? item.date : item.season}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '0 2px',
                    opacity: 0.5,
                  }}
                >×</button>
              </div>

              {isExpanded && (
                <div style={{ paddingLeft: 20 }}>
                  {steps.map(step => {
                    const isStepSelected = selectedId?.id === item.id && selectedId?.step === step.index
                    return (
                      <div
                        key={step.index}
                        onClick={() => onSelect({ id: item.id, step: step.index })}
                        style={{
                          padding: '5px 8px',
                          fontSize: 12,
                          cursor: 'pointer',
                          color: isStepSelected ? 'var(--accent)' : 'var(--text)',
                          background: isStepSelected ? 'var(--accent-light)' : 'transparent',
                          borderLeft: isStepSelected ? '2px solid var(--accent)' : '2px solid transparent',
                          fontWeight: isStepSelected ? 600 : 400,
                        }}
                      >
                        {step.index + 1}. {step.label.ko}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
