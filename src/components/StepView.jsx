import { useState, useEffect, useRef, Fragment } from 'react'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'
import { generateSermonStep, generateWorshipCombined, generateDawnCombined, refineDraft, SERMON_STEP_ITEMS, WORSHIP_STEP_ITEMS, DAWN_STEP_ITEMS } from '../claude'
import { saveSermonStep, saveWorshipStep, saveDawnStep, getSermonSteps, getWorshipSteps, getDawnSteps, updateSermon, updateDawn, getSeriesContext } from '../db'
import SermonForm from './SermonForm'
import WorshipForm from './WorshipForm'
import DawnForm from './DawnForm'

// 언두/리두 히스토리 훅
// resetKey가 바뀌면 히스토리를 initialValue로 초기화
function useTextHistory(initialValue, resetKey) {
  const [text, setText] = useState(initialValue)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const snapshots = useRef([initialValue])
  const snapIdx = useRef(0)
  const timer = useRef(null)
  const textRef = useRef(initialValue)
  const prevKey = useRef(resetKey)

  useEffect(() => {
    if (prevKey.current === resetKey) return
    prevKey.current = resetKey
    clearTimeout(timer.current)
    textRef.current = initialValue
    setText(initialValue)
    snapshots.current = [initialValue]
    snapIdx.current = 0
    setCanUndo(false)
    setCanRedo(false)
  }, [resetKey]) // eslint-disable-line

  function updateFlags() {
    setCanUndo(snapIdx.current > 0 || textRef.current !== snapshots.current[snapIdx.current])
    setCanRedo(snapIdx.current < snapshots.current.length - 1)
  }

  function pushSnapshot(val) {
    snapshots.current = snapshots.current.slice(0, snapIdx.current + 1)
    if (snapshots.current[snapshots.current.length - 1] !== val) {
      snapshots.current.push(val)
      if (snapshots.current.length > 100) snapshots.current.shift()
    }
    snapIdx.current = snapshots.current.length - 1
    updateFlags()
  }

  function onChange(newText) {
    textRef.current = newText
    setText(newText)
    updateFlags()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => pushSnapshot(newText), 800)
  }

  function reset(value) {
    clearTimeout(timer.current)
    textRef.current = value
    setText(value)
    snapshots.current = [value]
    snapIdx.current = 0
    setCanUndo(false)
    setCanRedo(false)
  }

  function undo() {
    clearTimeout(timer.current)
    const curr = textRef.current
    // 아직 커밋되지 않은 변경이 있으면 먼저 스냅샷으로 저장 (리두로 복원 가능)
    if (curr !== snapshots.current[snapIdx.current]) {
      snapshots.current = snapshots.current.slice(0, snapIdx.current + 1)
      snapshots.current.push(curr)
      snapIdx.current = snapshots.current.length - 1
    }
    if (snapIdx.current > 0) {
      snapIdx.current--
      const val = snapshots.current[snapIdx.current]
      textRef.current = val
      setText(val)
    }
    updateFlags()
  }

  function redo() {
    clearTimeout(timer.current)
    if (snapIdx.current < snapshots.current.length - 1) {
      snapIdx.current++
      const val = snapshots.current[snapIdx.current]
      textRef.current = val
      setText(val)
      updateFlags()
    }
  }

  function forceSnapshot() {
    clearTimeout(timer.current)
    pushSnapshot(textRef.current)
  }

  return { text, onChange, reset, undo, redo, canUndo, canRedo, forceSnapshot }
}

