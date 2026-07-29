import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

function fmtDate(d) {
  return d ? d.replace(/-/g, '').slice(2) : ''
}

function buildTree(folders, parentId = null) {
  return folders
    .filter(f => (f.parentId ?? null) === parentId)
    .map(f => ({ ...f, children: buildTree(folders, f.id) }))
}

function flattenTree(nodes, depth = 0) {
  const result = []
  for (const node of nodes) {
    result.push({ ...node, depth })
    result.push(...flattenTree(node.children, depth + 1))
  }
  return result
}

export default function Sidebar({
  tab, items, folders, selectedId, selectedFolderId,
  onSelect, onDelete, steps,
  onCreateFolder, onDeleteFolder, onMoveItem, onMoveFolder, onFolderSelect,
}) {
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [movingItemId, setMovingItemId] = useState(null)

  // 드래그 상태 — ref로 최신값 보장, state는 UI 렌더링용
  const dragRef = useRef({ active: false, timer: null, type: null, id: null, label: null, dropTarget: undefined })
  const [dragDisplay, setDragDisplay] = useState(null)   // { label, x, y } — 고스트 표시용
  const [dropDisplay, setDropDisplay] = useState(undefined) // undefined=없음, null=루트, id=폴더

  function getLabel(item) {
    const date = fmtDate(item.date)
    const name = tab === 'worship' ? '예배인도' : (item.title || item.passage || '제목 없음')
    return date ? `${date} ${name}` : name
  }

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return
    onCreateFolder(newFolderName.trim())
    setNewFolderName('')
    setCreatingFolder(false)
  }

  // 드래그 시작 — 500ms 길게 누르면 활성화
  function startDrag(e, type, id, label) {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    const dr = dragRef.current
    clearTimeout(dr.timer)
    const startX = e.clientX
    const startY = e.clientY
    let moved = false

    const onMove = (me) => {
      if (Math.abs(me.clientX - startX) > 6 || Math.abs(me.clientY - startY) > 6) moved = true
      if (!dr.active) return

      setDragDisplay(prev => prev ? { ...prev, x: me.clientX, y: me.clientY } : null)

      const el = document.elementFromPoint(me.clientX, me.clientY)
      const folderEl = el?.closest('[data-drop-folder]')
      const rootEl = el?.closest('[data-drop-root]')
      const newTarget = folderEl
        ? parseInt(folderEl.dataset.dropFolder)
        : rootEl ? null : undefined
      dr.dropTarget = newTarget
      setDropDisplay(newTarget)
    }

    const onUp = () => {
      clearTimeout(dr.timer)
      document.removeEventListener('pointermove', onMove)

      if (dr.active) {
        const target = dr.dropTarget
        if (target !== undefined) {
          if (dr.type === 'file') onMoveItem(dr.id, target)
          else onMoveFolder(dr.id, target)
        }
        dr.active = false
        setDragDisplay(null)
        setDropDisplay(undefined)
      }
    }

    dr.timer = setTimeout(() => {
      if (!moved) {
        dr.active = true
        dr.type = type
        dr.id = id
        dr.label = label
        dr.dropTarget = undefined
        setDragDisplay({ label, x: startX, y: startY })
      }
    }, 500)

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp, { once: true })
  }

  const tree = buildTree(folders)
  const flatFolders = flattenTree(tree)

  const folderMap = {}
  const rootItems = []
  for (const item of items) {
    if (item.folderId && folders.some(f => f.id === item.folderId)) {
      if (!folderMap[item.folderId]) folderMap[item.folderId] = []
      folderMap[item.folderId].push(item)
    } else {
      rootItems.push(item)
    }
  }

  const tabLabel = tab === 'sermon' ? '설교 목록' : tab === 'worship' ? '예배 목록' : '새벽 목록'
  const selectedFolderName = selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : null

  const btnStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 2px',
    opacity: 0.4,
    flexShrink: 0,
  }

  const moveOptionStyle = {
    background: 'var(--bg-sidebar)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
    color: 'var(--text)',
    textAlign: 'left',
  }

  function renderFileItem(item, depth = 0) {
    const isItemSelected = selectedId?.id === item.id && selectedId?.step == null
    const isExpanded = expandedIds.has(item.id)
    const isMoving = movingItemId === item.id
    const isDraggingThis = dragDisplay && dragRef.current.type === 'file' && dragRef.current.id === item.id

    return (
      <div key={item.id} style={{ opacity: isDraggingThis ? 0.35 : 1 }}>
        <div
          onPointerDown={e => startDrag(e, 'file', item.id, getLabel(item))}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            paddingLeft: 10 + depth * 14,
            cursor: 'grab',
            background: isItemSelected ? 'var(--accent-light)' : 'transparent',
            borderLeft: isItemSelected ? '2px solid var(--accent)' : '2px solid transparent',
            gap: 4,
            userSelect: 'none',
          }}
          onClick={() => { toggleExpand(item.id); onSelect({ id: item.id, step: null }) }}
        >
          <span style={{
            fontSize: 8,
            color: 'var(--text-muted)',
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            display: 'inline-block',
            transition: 'transform 0.15s',
            flexShrink: 0,
            opacity: 0.6,
          }}>▶</span>
          <span style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontWeight: 400,
            color: isItemSelected ? 'var(--accent)' : 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{getLabel(item)}</span>
          <button
            title="폴더 이동"
            onClick={e => { e.stopPropagation(); setMovingItemId(isMoving ? null : item.id) }}
            style={{ ...btnStyle, fontSize: 10 }}
          >
            {isMoving ? '✕' : '↪'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(item.id) }}
            style={btnStyle}
          >×</button>
        </div>

        {isMoving && (
          <div style={{
            paddingLeft: 10 + depth * 14 + 8,
            paddingBottom: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            <button
              onClick={() => { onMoveItem(item.id, null); setMovingItemId(null) }}
              style={{ ...moveOptionStyle, color: 'var(--text-muted)' }}
            >
              루트로 이동
            </button>
            {flatFolders.map(f => (
              <button
                key={f.id}
                onClick={() => { onMoveItem(item.id, f.id); setMovingItemId(null) }}
                style={{ ...moveOptionStyle, paddingLeft: 8 + f.depth * 10 }}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {isExpanded && (
          <div style={{ paddingLeft: 10 + depth * 14 + 10 }}>
            {steps.map(step => {
              const isStepSelected = selectedId?.id === item.id && selectedId?.step === step.index
              return (
                <div
                  key={step.index}
                  onClick={() => onSelect({ id: item.id, step: step.index })}
                  style={{
                    padding: '3px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: isStepSelected ? 'var(--accent)' : 'var(--text-muted)',
                    background: isStepSelected ? 'var(--accent-light)' : 'transparent',
                    borderLeft: isStepSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    fontWeight: isStepSelected ? 500 : 400,
                  }}
                >
                  {step.index + 1}. {step.label.ko}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderFolder(node, depth = 0) {
    const isFolderSelected = selectedFolderId === node.id
    const folderFiles = folderMap[node.id] || []
    const isOpen = expandedIds.has(`folder-${node.id}`)
    const hasContent = node.children.length > 0 || folderFiles.length > 0
    const isDraggingThis = dragDisplay && dragRef.current.type === 'folder' && dragRef.current.id === node.id
    const isDropTarget = dropDisplay === node.id

    return (
      <div key={node.id} style={{ opacity: isDraggingThis ? 0.35 : 1 }}>
        <div
          data-drop-folder={node.id}
          onPointerDown={e => startDrag(e, 'folder', node.id, node.name)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            paddingLeft: 10 + depth * 14,
            cursor: 'grab',
            background: isDropTarget
              ? 'var(--accent-light)'
              : isFolderSelected ? 'var(--accent-light)' : 'transparent',
            borderLeft: isDropTarget
              ? '2px solid var(--accent)'
              : isFolderSelected ? '2px solid var(--accent)' : '2px solid transparent',
            outline: isDropTarget ? '1px dashed var(--accent)' : 'none',
            gap: 4,
            userSelect: 'none',
          }}
          onClick={() => { toggleExpand(`folder-${node.id}`); onFolderSelect(node) }}
        >
          <span style={{
            fontSize: 8,
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(90deg)' : 'none',
            display: 'inline-block',
            transition: 'transform 0.15s',
            flexShrink: 0,
            opacity: hasContent ? 0.7 : 0.2,
          }}>▶</span>
          <span style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            color: isFolderSelected || isDropTarget ? 'var(--accent)' : 'var(--text-heading)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {node.name}
          </span>
          {folderFiles.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }}>
              {folderFiles.length}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDeleteFolder(node.id) }}
            style={btnStyle}
          >×</button>
        </div>

        {isOpen && (
          <div>
            {node.children.map(child => renderFolder(child, depth + 1))}
            {folderFiles.map(item => renderFileItem(item, depth + 1))}
            {!hasContent && (
              <div style={{
                padding: '3px 8px',
                paddingLeft: 10 + (depth + 1) * 14,
                fontSize: 11,
                color: 'var(--text-muted)',
                opacity: 0.5,
              }}>
                비어 있음
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside style={{
      width: 240,
      minWidth: 200,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 10px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
          {tabLabel}
        </span>
        <button
          onClick={() => setCreatingFolder(true)}
          title={selectedFolderName ? `"${selectedFolderName}" 안에 하위폴더 생성` : '새 폴더'}
          style={{ ...btnStyle, opacity: 0.7, fontSize: 15, padding: '0 3px' }}
        >
          +
        </button>
      </div>

      {creatingFolder && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {selectedFolderName && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              "{selectedFolderName}" 하위폴더
            </span>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setCreatingFolder(false) }}
              placeholder="폴더 이름"
              style={{
                flex: 1,
                fontSize: 12,
                padding: '4px 6px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--bg)',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            <button onClick={handleCreateFolder} style={{ ...btnStyle, opacity: 1, color: 'var(--accent)' }}>확인</button>
          </div>
        </div>
      )}

      {/* data-drop-root: 이 영역 어디든 드롭하면 루트로 이동 */}
      <div data-drop-root="true" style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {tree.map(node => renderFolder(node))}

        {folders.length > 0 && rootItems.length > 0 && (
          <div style={{
            margin: '6px 8px 2px',
            borderTop: '1px solid var(--border)',
            paddingTop: 6,
            fontSize: 11,
            color: 'var(--text-muted)',
            opacity: dropDisplay === null ? 1 : 0.6,
            background: dropDisplay === null ? 'var(--accent-light)' : 'transparent',
            borderRadius: 4,
            padding: '4px 8px',
          }}>
            {dropDisplay === null ? '여기에 드롭 → 루트로 이동' : '폴더 없음'}
          </div>
        )}

        {rootItems.length === 0 && folders.length === 0 && (
          <div style={{ padding: '16px 12px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', opacity: 0.6 }}>
            {tab === 'sermon' ? '+ 버튼으로 설교를 추가하세요' : tab === 'worship' ? '+ 버튼으로 예배를 추가하세요' : '+ 버튼으로 새벽 기도를 추가하세요'}
          </div>
        )}

        {rootItems.map(item => renderFileItem(item, 0))}

        {/* 빈 공간도 루트 드롭 대상 */}
        {dragDisplay && (
          <div style={{
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: dropDisplay === null ? 'var(--accent)' : 'var(--text-muted)',
            opacity: dropDisplay === null ? 1 : 0.4,
            borderTop: '1px dashed var(--border)',
            margin: '4px 8px',
          }}>
            {dropDisplay === null ? '루트로 이동' : '폴더로 드래그'}
          </div>
        )}
      </div>

      {/* 드래그 고스트 — body에 렌더링 (사이드바 overflow:hidden을 벗어나기 위해) */}
      {dragDisplay && createPortal(
        <div style={{
          position: 'fixed',
          left: dragDisplay.x + 14,
          top: dragDisplay.y - 10,
          background: 'var(--accent)',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
          {dragDisplay.label}
        </div>,
        document.body
      )}
    </aside>
  )
}
