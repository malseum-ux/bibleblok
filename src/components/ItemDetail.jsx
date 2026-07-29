import { useState } from 'react'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'
import SermonForm from './SermonForm'
import WorshipForm from './WorshipForm'
import DawnForm from './DawnForm'

export default function ItemDetail({ tab, item, onSave, lang, defaultCategory, onSelectStep }) {
  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : DAWN_STEPS
  const isNew = !item
  const [isFormOpen, setIsFormOpen] = useState(isNew)

  async function handleSave(formData) {
    await onSave(formData)
    setIsFormOpen(false)
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 기본정보 토글 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isFormOpen ? 16 : 0 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-heading)' }}>
          {tab === 'sermon' ? '설교 작성' : tab === 'worship' ? '예배인도문 작성' : '새벽 설교 작성'}
        </h2>
        {!isNew && (
          <button
            onClick={() => setIsFormOpen(v => !v)}
            style={{
              background: isFormOpen ? 'var(--accent)' : 'transparent',
              color: isFormOpen ? '#fff' : 'var(--text-muted)',
              border: '1px solid ' + (isFormOpen ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            기본정보 {isFormOpen ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* 기본정보 폼 */}
      {isFormOpen && (
        <div style={{ marginBottom: isNew ? 0 : 24 }}>
          {tab === 'sermon'
            ? <SermonForm sermon={item} onSave={handleSave} lang={lang} defaultCategory={defaultCategory} />
            : tab === 'worship'
            ? <WorshipForm worship={item} onSave={handleSave} lang={lang} />
            : <DawnForm dawn={item} onSave={handleSave} lang={lang} defaultCategory={defaultCategory} />}
        </div>
      )}

      {/* 단계 목록 */}
      {!isNew && (
        <div style={{ marginTop: isFormOpen ? 0 : 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {lang === 'ko' ? '단계별 학습' : 'Study Steps'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map(step => (
              <div
                key={step.index}
                onClick={() => onSelectStep?.(step.index)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-sidebar)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: onSelectStep ? 'pointer' : 'default',
                }}
              >
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {step.index + 1}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{step.label.ko}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