export default function StepView({ tab, item, lang, bible, fontSize = 14, onSaveItem, onItemUpdate }) {
  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : DAWN_STEPS

  const [currentStep, setCurrentStep] = useState(0)
  const [stepContents, setStepContents] = useState({})
  const [content, setContent] = useState('')
  const draftHistory = useTextHistory(item?.draft || '', item?.id)
  const [editing, setEditing] = useState(false)
  const [refining, setRefining] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [resultCopied, setResultCopied] = useState(false)
  const [draftCopied, setDraftCopied] = useState(false)
  const resultHistory = useTextHistory('', null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [stepSelectedItems, setStepSelectedItems] = useState({})
  const [userKeyword, setUserKeyword] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [leftPct, setLeftPct] = useState(50)
  const draftTimer = useRef(null)
  const resultEditTimer = useRef(null)
  const splitContainerRef = useRef(null)
  const lastSelectionRef = useRef('')

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
    setEditing(false)
  }, [item?.id, tab])

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
    setEditing(false)
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
    draftHistory.onChange(text)
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
    // 결과창에서 드래그 선택된 텍스트가 있으면 그것만, 없으면 전체
    const textToAdd = lastSelectionRef.current || content
    lastSelectionRef.current = ''
    const separator = draftHistory.text.trim() ? '\n\n' : ''
    handleDraftChange(draftHistory.text + separator + textToAdd)
  }

  function saveDraftNow() {
    clearTimeout(draftTimer.current)
    if (tab === 'dawn') updateDawn(item.id, { draft: draftHistory.text })
    else updateSermon(item.id, { draft: draftHistory.text })
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 1500)
  }

  async function refineSermonDraft() {
    if (!draftHistory.text.trim() || refining || loading) return
    const currentDraft = draftHistory.text
    draftHistory.forceSnapshot()  // 다듬기 전 상태를 히스토리에 저장 (언두 가능)
    setRefining(true)
    try {
      const refined = await refineDraft(currentDraft, lang, bible, (text) => {
        draftHistory.onChange(text)  // 스트리밍 중 실시간 반영
      })
      handleDraftChange(refined)  // DB 저장
    } catch (e) {
      handleDraftChange(currentDraft)  // 오류 시 원래 내용 복원
    } finally {
      setRefining(false)
    }
  }

  async function handleSaveItem(formData) {
    await onSaveItem?.(formData)
    await onItemUpdate?.()
    setInfoOpen(false)
  }

  function startEdit() {
    resultHistory.reset(content)
    setInstructionsOpen(false)
    setEditing(true)
  }

  async function saveEdit() {
    const text = resultHistory.text
    if (tab === 'worship') {
      await saveWorshipStep(item.id, 0, text)
    } else {
      await saveDawnStep(item.id, 0, text)
    }
    setStepContents(prev => ({ ...prev, [0]: text }))
    setContent(text)
    setEditing(false)
  }

  function cancelEdit() {
    setEditing(false)
  }

  useEffect(() => {
    if (!editing) return
    clearTimeout(resultEditTimer.current)
    resultEditTimer.current = setTimeout(async () => {
      const text = resultHistory.text
      if (!text.trim()) return
      if (tab === 'worship') await saveWorshipStep(item.id, 0, text)
      else await saveDawnStep(item.id, 0, text)
      setStepContents(prev => ({ ...prev, [0]: text }))
    }, 800)
  }, [resultHistory.text, editing]) // eslint-disable-line

  if (!step) return null

  const undoBtnStyle = (can) => ({
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: 5,
    padding: '2px 7px',
    fontSize: 12,
    cursor: can ? 'pointer' : 'default',
    opacity: can ? 1 : 0.35,
    lineHeight: 1,
  })

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

          {/* 툴바 */}
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
                  {editing ? (
                    // 편집 모드: 언두/리두 + 취소/저장
                    <>
                      <div style={{ flex: 1 }} />
                      <button onClick={resultHistory.undo} disabled={!resultHistory.canUndo} style={undoBtnStyle(resultHistory.canUndo)}>↩</button>
                      <button onClick={resultHistory.redo} disabled={!resultHistory.canRedo} style={undoBtnStyle(resultHistory.canRedo)}>↪</button>
                      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
                      <button
                        onClick={cancelEdit}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >취소</button>
                      <button
                        onClick={saveEdit}
                        style={{
                          background: 'var(--accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >저장</button>
                    </>
                  ) : (
                    // 일반 모드: 지시항목 + (수정) + AI생성
                    <>
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
                      {content && !loading && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(editing ? resultHistory.text : content)
                            setResultCopied(true)
                            setTimeout(() => setResultCopied(false), 1500)
                          }}
                          style={{
                            background: resultCopied ? 'var(--accent)' : 'transparent',
                            color: resultCopied ? '#fff' : 'var(--text-muted)',
                            border: '1px solid ' + (resultCopied ? 'var(--accent)' : 'var(--border)'),
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >{resultCopied ? '복사됨' : '복사'}</button>
                      )}
                      {tab !== 'sermon' && content && !loading && (
                        <button
                          onClick={startEdit}
                          style={{
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >수정</button>
                      )}
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
                    </>
                  )}
                </div>

                {/* 지시 항목 패널 (편집 모드가 아닐 때만) */}
                {!editing && instructionsOpen && hasItems && (
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

          {/* 결과창: 편집 모드이면 textarea, 아니면 읽기 전용 */}
          {editing ? (
            <textarea
              value={resultHistory.text}
              onChange={e => resultHistory.onChange(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                resize: 'none',
                padding: '20px 24px',
                fontSize,
                lineHeight: 1.8,
                background: 'var(--bg)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                overflow: 'auto',
              }}
            />
          ) : (
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}
              {content ? (
                <div
                  onMouseUp={() => {
                    const sel = window.getSelection()?.toString().trim()
                    lastSelectionRef.current = sel || ''
                  }}
                  style={{ lineHeight: 1.8, color: 'var(--text)', fontSize, whiteSpace: 'pre-wrap' }}
                >
                  {content}
                </div>
              ) : !loading && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
                  {lang === 'ko' ? 'AI 생성 버튼을 눌러 내용을 생성하세요' : 'Click Generate to create content'}
                </div>
              )}
            </div>
          )}

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
            <div style={{
              height: 46,
              padding: '0 20px',
              borderBottom: '1px solid var(--border)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>{lang === 'ko' ? '설교문 초안' : 'Sermon Draft'}</span>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(draftHistory.text)
                  setDraftCopied(true)
                  setTimeout(() => setDraftCopied(false), 1500)
                }}
                disabled={!draftHistory.text.trim()}
                style={{
                  background: draftCopied ? 'var(--accent)' : 'transparent',
                  color: draftCopied ? '#fff' : 'var(--text-muted)',
                  border: '1px solid ' + (draftCopied ? 'var(--accent)' : 'var(--border)'),
                  borderRadius: 5,
                  padding: '2px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: draftHistory.text.trim() ? 'pointer' : 'default',
                  opacity: !draftHistory.text.trim() ? 0.4 : 1,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {draftCopied ? '복사됨' : '복사'}
              </button>
              <button
                onClick={saveDraftNow}
                style={{
                  background: draftSaved ? 'var(--accent)' : 'transparent',
                  color: draftSaved ? '#fff' : 'var(--text-muted)',
                  border: '1px solid ' + (draftSaved ? 'var(--accent)' : 'var(--border)'),
                  borderRadius: 5,
                  padding: '2px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {draftSaved ? (lang === 'ko' ? '저장됨' : 'Saved') : (lang === 'ko' ? '저장' : 'Save')}
              </button>
              <button
                onClick={refineSermonDraft}
                disabled={refining || loading || !draftHistory.text.trim()}
                style={{
                  background: refining ? 'var(--border)' : 'var(--accent-light)',
                  color: refining ? 'var(--text-muted)' : 'var(--accent)',
                  border: '1px solid ' + (refining ? 'var(--border)' : 'var(--accent)'),
                  borderRadius: 5,
                  padding: '2px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: (refining || loading || !draftHistory.text.trim()) ? 'default' : 'pointer',
                  opacity: !draftHistory.text.trim() ? 0.4 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {refining ? (lang === 'ko' ? '다듬는 중...' : 'Refining...') : (lang === 'ko' ? 'AI 다듬기' : 'AI Refine')}
              </button>
              <button onClick={draftHistory.undo} disabled={!draftHistory.canUndo} style={undoBtnStyle(draftHistory.canUndo)}>↩</button>
              <button onClick={draftHistory.redo} disabled={!draftHistory.canRedo} style={undoBtnStyle(draftHistory.canRedo)}>↪</button>
            </div>
            <textarea
              value={draftHistory.text}
              onChange={e => handleDraftChange(e.target.value)}
              disabled={refining}
              placeholder={lang === 'ko'
                ? '왼쪽 단계 내용을 참고하여 설교문을 작성하세요.\n\n"설교문에 반영" 버튼으로 단계 내용을 가져올 수 있습니다.'
                : 'Write your sermon here.\n\nUse "Add to Sermon" to bring in step content.'}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                resize: 'none',
                padding: '20px 24px',
                fontSize,
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
