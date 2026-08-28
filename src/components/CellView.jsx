import { useState, useEffect, useRef, Fragment } from 'react'
import { CELL_STEPS } from '../constants'
import { generateCellMaterial, executeInlineCommand, stopCurrentGeneration } from '../claude'
import { saveCellStep, getCellSteps, getSermonSteps, getCustomStepItems, addCustomStepItem, deleteCustomStepItem, setCustomStepItemOrders } from '../db'
import { addMemory, buildMemoryPrompt } from '../memory'
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

export default function CellView({ item, lang, bible, fontSize = 14, onFontSizeChange, isMobile = false, onSaveItem, onExport, sermons = [], onGoToSermon }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [stepContents, setStepContents] = useState({})
  const [aiContent, setAiContent] = useState('')
  const resultHistory = useTextHistory('', `${item?.id}-${currentStep}-result`)
  const [loading, setLoading] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [customItems, setCustomItems] = useState([])
  const [selectedCustomKeys, setSelectedCustomKeys] = useState([])
  const [editingCustom, setEditingCustom] = useState(false)
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [userKeyword, setUserKeyword] = useState('')
  const [aiCopied, setAiCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const aiDivRef = useRef(null)
  const resultPanelRef = useRef(null)
  const prevStepRef = useRef(0)

  const step = CELL_STEPS[currentStep] || CELL_STEPS[0]

  useEffect(() => {
    if (!item?.id) return
    getCellSteps(item.id).then(rows => {
      const aiMap = {}
      rows.forEach(s => { aiMap[s.stepIndex] = s.content || '' })
      setStepContents(aiMap)
    })
  }, [item?.id])

  useEffect(() => {
    const stepChanged = prevStepRef.current !== currentStep
    if (stepChanged) prevStepRef.current = currentStep

    const ai = stepContents[currentStep] || ''
    setAiContent(ai)
    resultHistory.reset(ai)
    setInstructionsOpen(false)
    setError(null)

    if (stepChanged) setEditing(false)
  }, [currentStep, stepContents]) // eslint-disable-line

  useEffect(() => {
    if (!step?.key) return
    getCustomStepItems('cell', step.key).then(items => {
      setCustomItems(items)
      setSelectedCustomKeys(prev => {
        const allIds = items.map(i => i.id)
        const kept = prev.filter(id => allIds.includes(id))
        const added = allIds.filter(id => !prev.includes(id))
        return [...kept, ...added]
      })
    })
    setEditingCustom(false)
    setNewCustomLabel('')
  }, [step?.key])

  useEffect(() => {
    if (!step?.key) return
    const kw = localStorage.getItem(`defaultKeyword_cell_${step.key}`) || ''
    setUserKeyword(kw)
  }, [step?.key])

  useEffect(() => {
    if (!editing) return
    const timer = setTimeout(async () => {
      const t = resultHistory.text
      setStepContents(prev => ({ ...prev, [currentStep]: t }))
      if (item?.id) await saveCellStep(item.id, currentStep, t, '')
    }, 800)
    return () => clearTimeout(timer)
  }, [resultHistory.text, editing]) // eslint-disable-line

  useEffect(() => {
    if (loading && aiDivRef.current) {
      aiDivRef.current.scrollTop = aiDivRef.current.scrollHeight
    }
  }, [aiContent, loading])

  useEffect(() => {
    if (!editing) return
    function handleClick(e) {
      if (resultPanelRef.current && !resultPanelRef.current.contains(e.target)) {
        setEditing(false)
        const t = resultHistory.text
        setAiContent(t)
        setStepContents(prev => ({ ...prev, [currentStep]: t }))
        if (item?.id) saveCellStep(item.id, currentStep, t, '')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editing, currentStep]) // eslint-disable-line

  function toggleCustomItem(id) {
    setSelectedCustomKeys(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    )
  }

  async function handleAddCustomItem() {
    if (!newCustomLabel.trim()) return
    await addCustomStepItem('cell', step.key, newCustomLabel.trim())
    const items = await getCustomStepItems('cell', step.key)
    setCustomItems(items)
    setSelectedCustomKeys(prev => [...prev, items[items.length - 1].id])
    setNewCustomLabel('')
  }

  async function handleDeleteCustomItem(id) {
    await deleteCustomStepItem(id)
    const items = await getCustomStepItems('cell', step.key)
    setCustomItems(items)
    setSelectedCustomKeys(prev => prev.filter(k => k !== id))
  }

  async function handleDrop(targetId) {
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return }
    const items = [...customItems]
    const fromIdx = items.findIndex(i => i.id === draggedId)
    const toIdx = items.findIndex(i => i.id === targetId)
    const [moved] = items.splice(fromIdx, 1)
    items.splice(toIdx, 0, moved)
    await setCustomStepItemOrders(items.map(i => i.id))
    setCustomItems(items)
    setDraggedId(null)
    setDragOverId(null)
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
        if (cleaned) addMemory('cell', step.key, cleaned)
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

    const normalize = (s) => (s || '').replace(/\s/g, '').toLowerCase()
    const cellPassage = normalize(item.passage)
    const matchedSermon = sermons.find(s => {
      const sp = normalize(s.passage)
      return sp === cellPassage || sp.includes(cellPassage) || cellPassage.includes(sp)
    })
    let sermonContext = ''
    if (matchedSermon) {
      const steps = await getSermonSteps(matchedSermon.id)
      const parts = steps
        .filter(s => s.content)
        .sort((a, b) => a.stepIndex - b.stepIndex)
        .map(s => s.content.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
      if (parts.length > 0) sermonContext = parts.join('\n\n---\n\n')
    }

    const memory = step?.key ? buildMemoryPrompt('cell', step.key) : ''
    const customText = customItems
      .filter(i => selectedCustomKeys.includes(i.id))
      .map(i => i.text)
      .join('\n')

    try {
      await generateCellMaterial(
        item.passage, bible, lang, step.key,
        (text) => { accumulated = prevContent + SEP + titleLine + text; setAiContent(accumulated) },
        customText, effectiveKeyword, sermonContext, memory
      ).then(async () => {
        setAiContent(accumulated)
        resultHistory.reset(accumulated)
        setStepContents(prev => ({ ...prev, [currentStep]: accumulated }))
        await saveCellStep(item.id, currentStep, accumulated, '')
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

  function startEdit() {
    resultHistory.reset(aiContent)
    setInstructionsOpen(false)
    setEditing(true)
  }

  async function handleSave() {
    for (const [idx, ai] of Object.entries(stepContents)) {
      if (ai) await saveCellStep(item.id, Number(idx), ai, '')
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

  const displayAi = editing ? resultHistory.text : aiContent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 단계 탭 + 기본정보/저장/내보내기 버튼 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-sidebar)', alignItems: 'center' }}>
        <div className="no-scrollbar" style={{ display: 'flex', overflowX: 'auto', flex: 1, padding: '10px 16px', gap: 0, scrollbarWidth: 'none', alignItems: 'center' }}>
          {CELL_STEPS.map((s, idx) => {
            const isActive = s.index === currentStep
            const hasDot = stepContents[s.index]
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

        {/* 같은 본문 설교 뱃지 */}
        {(() => {
          if (!item?.passage) return null
          const normalize = (s) => (s || '').replace(/\s/g, '').toLowerCase()
          const cellPassage = normalize(item.passage)
          const matched = sermons.find(s => normalize(s.passage) === cellPassage || normalize(s.passage).includes(cellPassage) || cellPassage.includes(normalize(s.passage)))
          if (!matched) return null
          const label = matched.title || matched.passage
          return (
            <div
              onClick={() => onGoToSermon?.(matched.id, !matched.category?.includes('새벽'))}
              title="같은 본문의 설교가 있습니다. 클릭하면 이동합니다."
              style={{ flexShrink: 0, padding: '0 12px', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 20, padding: '4px 10px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>설교</span>
                <span style={{ fontSize: 11, color: 'var(--accent)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
              </div>
            </div>
          )
        })()}

        <div style={{ flexShrink: 0, padding: '0 14px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
          <button
            onClick={() => setInfoOpen(v => !v)}
            style={{ ...btnBase, background: infoOpen ? 'var(--accent)' : 'transparent', color: infoOpen ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (infoOpen ? 'var(--accent)' : 'var(--border)') }}
          >
            {lang === 'en' ? `Info ${infoOpen ? '▲' : '▼'}` : `기본정보 ${infoOpen ? '▲' : '▼'}`}
          </button>
          <button
            onClick={handleSave}
            style={{ ...btnBase, background: saved ? 'var(--accent)' : 'transparent', color: saved ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (saved ? 'var(--accent)' : 'var(--border)'), transition: 'all 0.2s' }}
          >
            {saved ? (lang === 'en' ? 'Saved' : '저장됨') : (lang === 'en' ? 'Save' : '저장')}
          </button>
          <button
            onClick={onExport}
            title={lang === 'en' ? 'Export as .json file' : '이 항목을 .json 파일로 내보내기 (에어드롭·공유용)'}
            style={{ ...btnBase, background: 'transparent', color: 'var(--text-muted)' }}
          >
            {lang === 'en' ? 'Export' : '내보내기'}
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
      <div ref={resultPanelRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* 툴바 */}
        <div style={{ height: 46, padding: '0 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setInstructionsOpen(v => !v)}
            style={{ ...btnBase, background: instructionsOpen ? 'var(--accent)' : 'transparent', color: instructionsOpen ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (instructionsOpen ? 'var(--accent)' : 'var(--border)') }}
          >
            {lang === 'en' ? 'Instructions' : '지시 항목'} {selectedCustomKeys.length}/{customItems.length}
          </button>
          <div style={{ flex: 1 }} />
          {displayAi && !loading && (
            <button
              onClick={() => { navigator.clipboard.writeText(stripHtml(displayAi)); setAiCopied(true); setTimeout(() => setAiCopied(false), 1500) }}
              style={{ ...btnBase, background: aiCopied ? 'var(--accent)' : 'transparent', color: aiCopied ? '#fff' : 'var(--text-muted)', border: '1px solid ' + (aiCopied ? 'var(--accent)' : 'var(--border)'), transition: 'all 0.2s' }}
            >
              {aiCopied ? (lang === 'en' ? 'Copied' : '복사됨') : (lang === 'en' ? 'Copy' : '복사')}
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
            {loading
              ? (lang === 'en' ? 'Stop' : '중지')
              : aiContent
                ? (lang === 'en' ? 'Regenerate' : '다시 생성')
                : (lang === 'en' ? 'Generate' : 'AI 생성')}
          </button>
        </div>

        {/* 지시 항목 패널 */}
        {!editing && instructionsOpen && (
          <div style={{ borderBottom: '1px solid var(--border)', padding: '10px 16px', background: 'var(--bg-sidebar)', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              {customItems.map(ci => (
                editingCustom ? (
                  <div
                    key={ci.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', String(ci.id)); setDraggedId(ci.id) }}
                    onDragOver={e => { e.preventDefault(); setDragOverId(ci.id) }}
                    onDrop={e => { e.preventDefault(); handleDrop(ci.id) }}
                    onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: dragOverId === ci.id ? 'var(--accent)' : 'rgba(99,102,241,0.12)',
                      color: dragOverId === ci.id ? '#fff' : 'var(--accent)',
                      border: `1px solid ${draggedId === ci.id ? 'transparent' : 'var(--accent)'}`,
                      borderRadius: 14, padding: '3px 10px',
                      fontSize: 13, cursor: 'grab', userSelect: 'none',
                      opacity: draggedId === ci.id ? 0.4 : 1,
                    }}
                  >
                    ≡ {ci.label}
                    <span onPointerDown={e => { e.stopPropagation(); handleDeleteCustomItem(ci.id) }} style={{ cursor: 'pointer', opacity: 0.7, fontSize: 15, lineHeight: 1 }}>×</span>
                  </div>
                ) : (
                  <label key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: 'var(--accent)', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={selectedCustomKeys.includes(ci.id)}
                      onChange={() => toggleCustomItem(ci.id)}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 14, height: 14 }}
                    />
                    {ci.label}
                  </label>
                )
              ))}

              {editingCustom && (
                <input
                  autoFocus
                  value={newCustomLabel}
                  onChange={e => setNewCustomLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCustomItem(); if (e.key === 'Escape') { setEditingCustom(false); setNewCustomLabel('') } }}
                  placeholder={lang === 'en' ? 'New item' : '새 항목'}
                  style={{ width: 90, fontSize: 13, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                />
              )}

              {!editingCustom
                ? <button onClick={() => setEditingCustom(true)} style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 5, padding: '2px 9px', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>{lang === 'en' ? 'Edit' : '편집'}</button>
                : <button onClick={() => { setEditingCustom(false); setNewCustomLabel('') }} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, padding: '2px 9px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>{lang === 'en' ? 'Done' : '완료'}</button>
              }
            </div>
            <input
              value={userKeyword}
              onChange={e => setUserKeyword(e.target.value)}
              placeholder={lang === 'en' ? 'Additional keywords or instructions (e.g. Youth group, Easter)' : '추가 키워드나 지시사항 (예: 청년 대상, 부활절 주제)'}
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
                <div className="plain-view" dangerouslySetInnerHTML={{ __html: aiContent.replace(/<p[^>]*>(\s|<br\s*\/?>)*<\/p>/gi, '') }} style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }} />
              ) : (
                <div className="plain-view" style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }}>
                  {aiContent.split('\n').filter(l => l.trim() !== '').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )
            ) : !loading && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, textAlign: 'center', marginTop: 60 }}>
                {item?.passage
                  ? (lang === 'en' ? `Click Generate to create ${step.label.en}.` : `AI 생성 버튼을 눌러 ${step.label.ko}을 생성합니다.`)
                  : (lang === 'en' ? 'Enter a Bible passage in Info first.' : '기본정보에서 성경 본문을 먼저 입력하세요.')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
