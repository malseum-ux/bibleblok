import { useState, useRef, useEffect } from 'react'
import { executeSelectionEdit, stopCurrentGeneration } from '../claude'

// ── 드래그해서 고치기 ─────────────────────────────────────────────────────────
// 보기 화면에서 드래그한 부분을 "몇 번째 글자부터 몇 번째 글자까지"로 기억하고,
// 저장된 원래 글(HTML 또는 일반 글)에서 같은 위치를 찾아 그 부분만 바꾼다.
// 공백만 있는 텍스트 조각은 세지 않는다 — 보기 화면이 빈 줄을 숨겨도 위치가 어긋나지 않도록.

const BLOCK_TAGS = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'DIV'])

function closestBlock(node, root) {
  let n = node.nodeType === 3 ? node.parentNode : node
  while (n && n !== root) {
    if (BLOCK_TAGS.has(n.nodeName)) return n
    n = n.parentNode
  }
  return null
}

function collectTextNodes(root) {
  const doc = root.ownerDocument
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */)
  const list = []
  let n
  while ((n = walker.nextNode())) {
    if (!n.nodeValue.trim()) continue
    list.push({ node: n, len: n.nodeValue.length, block: closestBlock(n, root) })
  }
  return list
}

function offsetOf(nodes, container, offset) {
  const doc = container.ownerDocument
  const point = doc.createRange()
  point.setStart(container, offset)
  point.collapse(true)
  let acc = 0
  for (const { node, len } of nodes) {
    if (node === container) return acc + Math.min(offset, len)
    if (point.comparePoint(node, len) <= 0) acc += len
    else return acc
  }
  return acc
}

