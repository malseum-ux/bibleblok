import { useState, useEffect, useRef, Fragment } from 'react'
import { CELL_STEPS } from '../constants'
import { CELL_STEP_ITEMS, generateCellMaterial, executeInlineCommand, stopCurrentGeneration } from '../claude'
import { saveCellStep, getCellSteps } from '../db'
import CellForm from './CellForm'
import RichEditor from './RichEditor'

const CELL_SUBTITLES = {
  sharing: '삶으로 나누는 말씀',
  theological: '뿌리에서 열매까지',
  literary: '이야기 속으로',
  psychological: '말씀 앞에 나를 내려놓기',
  communal: '함께 세상으로',
}

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

function stripHtml(html) {
  if (!html || !html.trimStart().startsWith('<')) return html || ''
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || ''
}

export default function CellView({ item, lang, bible, fontSize = 14, onFontSizeChange, isMobile = false, onSaveItem, onExport }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [stepContents, setStepContents] = useState({})
  const [finalContents, setFinalContents] = useState({})
  const [aiContent, setAiContent] = useState('')
  const resultHistory = useTextHistory('', `${item?.id}-${currentStep}-result`)
  const finalHistory = useTextHistory('', `${item?.id}-${currentStep}-final`)
  const [loading, setLoading] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draftEditing, setDraftEditing] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [userKeyword, setUserKeyword] = useState('')
  const [aiCopied, setAiCopied] = useState(false)
  const [finalCopied, setFinalCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [applied, setApplied] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [leftPct, setLeftPct] = useState(50)
  const splitContainerRef = useRef(null)
  const aiDivRef = useRef(null)
  const resultPanelRef = useRef(null)
  const draftPanelRef = useRef(null)
  const finalTimer = useRef(null)

  const step = CELL_STEPS[currentStep] || CELL_STEPS[0]
  const currentItemsDefs = CELL_STEP_ITEMS[step?.key] || []
  const hasItems = currentItemsDefs.length >= 2

  useEffect(() => {
    if (!item?.id) return
    getCellSteps(item.id).then(rows => {
      const aiMap = {}
      const finalMap = {}
      rows.forEach(s => {
        aiMap[s.stepIndex] = s.content || ''
        finalMap[s.stepIndex] = s.finalContent || ''
      })
      setStepContents(aiMap)
      setFinalContents(finalMap)
    })
  }, [item?.id])

  useEffect(() => {
    const ai = stepContents[currentStep] || ''
    const fin = finalContents[currentStep] || ''
    setAiContent(ai)
    resultHistory.reset(ai)
    finalHistory.reset(fin)
    setSelectedItems(currentItemsDefs.map(i => i.key))
    setInstructionsOpen(false)
    setEditing(false)
    setDraftEditing(false)
    setError(null)
  }, [currentStep, stepContents]) // eslint-disable-line

  useEffect(() => {
    if (!step?.key) return
    const kw = localStorage.getItem(`defaultKeyword_cell_${step.key}`) || ''
    setUserKeyword(kw)
  }, [step?.key])

  // 좌측 편집 내용 자동 저장
  useEffect(() => {
    if (!editing) return
    clearTimeout(finalTimer.current)
    finalTimer.current = setTimeout(async () => {
      const t = resultHistory.text
      setStepContents(prev => ({ ...prev, [currentStep]: t }))
      if (item?.id) {
        await saveCellStep(item.id, currentStep, t, finalContents[currentStep] || '')
      }
    }, 800)
  }, [resultHistory.text, editing]) // eslint-disable-line

  // 우측 편집 내용 자동 저장
  useEffect(() => {
    if (!draftEditing && !finalHistory.text) return
    clearTimeout(finalTimer.current)
    finalTimer.current = setTimeout(async () => {
      const t = finalHistory.text
      setFinalContents(prev => ({ ...prev, [currentStep]: t }))
      if (item?.id) {
        await saveCellStep(item.id, currentStep, stepContents[currentStep] || '', t)
      }
    }, 800)
  }, [finalHistory.text]) // eslint-disable-line

  // 생성 중 자동 스크롤
  useEffect(() => {
    if (loading && aiDivRef.current) {
      aiDivRef.current.scrollTop = aiDivRef.current.scrollHeight
    }
  }, [aiContent, loading])

  // 좌측 편집 패널 바깥 클릭 시 편집 종료
  useEffect(() => {
    if (!editing) return
    function handleClick(e) {
      if (resultPanelRef.current && !resultPanelRef.current.contains(e.target)) {
        setEditing(false)
        const t = resultHistory.text
        setAiContent(t)
        setStepContents(prev => ({ ...prev, [currentStep]: t }))
        if (item?.id) saveCellStep(item.id, currentStep, t, finalContents[currentStep] || '')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editing, currentStep]) // eslint-disable-line

  // 우측 편집 패널 바깥 클릭 시 편집 종료
  useEffect(() => {
    if (!draftEditing) return
    function handleClick(e) {
      if (draftPanelRef.current && !draftPanelRef.current.contains(e.target)) {
        setDraftEditing(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [draftEditing])

  function toggleItem(key) {
    setSelectedItems(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
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
    setEditing(false)
    setError(null)

    let effectiveKeyword = userKeyword
    if (/기억해(?:줘|주세요)?/.test(userKeyword)) {
      const cleaned = userKeyword.replace(/기억해(?:줘|주세요)?/g, '').replace(/^[,\s]+|[,\s]+$/g, '').trim()
      if (step?.key) {
        if (cleaned) localStorage.setItem(`defaultKeyword_cell_${step.key}`, cleaned)
        else localStorage.removeItem(`defaultKeyword_cell_${step.key}`)
      }
      effectiveKeyword = cleaned
      setUserKeyword(cleaned)
    }

    const prevContent = aiContent
    const SEP = prevContent ? '\n\n' + '─'.repeat(30) + '\n\n' : ''
    const subtitle = CELL_SUBTITLES[step.key] || ''
    const titleLine = `# ${step.label.ko} — ${subtitle}\n\n`
    let accumulated = prevContent + SEP + titleLine

    setAiContent(accumulated)

    try {
      await generateCellMaterial(
        item.passage, bible, lang, step.key,
        (text) => { accumulated = prevContent + SEP + titleLine + text; setAiContent(accumulated) },
        selectedItems, effectiveKeyword
      ).then(async () => {
        setAiContent(accumulated)
        resultHistory.reset(accumulated)
        setStepContents(prev => ({ ...prev, [currentStep]: accumulated }))
        await saveCellStep(item.id, currentStep, accumulated, finalContents[currentStep] || '')
      })
    } catch (e) {
      if (e.name === 'AbortError') {
        // 사용자가 중지
      } else if (e.message === 'USAGE_LIMIT_EXCEEDED') {
        setError('이번 달 AI 생성 한도에 도달했습니다. 관리자에게 문의하세요.')
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAiSlashCommand({ instruction, contextBefore, contextAfter }) {
    if (!item) return
    resultHistory.forceSnapshot()
    setRefining(true)
    const fallback = resultHistory.text
    let generated = ''
    try {
      await executeInlineCommand(instruction, contextBefore, contextAfter, lang, bible, item.passage, item.title, (chunk) => {
        generated = chunk
        resultHistory.onChange(contextBefore + chunk + contextAfter)
      })
      resultHistory.onChange(contextBefore + generated + contextAfter)
    } catch {
      resultHistory.onChange(fallback)
    } finally {
      setRefining(false)
    }
  }

  async function handleFinalSlashCommand({ instruction, contextBefore, contextAfter }) {
    if (!item) return
    finalHistory.forceSnapshot()
    setRefining(true)
    const fallback = finalHistory.text
    let generated = ''
    try {
      await executeInlineCommand(instruction, contextBefore, contextAfter, lang, bible, item.passage, item.title, (chunk) => {
        generated = chunk
        finalHistory.onChange(contextBefore + chunk + contextAfter)
      })
      finalHistory.onChange(contextBefore + generated + contextAfter)
    } catch {
      finalHistory.onChange(fallback)
    } finally {
      setRefining(false)
    }
  }

  function startEdit() {
    resultHistory.reset(aiContent)
    setInstructionsOpen(false)
    setEditing(true)
  }

  function applyToFinal() {
    if (!aiContent) return
    const existing = finalHistory.text
    const sep = existing.trim() ? '\n\n' : ''
    const newText = existing + sep + stripHtml(aiContent)
    finalHistory.onChange(newText)
    setFinalContents(prev => ({ ...prev, [currentStep]: newText }))
    saveCellStep(item.id, currentStep, aiContent, newText)
    setApplied(true)
    setTimeout(() => setApplied(false), 1500)
  }

  async function handleSave() {
    for (const [idx, fc] of Object.entries(finalContents)) {
      const ai = stepContents[idx] || ''
      if (ai || fc) await saveCellStep(item.id, Number(idx), ai, fc || '')
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function handleSaveItem(formData) {
    await onSaveItem?.(formData)
    setInfoOpen(false)
  }

  if (!step) return null

  const btnBase = {
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  const undoBtnStyle = (enabled) => ({
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 5,
    padding: '2px 7px',
    fontSize: 13,
    cursor: enabled ? 'pointer' : 'default',
    color: enabled ? 'var(--text-muted)' : 'var(--border)',
  })

  const displayAi = editing ? resultHistory.text : aiContent
  const hasFinalContent = !!finalHistory.text

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 단계 탭 + 기본정보/저장/내보내기 버튼 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-sidebar)', alignItems: 'center' }}>
        <div className="no-scrollbar" style={{ display: 'flex', overflowX: 'auto', flex: 1, padding: '10px 16px', gap: 0, scrollbarWidth: 'none', alignItems: 'center' }}>
          {CELL_STEPS.map((s, idx) => {
            const isActive = s.index === currentStep
            const hasDot = stepContents[s.index] || finalContents[s.index]
            return (
              <Fragment key={s.index}>
                <div
                  onClick={() => setCurrentStep(s.index)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: isActive ? 'var(--accent)' : 'var(--accent-light)', color: isActive ? '#fff' : 'var(--accent)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                  {hasDot && (
                    <span style={{ fontSize: 7, color: 'var(--accent)', lineHeight: 1, opacity: 0.7 }}>●</span>
                  )}
                </div>
                {idx < CELL_STEPS.length - 1 && (
                  <span style={{ fontSize: 18, color: 'var(--text-muted)', flexShrink: 0, opacity: 0.4, padding: '0 2px' }}>›</span>
                )}
              </Fragment>
            )
          })}
        </div>

        <div style={{ flexShrink: 0, padding: '0 14px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
          <button
            onClick={() => setInfoOpen(v => !v)}
            style={{ ...btnBase, background: infoOpen ? 'var(--accent)' : 'transparent', color: infoOpen ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (infoOpen ? 'var(--accent)' : 'var(--border)') }}
          >
            기본정보 {infoOpen ? '▲' : '▼'}
          </button>
          <button
            onClick={handleSave}
            style={{ ...btnBase, background: saved ? 'var(--accent)' : 'transparent', color: saved ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (saved ? 'var(--accent)' : 'var(--border)'), transition: 'all 0.2s' }}
          >
            {saved ? '저장됨' : '저장'}
          </button>
          <button
            onClick={onExport}
            title="이 항목을 .json 파일로 내보내기 (에어드롭·공유용)"
            style={{ ...btnBase, background: 'transparent', color: 'var(--text-muted)' }}
          >
            내보내기
          </button>
        </div>
      </div>

      {/* 기본정보 폼 */}
      {infoOpen && (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-sidebar)', flexShrink: 0, overflowY: 'auto', maxHeight: '40vh' }}>
          <CellForm cell={item} onSave={handleSaveItem} lang={lang} />
        </div>
      )}

      {/* 본문 영역 */}
      <div ref={splitContainerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 좌: AI 생성 */}
        <div ref={resultPanelRef} style={{ width: isMobile ? '100%' : `${leftPct}%`, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* 좌 헤더 */}
          <div style={{ height: 46, padding: '0 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {hasItems && (
              <button
                onClick={() => setInstructionsOpen(v => !v)}
                style={{ ...btnBase, background: instructionsOpen ? 'var(--accent)' : 'transparent', color: instructionsOpen ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (instructionsOpen ? 'var(--accent)' : 'var(--border)') }}
              >
                지시 항목 {selectedItems.length}/{currentItemsDefs.length}
              </button>
            )}
            <div style={{ flex: 1 }} />
            {displayAi && !loading && (
              <button
                onClick={() => { navigator.clipboard.writeText(stripHtml(displayAi)); setAiCopied(true); setTimeout(() => setAiCopied(false), 1500) }}
                style={{ ...btnBase, background: aiCopied ? 'var(--accent)' : 'transparent', color: aiCopied ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (aiCopied ? 'var(--accent)' : 'var(--border)'), transition: 'all 0.2s' }}
              >
                {aiCopied ? '복사됨' : '복사'}
              </button>
            )}
            {displayAi && !loading && onFontSizeChange && (
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', height: 28 }}>
                <button onClick={() => onFontSizeChange(Math.max(11, fontSize - 1))} style={{ background: 'none', border: 'none', borderRight: '1px solid var(--border)', padding: '0 7px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1 }}>A-</button>
                <button onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))} style={{ background: 'none', border: 'none', borderLeft: '1px solid var(--border)', padding: '0 7px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1 }}>A+</button>
              </div>
            )}
            <button
              onClick={loading ? stopCurrentGeneration : generate}
              style={{ background: loading ? '#dc2626' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? '중지' : aiContent ? '다시 생성' : 'AI 생성'}
            </button>
          </div>

          {/* 지시 항목 패널 (키워드 입력 포함) */}
          {!editing && instructionsOpen && hasItems && (
            <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 16px', background: 'var(--bg-sidebar)', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                {currentItemsDefs.map(ci => (
                  <label key={ci.key} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: 'var(--text)', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(ci.key)}
                      onChange={() => toggleItem(ci.key)}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 14, height: 14 }}
                    />
                    {ci.label}
                  </label>
                ))}
              </div>
              <input
                value={userKeyword}
                onChange={e => setUserKeyword(e.target.value)}
                placeholder="추가 키워드나 지시사항 (예: 청년 대상, 부활절 주제)"
                style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* AI 결과 영역 */}
          {editing ? (
            <RichEditor
              fixedToolbar
              editable={!refining}
              value={resultHistory.text}
              onChange={resultHistory.onChange}
              baseFontSize={fontSize}
              onEnterCommand={handleAiSlashCommand}
            />
          ) : (
            <div
              ref={aiDivRef}
              onClick={aiContent && !loading ? startEdit : undefined}
              style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', cursor: aiContent && !loading ? 'text' : 'default' }}
            >
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}
              {aiContent ? (
                aiContent.trimStart().startsWith('<') ? (
                  <div className="rich-view" dangerouslySetInnerHTML={{ __html: aiContent }} style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }} />
                ) : (
                  <div style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }}>
                    {aiContent.split('\n').map((line, i, arr) => (
                      <Fragment key={i}>{line}{i < arr.length - 1 && <br />}</Fragment>
                    ))}
                  </div>
                )
              ) : !loading && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, textAlign: 'center', marginTop: 60 }}>
                  {item?.passage
                    ? `AI 생성 버튼을 눌러 ${step.label.ko}을 생성합니다.`
                    : '기본정보에서 성경 본문을 먼저 입력하세요.'}
                </div>
              )}
            </div>
          )}

          {/* 교재작성 반영 버튼 */}
          {aiContent && !loading && !editing && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-sidebar)' }}>
              <button
                onClick={applyToFinal}
                style={{ width: '100%', padding: '8px 0', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', background: applied ? 'var(--accent)' : 'var(--accent-light)', color: applied ? '#fff' : 'var(--accent)', transition: 'all 0.2s' }}
              >
                {applied ? '반영됨' : '교재작성 반영'}
              </button>
            </div>
          )}
        </div>

        {/* 드래그 구분선 */}
        {!isMobile && (
          <div
            onPointerDown={startSplitDrag}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--border)'}
            style={{ width: 5, flexShrink: 0, background: 'var(--border)', cursor: 'col-resize', transition: 'background 0.15s' }}
          />
        )}

        {/* 우: 교재 작성 */}
        {!isMobile && (
          <div ref={draftPanelRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* 우 헤더 */}
            <div style={{ height: 46, padding: '0 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: 'var(--bg-sidebar)' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-heading)' }}>{step.label.ko} 작성</span>
              <div style={{ flex: 1 }} />
              {hasFinalContent && (
                <button
                  onClick={() => { navigator.clipboard.writeText(stripHtml(finalHistory.text)); setFinalCopied(true); setTimeout(() => setFinalCopied(false), 1500) }}
                  style={{ ...btnBase, background: finalCopied ? 'var(--accent)' : 'transparent', color: finalCopied ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (finalCopied ? 'var(--accent)' : 'var(--border)'), transition: 'all 0.2s' }}
                >
                  {finalCopied ? '복사됨' : '복사'}
                </button>
              )}
              {hasFinalContent && onFontSizeChange && (
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', height: 28 }}>
                  <button onClick={() => onFontSizeChange(Math.max(11, fontSize - 1))} style={{ background: 'none', border: 'none', borderRight: '1px solid var(--border)', padding: '0 7px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1 }}>A-</button>
                  <button onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))} style={{ background: 'none', border: 'none', borderLeft: '1px solid var(--border)', padding: '0 7px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1 }}>A+</button>
                </div>
              )}
              {hasFinalContent && (
                <>
                  <button onClick={finalHistory.undo} disabled={!finalHistory.canUndo} style={undoBtnStyle(finalHistory.canUndo)}>↩</button>
                  <button onClick={finalHistory.redo} disabled={!finalHistory.canRedo} style={undoBtnStyle(finalHistory.canRedo)}>↪</button>
                </>
              )}
            </div>

            {/* 최종 교재 편집 영역 */}
            {draftEditing ? (
              <RichEditor
                fixedToolbar
                editable={!refining}
                value={finalHistory.text}
                onChange={finalHistory.onChange}
                baseFontSize={fontSize}
                onEnterCommand={handleFinalSlashCommand}
              />
            ) : (
              <div
                onClick={() => setDraftEditing(true)}
                style={{ flex: 1, overflow: 'auto', padding: '20px 24px', cursor: 'text' }}
              >
                {finalHistory.text ? (
                  finalHistory.text.trimStart().startsWith('<') ? (
                    <div className="rich-view" dangerouslySetInnerHTML={{ __html: finalHistory.text }} style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }} />
                  ) : (
                    <div style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }}>
                      {finalHistory.text.split('\n').map((line, i, arr) => (
                        <Fragment key={i}>{line}{i < arr.length - 1 && <br />}</Fragment>
                      ))}
                    </div>
                  )
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
                    클릭하여 {step.label.ko}을 작성하거나, 왼쪽에서 AI로 생성 후 "교재작성 반영" 버튼을 누르세요
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
