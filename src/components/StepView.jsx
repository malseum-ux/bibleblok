import { useState, useEffect, useRef, Fragment } from 'react'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'
import { generateSermonStep, generateWorshipCombined, generateDawnCombined, refineDraft, executeInlineCommand, stopCurrentGeneration, SERMON_STEP_ITEMS, WORSHIP_STEP_ITEMS, DAWN_STEP_ITEMS } from '../claude'
import { saveSermonStep, saveWorshipStep, saveDawnStep, getSermonSteps, getWorshipSteps, getDawnSteps, updateSermon, updateDawn, getSeriesContext, getCustomStepItems, getAllCustomStepItemsForTab, addCustomStepItem, deleteCustomStepItem, setCustomStepItemOrders } from '../db'
import SermonForm from './SermonForm'
import WorshipForm from './WorshipForm'
import DawnForm from './DawnForm'
import RichEditor from './RichEditor'

function stripHtml(html) {
  if (!html || !html.trimStart().startsWith('<')) return html
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || ''
}

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

export default function StepView({ tab, item, lang, bible, fontSize = 14, onFontSizeChange, isMobile = false, onSaveItem, onItemUpdate, onGenerated, onExport }) {
  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : DAWN_STEPS

  const [currentStep, setCurrentStep] = useState(0)
  const [stepContents, setStepContents] = useState({})
  const [content, setContent] = useState('')
  const draftHistory = useTextHistory(item?.draft || '', item?.id)
  const [editing, setEditing] = useState(false)
  const [draftEditing, setDraftEditing] = useState(false)
  const [refining, setRefining] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [resultCopied, setResultCopied] = useState(false)
  const [draftCopied, setDraftCopied] = useState(false)
  const [manualSaved, setManualSaved] = useState(false)
  const resultHistory = useTextHistory('', null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [stepSelectedItems, setStepSelectedItems] = useState({})
  const [userKeyword, setUserKeyword] = useState('')
  const [customItems, setCustomItems] = useState([])
  const [selectedCustomKeys, setSelectedCustomKeys] = useState([])
  const [stepSelectedCustomKeys, setStepSelectedCustomKeys] = useState({})
  const [editingCustom, setEditingCustom] = useState(false)
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [leftPct, setLeftPct] = useState(50)
  const [mobilePanel, setMobilePanel] = useState('result')
  const draftTimer = useRef(null)
  const resultEditTimer = useRef(null)
  const splitContainerRef = useRef(null)
  const resultDivRef = useRef(null)
  const lastSelectionRef = useRef('')
  const resultPanelRef = useRef(null)
  const finishEditRef = useRef(null)
  const draftPanelRef = useRef(null)
  const draftFinishEditRef = useRef(null)

  const step = steps[currentStep] || steps[0]
  const stepItemsDefs = tab === 'sermon' ? SERMON_STEP_ITEMS : tab === 'worship' ? WORSHIP_STEP_ITEMS : DAWN_STEP_ITEMS
  const currentItems = stepItemsDefs[step?.key] || []
  const hasItems = currentItems.length >= 2 || customItems.length > 0

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
      console.log('[STEP] 단계내용 로드:', item.id, '초안(draft):', item.draft?.slice(0, 30), '/ 단계수:', saved.length)
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

  // 단계 변경 시 커스텀 항목 로드
  useEffect(() => {
    if (!step?.key) return
    getCustomStepItems(tab, step.key).then(items => {
      setCustomItems(items)
      setSelectedCustomKeys(prev => {
        const allIds = items.map(i => i.id)
        // 이전에 선택한 항목 유지, 새 항목은 선택 추가
        const kept = prev.filter(id => allIds.includes(id))
        const added = allIds.filter(id => !prev.includes(id))
        return [...kept, ...added]
      })
    })
    setEditingCustom(false)
    setNewCustomLabel('')
  }, [tab, step?.key])

  // 다른 항목/단계로 이동하면 단계별 선택 및 편집 초기화
  useEffect(() => {
    setStepSelectedItems({})
    setStepSelectedCustomKeys({})
    setEditing(false)
  }, [item?.id, tab, currentStep])

  // 탭/단계/항목 변경 시 해당 기본 키워드 로드
  useEffect(() => {
    if (!step?.key) return
    const saved = localStorage.getItem(`defaultKeyword_${tab}_${step.key}`) || ''
    setUserKeyword(saved)
  }, [tab, step?.key, item?.id]) // eslint-disable-line


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

  function toggleCustomItem(id) {
    if (tab === 'sermon') {
      setSelectedCustomKeys(prev =>
        prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
      )
    } else {
      setStepSelectedCustomKeys(prev => {
        const current = prev[step.key] ?? customItems.map(i => i.id)
        return {
          ...prev,
          [step.key]: current.includes(id) ? current.filter(k => k !== id) : [...current, id],
        }
      })
    }
  }

  async function handleAddCustomItem() {
    if (!newCustomLabel.trim()) return
    await addCustomStepItem(tab, step.key, newCustomLabel.trim())
    const items = await getCustomStepItems(tab, step.key)
    setCustomItems(items)
    setSelectedCustomKeys(prev => [...prev, items[items.length - 1].id])
    setNewCustomLabel('')
  }

  async function handleDeleteCustomItem(id) {
    await deleteCustomStepItem(id)
    const items = await getCustomStepItems(tab, step.key)
    setCustomItems(items)
    setSelectedCustomKeys(prev => prev.filter(k => k !== id))
    setStepSelectedCustomKeys(prev => ({
      ...prev,
      [step.key]: (prev[step.key] ?? []).filter(k => k !== id),
    }))
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

    // "기억해(줘/주세요)" 트리거 처리: 저장 후 제거된 키워드로 생성
    let effectiveKeyword = userKeyword
    if (/기억해(?:줘|주세요)?/.test(userKeyword)) {
      const cleaned = userKeyword.replace(/기억해(?:줘|주세요)?/g, '').replace(/^[,\s]+|[,\s]+$/g, '').trim()
      if (step?.key) {
        if (cleaned) localStorage.setItem(`defaultKeyword_${tab}_${step.key}`, cleaned)
        else localStorage.removeItem(`defaultKeyword_${tab}_${step.key}`)
      }
      effectiveKeyword = cleaned
      setUserKeyword(cleaned)
    }

    const prevContent = content
    const SEP = prevContent ? '\n\n' + '─'.repeat(30) + '\n\n' : ''
    const activeItems = hasItems ? selectedItems : null
    // 커스텀 항목 텍스트 빌드
    const buildCustomText = (ids, items) =>
      items.filter(i => ids.includes(i.id)).map(i => i.text).join('\n')

    try {
      if (tab === 'sermon') {
        const seriesCtx = await getSeriesContext('sermon', item.category, item.id)
        const customText = buildCustomText(selectedCustomKeys, customItems)
        await generateSermonStep(
          step.key, item.passage, item.emphasis, lang, bible, seriesCtx,
          (text) => setContent(prevContent + SEP + text), activeItems, effectiveKeyword, customText
        ).then(async (full) => {
          const combined = prevContent + SEP + full
          await saveSermonStep(item.id, currentStep, combined)
          setStepContents(prev => ({ ...prev, [currentStep]: combined }))
          onGenerated?.(item.id)
        })
      } else if (tab === 'worship') {
        const allCustom = await getAllCustomStepItemsForTab('worship')
        const customStepTexts = {}
        for (const s of WORSHIP_STEPS) {
          const stepCustom = allCustom.filter(i => i.stepKey === s.key)
          const selectedIds = stepSelectedCustomKeys[s.key] ?? stepCustom.map(i => i.id)
          const text = buildCustomText(selectedIds, stepCustom)
          if (text) customStepTexts[s.key] = text
        }
        await generateWorshipCombined(
          item.date, item.season, item.lectionary, lang, bible,
          stepSelectedItems, (text) => setContent(prevContent + SEP + text), effectiveKeyword, customStepTexts
        ).then(async (full) => {
          const combined = prevContent + SEP + full
          await saveWorshipStep(item.id, 0, combined)
          setStepContents(prev => ({ ...prev, [0]: combined }))
          onGenerated?.(item.id)
        })
      } else {
        const seriesCtx = await getSeriesContext('dawn', item.category, item.id)
        const allCustom = await getAllCustomStepItemsForTab('dawn')
        const customStepTexts = {}
        for (const s of DAWN_STEPS) {
          const stepCustom = allCustom.filter(i => i.stepKey === s.key)
          const selectedIds = stepSelectedCustomKeys[s.key] ?? stepCustom.map(i => i.id)
          const text = buildCustomText(selectedIds, stepCustom)
          if (text) customStepTexts[s.key] = text
        }
        await generateDawnCombined(
          item.passage, item.emphasis, lang, bible, seriesCtx,
          stepSelectedItems, (text) => setContent(prevContent + SEP + text), effectiveKeyword, customStepTexts
        ).then(async (full) => {
          const combined = prevContent + SEP + full
          await saveDawnStep(item.id, 0, combined)
          setStepContents(prev => ({ ...prev, [0]: combined }))
          onGenerated?.(item.id)
        })
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        // 사용자가 중지 — 에러 표시 없이 현재 내용 유지
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
    const textToAdd = lastSelectionRef.current || content
    lastSelectionRef.current = ''
    const existingHtml = draftHistory.text
    // textToAdd를 HTML 단락으로 변환하여 기존 초안에 붙임 (기존 서식 유지)
    const addHtml = textToAdd.trimStart().startsWith('<')
      ? textToAdd
      : textToAdd.split('\n').map(l => l === '' ? '<p><br></p>' : `<p>${l}</p>`).join('')
    const separator = stripHtml(existingHtml).trim() ? '<p><br></p>' : ''
    handleDraftChange(existingHtml + separator + addHtml)
  }

  function saveDraftNow() {
    clearTimeout(draftTimer.current)
    if (tab === 'dawn') updateDawn(item.id, { draft: draftHistory.text })
    else updateSermon(item.id, { draft: draftHistory.text })
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 1500)
  }

  async function refineSermonDraft() {
    const plainText = stripHtml(draftHistory.text)
    if (!plainText.trim() || refining || loading) return
    const originalHtml = draftHistory.text
    draftHistory.forceSnapshot()
    setRefining(true)
    try {
      const refined = await refineDraft(plainText, lang, bible, (text) => {
        draftHistory.onChange(text)
      })
      handleDraftChange(refined)
    } catch {
      handleDraftChange(originalHtml)
    } finally {
      setRefining(false)
    }
  }

  async function handleDraftSlashCommand({ instruction, contextBefore, contextAfter }) {
    if (!item) return
    draftHistory.forceSnapshot()
    setRefining(true)
    const fallback = draftHistory.text
    let generated = ''
    try {
      await executeInlineCommand(instruction, contextBefore, contextAfter, lang, bible, item.passage, item.title, (chunk) => {
        generated = chunk
        draftHistory.onChange(contextBefore + chunk + contextAfter)
      })
      handleDraftChange(contextBefore + generated + contextAfter)
    } catch {
      handleDraftChange(fallback)
    } finally {
      setRefining(false)
    }
  }

  async function handleResultKeyDown(e) {
    if (e.key !== 'Enter' || e.shiftKey) return
    const text = resultHistory.text
    const cursor = resultTextareaRef.current?.selectionStart ?? 0
    const textBeforeCursor = text.slice(0, cursor)
    const lastNewline = textBeforeCursor.lastIndexOf('\n')
    const currentLineStart = lastNewline + 1
    const currentLine = textBeforeCursor.slice(currentLineStart)
    const slashIdx = currentLine.indexOf('//')
    if (slashIdx === -1) return
    const instruction = currentLine.slice(slashIdx + 2).trim()
    if (!instruction) return
    e.preventDefault()
    const contextBefore = text.slice(0, currentLineStart + slashIdx)
    const contextAfter = text.slice(cursor)
    resultHistory.forceSnapshot()
    setRefining(true)
    try {
      let generated = ''
      await executeInlineCommand(instruction, contextBefore, contextAfter, lang, bible, item.passage, item.title, (chunk) => {
        generated = chunk
        resultHistory.onChange(contextBefore + chunk + contextAfter)
      })
      resultHistory.onChange(contextBefore + generated + contextAfter)
    } catch {
      resultHistory.onChange(text)
    } finally {
      setRefining(false)
    }
  }

  async function handleSaveItem(formData) {
    await onSaveItem?.(formData)
    setInfoOpen(false)
  }

  function startEdit() {
    resultHistory.reset(content)
    setInstructionsOpen(false)
    setEditing(true)
  }

  async function saveEdit() {
    const text = resultHistory.text
    if (tab === 'sermon') {
      await saveSermonStep(item.id, currentStep, text)
      setStepContents(prev => ({ ...prev, [currentStep]: text }))
    } else if (tab === 'worship') {
      await saveWorshipStep(item.id, 0, text)
      setStepContents(prev => ({ ...prev, [0]: text }))
    } else {
      await saveDawnStep(item.id, 0, text)
      setStepContents(prev => ({ ...prev, [0]: text }))
    }
    setContent(text)
    setEditing(false)
    onGenerated?.(item.id)
  }

  function cancelEdit() {
    setEditing(false)
  }

  async function handleManualSave() {
    clearTimeout(draftTimer.current)
    console.log('[SAVE] 저장 버튼 클릭 - 초안:', draftHistory.text.slice(0, 30), '/ 결과내용:', content.slice(0, 30))
    if (stripHtml(draftHistory.text).trim()) {
      if (tab === 'dawn') await updateDawn(item.id, { draft: draftHistory.text })
      else if (tab === 'sermon') await updateSermon(item.id, { draft: draftHistory.text })
      console.log('[SAVE] 초안 저장 완료')
    } else {
      console.log('[SAVE] 초안이 비어서 저장 안함')
    }
    // 결과 내용도 함께 저장 (편집 중이거나 내용이 있으면)
    if (content.trim()) {
      clearTimeout(resultEditTimer.current)
      if (tab === 'sermon') await saveSermonStep(item.id, currentStep, content)
      else if (tab === 'worship') await saveWorshipStep(item.id, 0, content)
      else await saveDawnStep(item.id, 0, content)
      setStepContents(prev => ({ ...prev, [tab === 'sermon' ? currentStep : 0]: content }))
      console.log('[SAVE] 결과내용 저장 완료')
    }
    await onGenerated?.(item.id)
    onItemUpdate?.()
    setManualSaved(true)
    setTimeout(() => setManualSaved(false), 1500)
  }

  useEffect(() => {
    if (!editing) return
    clearTimeout(resultEditTimer.current)
    resultEditTimer.current = setTimeout(async () => {
      const text = resultHistory.text
      if (!text.trim()) return
      if (tab === 'sermon') {
        await saveSermonStep(item.id, currentStep, text)
        setStepContents(prev => ({ ...prev, [currentStep]: text }))
      } else if (tab === 'worship') {
        await saveWorshipStep(item.id, 0, text)
        setStepContents(prev => ({ ...prev, [0]: text }))
      } else {
        await saveDawnStep(item.id, 0, text)
        setStepContents(prev => ({ ...prev, [0]: text }))
      }
      onGenerated?.(item.id)
      onItemUpdate?.()
    }, 800)
  }, [resultHistory.text, editing]) // eslint-disable-line

  // 생성/수정 중 자동 스크롤
  useEffect(() => {
    if (loading && resultDivRef.current) {
      resultDivRef.current.scrollTop = resultDivRef.current.scrollHeight
    }
  }, [content, loading])

  // 매 렌더마다 최신 resultHistory.text를 참조하도록 유지
  finishEditRef.current = () => {
    setContent(resultHistory.text)
    setEditing(false)
  }

  // 결과창 바깥 클릭 시 편집 종료
  useEffect(() => {
    if (!editing) return
    function handleMouseDown(e) {
      if (resultPanelRef.current && !resultPanelRef.current.contains(e.target)) {
        finishEditRef.current()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [editing])

  // 초안창 바깥 클릭 시 편집 종료
  draftFinishEditRef.current = () => setDraftEditing(false)
  useEffect(() => {
    if (!draftEditing) return
    function handleMouseDown(e) {
      if (draftPanelRef.current && !draftPanelRef.current.contains(e.target)) {
        draftFinishEditRef.current()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [draftEditing])

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
        <div className="no-scrollbar" style={{
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

        {/* 기본정보 + 저장 버튼 - 우측 고정 */}
        <div style={{ flexShrink: 0, padding: '0 14px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
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
          <button
            onClick={handleManualSave}
            style={{
              background: manualSaved ? 'var(--accent)' : 'transparent',
              color: manualSaved ? '#fff' : 'var(--text-muted)',
              border: '1px solid ' + (manualSaved ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {manualSaved ? '저장됨' : '저장'}
          </button>
          <button
            onClick={onExport}
            title="이 항목을 .json 파일로 내보내기 (에어드롭·공유용)"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            내보내기
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

      {/* 모바일 설교탭: 결과/초안 전환 탭 */}
      {isMobile && tab === 'sermon' && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-sidebar)' }}>
          {[['result', 'AI 결과'], ['draft', '설교 초안']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMobilePanel(key)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 600,
                background: mobilePanel === key ? 'var(--accent)' : 'transparent',
                color: mobilePanel === key ? '#fff' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>
      )}

      {/* 본문 영역 */}
      <div ref={splitContainerRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 좌: AI 생성 내용 */}
        <div ref={resultPanelRef} style={{
          width: tab === 'sermon' && !isMobile ? `${leftPct}%` : '100%',
          flexShrink: 0,
          display: isMobile && tab === 'sermon' && mobilePanel === 'draft' ? 'none' : 'flex',
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
                        지시 항목 {displaySelected.length + (tab === 'sermon' ? selectedCustomKeys : (stepSelectedCustomKeys[step?.key] ?? customItems.map(i => i.id))).length}/{currentItems.length + customItems.length}
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    {content && !loading && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(stripHtml(editing ? resultHistory.text : content))
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
                    {content && !loading && onFontSizeChange && (
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', height: 28 }}>
                        <button
                          onClick={() => onFontSizeChange(Math.max(11, fontSize - 1))}
                          style={{ background: 'none', border: 'none', borderRight: '1px solid var(--border)', padding: '0 7px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1 }}
                        >A-</button>
                        <button
                          onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
                          style={{ background: 'none', border: 'none', borderLeft: '1px solid var(--border)', padding: '0 7px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1 }}
                        >A+</button>
                      </div>
                    )}
                    <button
                      onClick={loading ? stopCurrentGeneration : generate}
                      style={{
                        background: loading ? '#dc2626' : 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '5px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {loading
                        ? (lang === 'ko' ? '중지' : 'Stop')
                        : (content ? (lang === 'ko' ? '다시 생성' : 'Regenerate') : (lang === 'ko' ? 'AI 생성' : 'Generate'))}
                    </button>
                  </>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
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

                      {customItems.map(ci => {
                        const isSelected = tab === 'sermon'
                          ? selectedCustomKeys.includes(ci.id)
                          : (stepSelectedCustomKeys[step.key] ?? customItems.map(i => i.id)).includes(ci.id)
                        return editingCustom ? (
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
                              checked={isSelected}
                              onChange={() => toggleCustomItem(ci.id)}
                              style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 14, height: 14 }}
                            />
                            {ci.label}
                          </label>
                        )
                      })}

                      {editingCustom && (
                        <input
                          autoFocus
                          value={newCustomLabel}
                          onChange={e => setNewCustomLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddCustomItem(); if (e.key === 'Escape') { setEditingCustom(false); setNewCustomLabel('') } }}
                          placeholder="새 항목"
                          style={{ width: 90, fontSize: 13, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                        />
                      )}

                      {!editingCustom
                        ? <button onClick={() => setEditingCustom(true)} style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 5, padding: '2px 9px', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>편집</button>
                        : <button onClick={() => { setEditingCustom(false); setNewCustomLabel('') }} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, padding: '2px 9px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>완료</button>
                      }
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

          {/* 결과창: 편집 모드이면 RichEditor, 아니면 읽기 전용 */}
          {editing ? (
            <RichEditor
              fixedToolbar
              value={resultHistory.text}
              onChange={resultHistory.onChange}
              baseFontSize={fontSize}
            />
          ) : (
            <div
              ref={resultDivRef}
              onClick={content && !loading ? startEdit : undefined}
              style={{ flex: 1, overflow: 'auto', padding: '20px 24px', cursor: content && !loading ? 'text' : 'default' }}
            >
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}
              {content ? (
                content.trimStart().startsWith('<') ? (
                  <div
                    className="rich-view"
                    onMouseUp={() => {
                      const sel = window.getSelection()?.toString().trim()
                      lastSelectionRef.current = sel || ''
                    }}
                    dangerouslySetInnerHTML={{ __html: content }}
                    style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }}
                  />
                ) : (
                  <div
                    onMouseUp={() => {
                      const sel = window.getSelection()?.toString().trim()
                      lastSelectionRef.current = sel || ''
                    }}
                    style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }}
                  >
                    {content.split('\n').map((line, i, arr) => (
                      <Fragment key={i}>
                        {line}
                        {i < arr.length - 1 && <br />}
                      </Fragment>
                    ))}
                  </div>
                )
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

        {/* 드래그 핸들 (설교 탭, 데스크탑만) */}
        {tab === 'sermon' && !isMobile && (
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
        {tab === 'sermon' && (!isMobile || mobilePanel === 'draft') && (
          <div ref={draftPanelRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: isMobile ? '100%' : undefined }}>
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
              <span style={{ flexShrink: 0 }}>{lang === 'ko' ? '설교문 초안' : 'Sermon Draft'}</span>
              <input
                type="text"
                value={userKeyword}
                onChange={e => setUserKeyword(e.target.value)}
                placeholder={lang === 'ko' ? '키워드 지시어 (예: 청년 대상)' : 'Keyword directive'}
                style={{
                  flex: 1,
                  margin: '0 10px',
                  fontSize: 12,
                  padding: '3px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  outline: 'none',
                  minWidth: 0,
                }}
              />
              {(() => {
                const draftHasContent = !!stripHtml(draftHistory.text).trim()
                return (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(stripHtml(draftHistory.text))
                        setDraftCopied(true)
                        setTimeout(() => setDraftCopied(false), 1500)
                      }}
                      disabled={!draftHasContent}
                      style={{
                        background: draftCopied ? 'var(--accent)' : 'transparent',
                        color: draftCopied ? '#fff' : 'var(--text-muted)',
                        border: '1px solid ' + (draftCopied ? 'var(--accent)' : 'var(--border)'),
                        borderRadius: 5,
                        padding: '2px 9px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: draftHasContent ? 'pointer' : 'default',
                        opacity: !draftHasContent ? 0.4 : 1,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                      }}
                    >
                      {draftCopied ? '복사됨' : '복사'}
                    </button>
                    <button
                      onClick={refineSermonDraft}
                      disabled={refining || loading || !draftHasContent}
                      style={{
                        background: refining ? 'var(--border)' : 'var(--accent-light)',
                        color: refining ? 'var(--text-muted)' : 'var(--accent)',
                        border: '1px solid ' + (refining ? 'var(--border)' : 'var(--accent)'),
                        borderRadius: 5,
                        padding: '2px 9px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: (refining || loading || !draftHasContent) ? 'default' : 'pointer',
                        opacity: !draftHasContent ? 0.4 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {refining ? (lang === 'ko' ? '다듬는 중...' : 'Refining...') : (lang === 'ko' ? 'AI 다듬기' : 'AI Refine')}
                    </button>
                  </>
                )
              })()}
              {onFontSizeChange && (
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 5, overflow: 'hidden', height: 24, flexShrink: 0 }}>
                  <button onClick={() => onFontSizeChange(Math.max(11, fontSize - 1))} style={{ background: 'none', border: 'none', borderRight: '1px solid var(--border)', padding: '0 6px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1 }}>A-</button>
                  <button onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))} style={{ background: 'none', border: 'none', borderLeft: '1px solid var(--border)', padding: '0 6px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1 }}>A+</button>
                </div>
              )}
              <button onClick={draftHistory.undo} disabled={!draftHistory.canUndo} style={undoBtnStyle(draftHistory.canUndo)}>↩</button>
              <button onClick={draftHistory.redo} disabled={!draftHistory.canRedo} style={undoBtnStyle(draftHistory.canRedo)}>↪</button>
            </div>
            {draftEditing ? (
              <RichEditor
                fixedToolbar
                editable={!refining}
                value={draftHistory.text}
                onChange={handleDraftChange}
                baseFontSize={fontSize}
                onEnterCommand={handleDraftSlashCommand}
              />
            ) : (
              <div
                onClick={() => setDraftEditing(true)}
                style={{ flex: 1, overflow: 'auto', padding: '20px 24px', cursor: 'text' }}
              >
                {draftHistory.text ? (
                  draftHistory.text.trimStart().startsWith('<') ? (
                    <div className="rich-view" dangerouslySetInnerHTML={{ __html: draftHistory.text }} style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }} />
                  ) : (
                    <div style={{ lineHeight: 1.8, color: 'var(--text)', fontSize }}>
                      {draftHistory.text.split('\n').map((line, i, arr) => (
                        <Fragment key={i}>{line}{i < arr.length - 1 && <br />}</Fragment>
                      ))}
                    </div>
                  )
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
                    {lang === 'ko' ? '클릭하여 설교문 초안을 작성하세요' : 'Click to start writing'}
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
