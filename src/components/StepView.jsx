import { useState, useEffect, useRef, Fragment } from 'react'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'
import { generateSermonStep, generateWorshipStep, generateDawnStep, generateWorshipCombined, generateDawnCombined, SERMON_STEP_ITEMS, WORSHIP_STEP_ITEMS, DAWN_STEP_ITEMS } from '../claude'
import { saveSermonStep, saveWorshipStep, saveDawnStep, getSermonSteps, getWorshipSteps, getDawnSteps, updateSermon, updateDawn, getSeriesContext } from '../db'
import SermonForm from './SermonForm'
import WorshipForm from './WorshipForm'
import DawnForm from './DawnForm'

export default function StepView({ tab, item, lang, bible, onSaveItem, onItemUpdate }) {
  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : DAWN_STEPS

  const [currentStep, setCurrentStep] = useState(0)
  const [stepContents, setStepContents] = useState({})
  const [content, setContent] = useState('')
  const [draft, setDraft] = useState(item?.draft || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])        // 설교작성 탭용
  const [stepSelectedItems, setStepSelectedItems] = useState({}) // 예배/새벽 탭용: { stepKey: [itemKey] }
  const [userKeyword, setUserKeyword] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [leftPct, setLeftPct] = useState(50)
  const draftTimer = useRef(null)
  const splitContainerRef = useRef(null)

  const step = steps[currentStep] || steps[0]
  const stepItemsDefs = tab === 'sermon' ? SERMON_STEP_ITEMS : tab === 'worship' ? WORSHIP_STEP_ITEMS : DAWN_STEP_ITEMS
  const currentItems = stepItemsDefs[step?.key] || []
  const hasItems = currentItems.length >= 2

  useEffect(() => {
    async function loadContents() {
      if (!item?.id) return
      const saved = tab === 'sermon'
        ? await getSermonSteps(item.id)
        : tab === 'worship'
        ? await getWorshipSteps(item.id)
        : await getDawnSteps(item.id)
      const map = {}
      saved.forEach(s => { map[s.stepIndex] = s.content })
      setStepContents(map)
    }
    loadContents()
  }, [item?.id, tab])

  useEffect(() => {
    // 예배인도/새벽설교는 통합 결과를 step 0에 저장하므로 항상 step 0 내용을 표시
    setContent(tab === 'sermon' ? (stepContents[currentStep] || '') : (stepContents[0] || ''))
    setError(null)
    setInstructionsOpen(false)
    const items = stepItemsDefs[step?.key] || []
    setSelectedItems(items.map(i => i.key))
  }, [currentStep, stepContents])

  // 다른 항목으로 이동하면 단계별 선택 초기화
  useEffect(() => {
    setStepSelectedItems({})
    setUserKeyword('')
  }, [item?.id, tab])

  useEffect(() => {
    setDraft(item?.draft || '')
  }, [item?.id])

  function toggleItem(key) {
    if (tab === 'sermon') {
      setSelectedItems(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      )
    } else {
      setStepSelectedItems(prev => {
        // 아직 이 단계를 방문한 적 없으면 모두 선택 상태에서 시작
        const current = prev[step.key] ?? currentItems.map(i => i.key)
        return {
          ...prev,
          [step.key]: current.includes(key) ? current.filter(k => k !== key) : [...current, key],
        }
      })
    }
  }

  function startSplitDrag(e) {
    if (e.button !== 0) return
    e.preventDefault()
    const container = splitContainerRef.current
    const onMove = (me) => {
      const rect = container.getBoundingClientRect()
      const pct = ((me.clientX - rect.left) / rect.width) * 100
      setLeftPct(Math.min(Math.max(pct, 20), 80))
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', () => document.removeEventListener('pointermove', onMove), { once: true })
  }

  async function generate() {
    setLoading(true)
    setError(null)
    setContent('')
    const activeItems = hasItems ? selectedItems : null
    try {
      if (tab === 'sermon') {
        const seriesCtx = await getSeriesContext('sermon', item.category, item.id)
        await generateSermonStep(
          step.key, item.passage, item.emphasis, lang, bible, seriesCtx,
          (text) => setContent(text), activeItems, userKeyword
        ).then(async (full) => {
          await saveSermonStep(item.id, currentStep, full)
          setStepContents(prev => ({ ...prev, [currentStep]: full }))
        })
      } else if (tab === 'worship') {
        // 단계별 선택 항목을 반영한 통합 문서 생성 후 step 0에 저장
        await generateWorshipCombined(
          item.date, item.season, item.lectionary, lang, bible,
          stepSelectedItems, (text) => setContent(text), userKeyword
        ).then(async (full) => {
          await saveWorshipStep(item.id, 0, full)
          setStepContents(prev => ({ ...prev, [0]: full }))
        })
      } else {
        const seriesCtx = await getSeriesContext('dawn', item.category, item.id)
        // 단계별 선택 항목을 반영한 통합 문서 생성 후 step 0에 저장
        await generateDawnCombined(
          item.passage, item.emphasis, lang, bible, seriesCtx,
          stepSelectedItems, (text) => setContent(text), userKeyword
        ).then(async (full) => {
          await saveDawnStep(item.id, 0, full)
          setStepContents(prev => ({ ...prev, [0]: full }))
        })
      }
    } catch (e) {
      if (e.message === 'API_KEY_MISSING') {
        setError(lang === 'ko'
          ? 'API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENROUTER_API_KEY를 추가하세요.'
          : 'API key not set. Add VITE_OPENROUTER_API_KEY to your .env file.')
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
    handleDraftChange(draft + separator + content)
  }

  async function handleSaveItem(formData) {
    await onSaveItem?.(formData)
    await onItemUpdate?.()
    setInfoOpen(false)
  }

  if (!step) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 단계 탭 + 기본정보 버튼 한 줄 */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-sidebar)',
        alignItems: 'center',
      }}>
        {/* 단계 탭 - 가로 스크롤 */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          flex: 1,
          padding: '10px 16px',
          gap: 0,
          scrollbarWidth: 'none',
          alignItems: 'center',
        }}>
          {steps.map((s, idx) => {
            const isActive = s.index === currentStep
            return (
              <Fragment key={s.index}>
                <div
                  onClick={() => setCurrentStep(s.index)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: isActive ? 'var(--accent)' : 'var(--accent-light)',
                    color: isActive ? '#fff' : 'var(--accent)',
                    fontSize: 16,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {s.index + 1}
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap' }}>
                    {s.label.ko}
                    {s.label.en !== s.label.ko && (
                      <span style={{ fontSize: 13, fontWeight: 400, color: isActive ? 'var(--accent)' : 'var(--text-muted)', marginLeft: 6, opacity: 0.8 }}>
                        {s.label.en}
                      </span>
                    )}
                  </span>
                  {(tab === 'sermon' ? stepContents[s.index] : stepContents[0]) && (
                    <span style={{ fontSize: 7, color: 'var(--accent)', lineHeight: 1, opacity: 0.7 }}>●</span>
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <span style={{ fontSize: 18, color: 'var(--text-muted)', flexShrink: 0, opacity: 0.4, padding: '0 2px' }}>›</span>
                )}
              </Fragment>
            )
          })}
        </div>

        {/* 기본정보 버튼 - 우측 고정 */}
        <div style={{ flexShrink: 0, padding: '0 14px', borderLeft: '1px solid var(--border)' }}>
          <button
            onClick={() => setInfoOpen(v => !v)}
            style={{
              background: infoOpen ? 'var(--accent)' : 'transparent',
              color: infoOpen ? '#fff' : 'var(--text-muted)',
              border: '1px solid ' + (infoOpen ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            기본정보 {infoOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 기본정보 폼 */}
      {infoOpen && (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)', flexShrink: 0, overflowY: 'auto', maxHeight: '40vh' }}>
          {tab === 'sermon'
            ? <SermonForm sermon={item} onSave={handleSaveItem} lang={lang} />
            : tab === 'worship'
            ? <WorshipForm worship={item} onSave={handleSaveItem} lang={lang} />
            : <DawnForm dawn={item} onSave={handleSaveItem} lang={lang} />}
        </div>
      )}


      {/* 본문 영역 */}
      <div ref={splitContainerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 좌: AI 생성 내용 */}
        <div style={{
          width: tab === 'sermon' ? `${leftPct}%` : '100%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* 왼쪽 에디터 상단 - 지시 항목 + AI 생성 버튼 */}
          {(() => {
            // 현재 단계에서 표시할 선택 항목 (설교: selectedItems, 예배/새벽: stepSelectedItems[key] 또는 전체)
            const displaySelected = tab === 'sermon'
              ? selectedItems
              : (stepSelectedItems[step?.key] ?? currentItems.map(i => i.key))
            return (
              <>
                <div style={{
                  height: 46,
                  padding: '0 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}>
                  {hasItems && (
                    <button
                      onClick={() => setInstructionsOpen(v => !v)}
                      style={{
                        background: instructionsOpen ? 'var(--accent)' : 'transparent',
                        color: instructionsOpen ? '#fff' : 'var(--text-muted)',
                        border: '1px solid ' + (instructionsOpen ? 'var(--accent)' : 'var(--border)'),
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      지시 항목 {displaySelected.length}/{currentItems.length}
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={generate}
                    disabled={loading}
                    style={{
                      background: loading ? 'var(--border)' : 'var(--accent)',
                      color: loading ? 'var(--text-muted)' : '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 14px',
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

                {/* 지시 항목 패널 */}
                {instructionsOpen && hasItems && (
                  <div style={{
                    borderBottom: '1px solid var(--border)',
                    padding: '10px 16px',
                    background: 'var(--bg-sidebar)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {currentItems.map(ci => (
                        <label key={ci.key} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: 'var(--text)', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={displaySelected.includes(ci.key)}
                            onChange={() => toggleItem(ci.key)}
                            style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 14, height: 14 }}
                          />
                          {ci.label}
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={userKeyword}
                      onChange={e => setUserKeyword(e.target.value)}
                      placeholder="추가 키워드나 지시사항 (예: 청년 대상, 부활절 주제)"
                      style={{
                        width: '100%',
                        fontSize: 13,
                        padding: '6px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </>
            )
          })()}

          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}
            {content ? (
              <div style={{ lineHeight: 1.8, color: 'var(--text)', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {content}
              </div>
            ) : !loading && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
                {lang === 'ko' ? 'AI 생성 버튼을 눌러 내용을 생성하세요' : 'Click Generate to create content'}
              </div>
            )}
          </div>

          {tab === 'sermon' && content && !loading && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
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

        {/* 드래그 핸들 (설교 탭만) */}
        {tab === 'sermon' && (
          <div
            onPointerDown={startSplitDrag}
            style={{
              width: 5,
              flexShrink: 0,
              background: 'var(--border)',
              cursor: 'col-resize',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--border)'}
          />
        )}

        {/* 우: 설교문 초안 (설교 탭만) */}
        {tab === 'sermon' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ height: 46, padding: '0 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
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
