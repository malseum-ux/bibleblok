import { useState } from 'react'

function fmtDate(d) {
  return d ? d.replace(/-/g, '').slice(2) : ''
}

export default function Sidebar({
  tab, items, folders, selectedId, selectedFolderId,
  onSelect, onDelete, steps,
  onCreateFolder, onDeleteFolder, onMoveItem, onFolderSelect,
}) {
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [movingItemId, setMovingItemId] = useState(null)

  function getLabel(item) {
    const date = fmtDate(item.date)
    const name = tab === 'worship'
      ? '예배인도'
      : (item.title || item.passage || '제목 없음')
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

  const itemStyle = (isSelected) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '5px 8px',
    cursor: 'pointer',
    background: isSelected ? 'var(--accent-light)' : 'transparent',
    borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
    gap: 4,
  })

  const labelStyle = {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-heading)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  const btnStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 2px',
    opacity: 0.5,
    flexShrink: 0,
  }

  function renderFileItem(item, indent = false) {
    const isItemSelected = selectedId?.id === item.id && selectedId?.step == null
    const isExpanded = expandedIds.has(item.id)
    const isMoving = movingItemId === item.id

    return (
      <div key={item.id}>
        <div
          style={{
            ...itemStyle(isItemSelected),
            paddingLeft: indent ? 20 : 8,
          }}
          onClick={() => { toggleExpand(item.id); onSelect({ id: item.id, step: null }) }}
        >
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            display: 'inline-block',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}>▶</span>
          <span style={labelStyle}>{getLabel(item)}</span>
          <button
            title="폴더 이동"
            onClick={e => { e.stopPropagation(); setMovingItemId(isMoving ? null : item.id) }}
            style={{ ...btnStyle, fontSize: 11 }}
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
            paddingLeft: indent ? 28 : 16,
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
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => { onMoveItem(item.id, f.id); setMovingItemId(null) }}
                style={moveOptionStyle}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {isExpanded && (
          <div style={{ paddingLeft: indent ? 28 : 20 }}>
            {steps.map(step => {
              const isStepSelected = selectedId?.id === item.id && selectedId?.step === step.index
              return (
                <div
                  key={step.index}
                  onClick={() => onSelect({ id: item.id, step: step.index })}
                  style={{
                    padding: '5px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: isStepSelected ? 'var(--accent)' : 'var(--text)',
                    background: isStepSelected ? 'var(--accent-light)' : 'transparent',
                    borderLeft: isStepSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    fontWeight: isStepSelected ? 600 : 400,
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
          title="새 폴더"
          style={{ ...btnStyle, opacity: 0.7, fontSize: 15, padding: '0 3px' }}
        >
          +
        </button>
      </div>

      {creatingFolder && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
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
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {folders.map(folder => {
          const isFolderSelected = selectedFolderId === folder.id
          const folderFiles = folderMap[folder.id] || []
          const isOpen = expandedIds.has(`folder-${folder.id}`)

          return (
            <div key={folder.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  background: isFolderSelected ? 'var(--accent-light)' : 'transparent',
                  borderLeft: isFolderSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  gap: 4,
                }}
                onClick={() => {
                  toggleExpand(`folder-${folder.id}`)
                  onFolderSelect(folder)
                }}
              >
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  display: 'inline-block',
                  transition: 'transform 0.15s',
                  flexShrink: 0,
                }}>▶</span>
                <span style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 600,
                  color: isFolderSelected ? 'var(--accent)' : 'var(--text-heading)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {folder.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {folderFiles.length}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id) }}
                  style={btnStyle}
                >×</button>
              </div>

              {isOpen && (
                <div>
                  {folderFiles.length === 0 ? (
                    <div style={{ padding: '4px 20px', fontSize: 12, color: 'var(--text-muted)' }}>
                      비어 있음
                    </div>
                  ) : (
                    folderFiles.map(item => renderFileItem(item, true))
                  )}
                </div>
              )}
            </div>
          )
        })}

        {folders.length > 0 && rootItems.length > 0 && (
          <div style={{
            margin: '6px 8px',
            borderTop: '1px solid var(--border)',
            paddingTop: 6,
            fontSize: 11,
            color: 'var(--text-muted)',
          }}>
            폴더 없음
          </div>
        )}

        {rootItems.length === 0 && folders.length === 0 && (
          <div style={{ padding: '16px 12px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            {tab === 'sermon' ? '+ 버튼으로 설교를 추가하세요' : tab === 'worship' ? '+ 버튼으로 예배를 추가하세요' : '+ 버튼으로 새벽 기도를 추가하세요'}
          </div>
        )}

        {rootItems.map(item => renderFileItem(item, false))}
      </div>
    </aside>
  )
}
