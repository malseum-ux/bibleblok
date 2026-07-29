import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'
import SermonForm from './SermonForm'
import WorshipForm from './WorshipForm'
import DawnForm from './DawnForm'

export default function ItemDetail({ tab, item, onSave, lang, defaultCategory }) {
  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : DAWN_STEPS

  const isNew = !item

  const title = isNew
    ? (tab === 'sermon'
        ? (lang === 'ko' ? '새 설교 작성' : 'New Sermon')
        : tab === 'worship'
        ? (lang === 'ko' ? '새 예배 작성' : 'New Worship')
        : (lang === 'ko' ? '새 새벽 기도 작성' : 'New Dawn Prayer'))
    : (tab === 'sermon'
        ? (lang === 'ko' ? '설교 정보' : 'Sermon Info')
        : tab === 'worship'
        ? (lang === 'ko' ? '예배 정보' : 'Worship Info')
        : (lang === 'ko' ? '새벽 기도 정보' : 'Dawn Prayer Info'))

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: 'var(--text-heading)' }}>
        {title}
      </h2>
      {tab === 'sermon'
        ? <SermonForm sermon={item} onSave={onSave} lang={lang} defaultCategory={defaultCategory} />
        : tab === 'worship'
        ? <WorshipForm worship={item} onSave={onSave} lang={lang} />
        : <DawnForm dawn={item} onSave={onSave} lang={lang} defaultCategory={defaultCategory} />}

      {!isNew && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {lang === 'ko' ? '단계별 학습' : 'Study Steps'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map(step => (
              <div
                key={step.index}
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-sidebar)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
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
