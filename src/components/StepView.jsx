import { useState, useEffect } from 'react'
import { SERMON_STEPS, WORSHIP_STEPS } from '../constants'
import { generateSermonStep, generateWorshipStep } from '../claude'
import { saveSermonStep, saveWorshipStep } from '../db'

export default function StepView({ tab, item, stepIndex, savedContent, lang, bible }) {
  const [content, setContent] = useState(savedContent || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setContent(savedContent || '')
    setError(null)
  }, [savedContent, stepIndex, item?.id])

  const steps = tab === 'sermon' ? SERMON_STEPS : WORSHIP_STEPS
  const step = steps.find(s => s.index === stepIndex)

  async function generate() {
    setLoading(true)
    setError(null)
    setContent('')
    try {
      if (tab === 'sermon') {
        await generateSermonStep(
          step.key,
          item.passage,
          item.emphasis,
          lang,
          bible,
          (text) => setContent(text)
        ).then(async (full) => {
          await saveSermonStep(item.id, stepIndex, full)
        })
      } else {
        await generateWorshipStep(
          step.key,
          item.date,
          item.season,
          item.lectionary,
          lang,
          bible,
          (text) => setContent(text)
        ).then(async (full) => {
          await saveWorshipStep(item.id, stepIndex, full)
        })
      }
    } catch (e) {
      if (e.message === 'API_KEY_MISSING') {
        setError(lang === 'ko'
          ? 'API 키가 설정되지 않았습니다. .env 파일에 VITE_ANTHROPIC_API_KEY를 추가하세요.'
          : 'API key not set. Add VITE_ANTHROPIC_API_KEY to your .env file.')
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!step) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {stepIndex + 1}
        </div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>
          {step.label.ko}
          {step.label.en !== step.label.ko && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>
              {step.label.en}
            </span>
          )}
        </h2>
        <div style={{ flex: 1 }} />
        <button
          onClick={generate}
          disabled={loading}
          style={{
            background: loading ? 'var(--border)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading
            ? (lang === 'ko' ? '생성 중...' : 'Generating...')
            : (content ? (lang === 'ko' ? '다시 생성' : 'Regenerate') : (lang === 'ko' ? 'AI 생성' : 'Generate'))}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#dc2626',
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}
        {content ? (
          <div style={{
            lineHeight: 1.8,
            color: 'var(--text)',
            fontSize: 14,
            whiteSpace: 'pre-wrap',
          }}>
            {content}
          </div>
        ) : !loading && (
          <div style={{
            color: 'var(--text-muted)',
            fontSize: 13,
            textAlign: 'center',
            marginTop: 60,
          }}>
            {lang === 'ko' ? 'AI 생성 버튼을 눌러 내용을 생성하세요' : 'Click Generate to create content'}
          </div>
        )}
      </div>
    </div>
  )
}
