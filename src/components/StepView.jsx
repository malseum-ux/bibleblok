import { useState, useEffect, useRef } from 'react'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'
import { generateSermonStep, generateWorshipStep, generateDawnStep } from '../claude'
import { saveSermonStep, saveWorshipStep, saveDawnStep, updateSermon, updateDawn, getSeriesContext } from '../db'

export default function StepView({ tab, item, stepIndex, savedContent, lang, bible, onSaved }) {
  const [content, setContent] = useState(savedContent || '')
  const [draft, setDraft] = useState(item?.draft || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const draftTimer = useRef(null)

  useEffect(() => {
    setContent(savedContent || '')
    setError(null)
  }, [savedContent, stepIndex, item?.id])

  useEffect(() => {
    setDraft(item?.draft || '')
  }, [item?.id])

  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : DAWN_STEPS
  const step = steps.find(s => s.index === stepIndex)

  async function generate() {
    setLoading(true)
    setError(null)
    setContent('')
    try {
      if (tab === 'sermon') {
        const seriesCtx = await getSeriesContext('sermon', item.category, item.id)
        await generateSermonStep(
          step.key,
          item.passage,
          item.emphasis,
          lang,
          bible,
          seriesCtx,
          (text) => setContent(text)
        ).then(async (full) => {
          await saveSermonStep(item.id, stepIndex, full)
          onSaved?.()
        })
      } else if (tab === 'worship') {
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
          onSaved?.()
        })
      } else {
        const seriesCtx = await getSeriesContext('dawn', item.category, item.id)
        await generateDawnStep(
          step.key,
          item.passage,
          item.emphasis,
          lang,
          bible,
          seriesCtx,
          (text) => setContent(text)
        ).then(async (full) => {
          await saveDawnStep(item.id, stepIndex, full)
          onSaved?.()
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

  function handleDraftChange(text) {
    setDraft(text)
    clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      if (tab === 'dawn') {
        updateDawn(item.id, { draft: text })
      } else {
        updateSermon(item.id, { draft: text })
      }
    }, 500)
  }

  function applyToSermon() {
    if (!content) return
    const separator = draft.trim() ? '\n\n' : ''
    const newDraft = draft + separator + content
    handleDraftChange(newDraft)
  }

  if (!step) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더 */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {stepIndex + 1}
        </div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>
          {step.label.ko}
          {step.label.en !== step.label.ko && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>
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
            padding: '6px 14px',
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

      {/* 본문: 좌우 분할 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 왼쪽: 단계 내용 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: tab === 'sermon' ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
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

          {/* 설교문에 반영 버튼 (설교 탭만) */}
          {tab === 'sermon' && content && !loading && (
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <button
                onClick={applyToSermon}
                style={{
                  width: '100%',
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: 6,
                  padding: '8px 0',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {lang === 'ko' ? '설교문에 반영' : 'Add to Sermon'}
              </button>
            </div>
          )}
        </div>

        {/* 오른쪽: 설교문 초안 (설교 탭만) */}
        {tab === 'sermon' && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 20px',
              borderBottom: '1px solid var(--border)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}>
              {lang === 'ko' ? '설교문 초안' : 'Sermon Draft'}
            </div>
            <textarea
              value={draft}
              onChange={e => handleDraftChange(e.target.value)}
              placeholder={lang === 'ko'
                ? '왼쪽 단계 내용을 참고하여 설교문을 작성하세요.\n\n"설교문에 반영" 버튼으로 단계 내용을 가져올 수 있습니다.'
                : 'Write your sermon here.\n\nUse "Add to Sermon" to bring in step content.'}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                resize: 'none',
                padding: '20px 24px',
                fontSize: 14,
                lineHeight: 1.9,
                background: 'var(--bg)',
                color: 'var(--text)',
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