// 선택 구간의 글 — 문단이 바뀌는 곳에는 줄바꿈을 넣는다 (AI가 문단 나눔을 알 수 있도록)
function textBetween(nodes, start, end) {
  let acc = 0
  let out = ''
  let prevBlock
  for (const { node, len, block } of nodes) {
    const s = Math.max(start, acc)
    const e = Math.min(end, acc + len)
    if (s < e) {
      if (out && block !== prevBlock) out += '\n'
      out += node.nodeValue.slice(s - acc, e - acc)
      prevBlock = block
    }
    acc += len
  }
  return out
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 보기 화면과 같은 규칙으로 일반 글을 문단(<p>)으로 바꾼다
function sourceToHtml(source) {
  if (!source) return ''
  if (source.trimStart().startsWith('<')) return source
  return source
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('')
}

function getSelectionInfo(container) {
  if (!container) return null
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null
  if (!range.toString().trim()) return null

  const nodes = collectTextNodes(container)
  const start = offsetOf(nodes, range.startContainer, range.startOffset)
  const end = offsetOf(nodes, range.endContainer, range.endOffset)
  if (end <= start) return null

  const total = nodes.reduce((sum, n) => sum + n.len, 0)
  const rect = range.getBoundingClientRect()
  return {
    start,
    end,
    text: textBetween(nodes, start, end),
    contextBefore: textBetween(nodes, Math.max(0, start - 600), start),
    contextAfter: textBetween(nodes, end, Math.min(total, end + 600)),
    rect: { top: rect.top, bottom: rect.bottom, left: rect.left },
  }
}

// 원래 글에서 start~end 구간을 newText로 바꾼 HTML을 돌려준다
function replaceByOffsets(source, start, end, newText) {
  const doc = new DOMParser().parseFromString(`<div>${sourceToHtml(source)}</div>`, 'text/html')
  const root = doc.body.firstChild
  const nodes = collectTextNodes(root)

  let acc = 0
  let startPos = null
  let endPos = null
  for (const { node, len } of nodes) {
    if (!startPos && start < acc + len) startPos = { node, offset: Math.max(0, start - acc) }
    if (!endPos && end <= acc + len) endPos = { node, offset: end - acc }
    acc += len
  }
  if (!startPos || !endPos) return null

  const range = doc.createRange()
  range.setStart(startPos.node, startPos.offset)
  range.setEnd(endPos.node, endPos.offset)
  const startBlock = closestBlock(startPos.node, root)
  const endBlock = closestBlock(endPos.node, root)
  range.deleteContents()

  const lines = newText.split(/\n+/).map(l => l.trim()).filter(Boolean)
  // 지운 뒤에도 시작 글자 조각은 남아 있으므로, 그 조각의 원래 위치에 바로 이어 쓴다
  // (여러 문단을 지우면 range가 문단 밖으로 접히기 때문에 range 위치를 쓰지 않는다)
  const anchorNode = startPos.node
  const firstText = startBlock && endBlock ? (lines[0] || '') : lines.join(' ')
  anchorNode.insertData(startPos.offset, firstText)

  // 문단 구분이 없는 글(드묾)은 한 덩어리로 넣는다
  if (!startBlock || !endBlock) return root.innerHTML

  if (lines.length <= 1) {
    // 여러 문단에 걸친 선택을 한 문단으로 고친 경우 — 뒤 문단을 앞 문단에 합친다
    if (startBlock !== endBlock) {
      while (endBlock.firstChild) startBlock.appendChild(endBlock.firstChild)
      endBlock.remove()
    }
    return root.innerHTML
  }

  const makeP = (text) => {
    const p = doc.createElement('p')
    if (text) p.appendChild(doc.createTextNode(text))
    return p
  }
  const middle = lines.slice(1, -1).map(makeP)
  const lastLine = lines[lines.length - 1]

  if (startBlock === endBlock) {
    // 한 문단 안에서 선택 → 선택 뒤에 있던 글은 마지막 새 문단 끝으로 옮긴다
    const tail = doc.createRange()
    tail.setStart(anchorNode, startPos.offset + firstText.length)
    tail.setEnd(startBlock, startBlock.childNodes.length)
    const suffix = tail.extractContents()
    const last = makeP(lastLine)
    last.appendChild(suffix)
    let anchor = startBlock
    for (const p of [...middle, last]) { anchor.after(p); anchor = p }
  } else {
    let anchor = startBlock
    for (const p of middle) { anchor.after(p); anchor = p }
    endBlock.insertBefore(doc.createTextNode(lastLine), endBlock.firstChild)
  }
  return root.innerHTML
}

// 보기 화면에 붙이는 훅 — 드래그가 끝나면 입력칸을 열고, 드래그 뒤의 클릭은 편집 전환으로 치지 않는다
export function useSelectionEdit(contentRef, enabled) {
  const [info, setInfo] = useState(null)
  const skipClickRef = useRef(false)

  function onMouseUp() {
    if (!enabled) return
    const next = getSelectionInfo(contentRef.current)
    if (next) {
      skipClickRef.current = true
      setInfo(next)
    }
  }

  function consumeClick() {
    if (skipClickRef.current) {
      skipClickRef.current = false
      return true
    }
    return false
  }

  function close() {
    skipClickRef.current = false
    setInfo(null)
  }

  return { info, onMouseUp, consumeClick, close }
}

export function SelectionEditBox({ info, source, onApply, onClose, lang, bible, passage, title }) {
  const [instruction, setInstruction] = useState('')
  const [status, setStatus] = useState('input') // input | loading | done | error
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const prevSourceRef = useRef(null)
  const boxRef = useRef(null)
  const statusRef = useRef(status)
  statusRef.current = status

  // 바깥을 누르면 닫기 (생성 중에는 유지)
  useEffect(() => {
    function handleMouseDown(e) {
      if (statusRef.current === 'loading') return
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  async function submit() {
    const text = instruction.replace(/^\/\//, '').trim()
    if (!text || status === 'loading') return
    setStatus('loading')
    setPreview('')
    setError('')
    try {
      const result = await executeSelectionEdit(
        info.text, text, info.contextBefore, info.contextAfter,
        lang, bible, passage, title, chunk => setPreview(chunk),
      )
      const next = replaceByOffsets(source, info.start, info.end, result)
      if (next === null) throw new Error(lang === 'en' ? 'Could not find the selected text.' : '선택한 위치를 찾지 못했습니다.')
      prevSourceRef.current = source
      await onApply(next)
      setStatus('done')
    } catch (e) {
      if (e.name === 'AbortError') { setStatus('input'); return }
      setError(e.message)
      setStatus('error')
    }
  }

  async function undo() {
    if (prevSourceRef.current === null) return
    await onApply(prevSourceRef.current)
    onClose()
  }

  const width = 340
  const left = Math.min(Math.max(8, info.rect.left), window.innerWidth - width - 8)
  const below = info.rect.bottom + 8
  const top = below + 220 > window.innerHeight ? Math.max(8, info.rect.top - 228) : below

  const btn = {
    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
    borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
  }

  return (
    <div
      ref={boxRef}
      onMouseDown={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', top, left, width, zIndex: 9999,
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)', padding: 10, boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
        {lang === 'en' ? 'Edit selection with AI' : '선택한 부분 AI 수정'}
      </div>

      {(status === 'input' || status === 'error') && (
        <input
          autoFocus
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
            if (e.key === 'Escape') onClose()
          }}
          placeholder={lang === 'en' ? 'Instruction (e.g. shorten, soften) · Enter' : '수정 지시 (예: 짧게 줄여, 부드럽게) · Enter'}
          style={{
            width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '7px 10px',
            border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)',
            color: 'var(--text)', outline: 'none',
          }}
        />
      )}

      {status === 'loading' && (
        <>
          <div style={{
            maxHeight: 150, overflow: 'auto', fontSize: 12, lineHeight: 1.6, color: 'var(--text)',
            background: 'var(--bg-sidebar)', borderRadius: 6, padding: '6px 8px', whiteSpace: 'pre-wrap',
          }}>
            {preview || (lang === 'en' ? 'Editing...' : '고치는 중...')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={stopCurrentGeneration} style={btn}>{lang === 'en' ? 'Stop' : '중지'}</button>
          </div>
        </>
      )}

      {status === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
            {lang === 'en' ? 'Applied.' : '고친 글로 바꿨습니다.'}
          </span>
          <button onClick={undo} style={btn}>{lang === 'en' ? 'Undo' : '되돌리기'}</button>
          <button onClick={onClose} style={{ ...btn, background: 'var(--accent)', color: '#fff', border: 'none' }}>
            {lang === 'en' ? 'Close' : '닫기'}
          </button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{error}</div>
      )}
    </div>
  )
}
