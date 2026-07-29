import { useState, useEffect } from 'react'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from './constants'
import {
  createSermon, getSermons, updateSermon, deleteSermon,
  createWorship, getWorships, updateWorship, deleteWorship,
  createDawn, getDawns, updateDawn, deleteDawn,
  getFolders, createFolder, deleteFolder, moveItemToFolder, moveFolder,
  getSermonSteps, getWorshipSteps, getDawnSteps,
} from './db'
import { getSettings, saveSettings, applyTheme } from './settings'
import Sidebar from './components/Sidebar'
import ItemDetail from './components/ItemDetail'
import StepView from './components/StepView'
import SettingsPanel from './components/SettingsPanel'

export default function App() {
  const [tab, setTab] = useState('sermon')
  const [settings, setSettings] = useState(getSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sermons, setSermons] = useState([])
  const [worships, setWorships] = useState([])
  const [dawns, setDawns] = useState([])
  const [folders, setFolders] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState('sermon-title')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const lang = settings.lang

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    loadSermons()
    loadWorships()
    loadDawns()
  }, [])

  useEffect(() => {
    loadFolders()
    setSelectedFolder(null)
  }, [tab])

  async function loadSermons() {
    setSermons(await getSermons())
  }

  async function loadWorships() {
    setWorships(await getWorships())
  }

  async function loadDawns() {
    setDawns(await getDawns())
  }

  async function loadFolders() {
    setFolders(await getFolders(tab))
  }

  async function handleCreateFolder(name) {
    await createFolder(tab, name, selectedFolder?.id || null)
    await loadFolders()
  }

  async function handleDeleteFolder(id) {
    if (!confirm('폴더를 삭제하시겠습니까? 하위폴더와 파일은 루트로 이동됩니다.')) return
    await deleteFolder(id)
    await loadFolders()
    setSelectedFolder(null)
    tab === 'sermon' ? await loadSermons() : tab === 'worship' ? await loadWorships() : await loadDawns()
  }

  function isFolderDescendant(folderId, targetId) {
    if (targetId === null || targetId === undefined) return false
    if (targetId === folderId) return true
    const parent = folders.find(f => f.id === targetId)
    if (!parent || parent.parentId === null) return false
    return isFolderDescendant(folderId, parent.parentId)
  }

  async function handleMoveFolder(folderId, newParentId) {
    if (newParentId === folderId) return
    if (isFolderDescendant(folderId, newParentId)) return
    await moveFolder(folderId, newParentId)
    await loadFolders()
  }

  async function handleMoveItem(itemId, folderId) {
    await moveItemToFolder(tab, itemId, folderId)
    tab === 'sermon' ? await loadSermons() : tab === 'worship' ? await loadWorships() : await loadDawns()
  }

  function handleFolderSelect(folder) {
    setSelectedFolder(folder)
    setSelected(null)
  }

  const items = tab === 'sermon' ? sermons : tab === 'worship' ? worships : dawns
  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : DAWN_STEPS
  const selectedItem = items.find(i => i.id === selected?.id)

  async function handleCreateNew(formData) {
    const data = { ...formData, folderId: selectedFolder?.id || null }
    if (tab === 'sermon') {
      const id = await createSermon(data)
      await loadSermons()
      setSelected({ id, step: null })
    } else if (tab === 'worship') {
      const id = await createWorship(data)
      await loadWorships()
      setSelected({ id, step: null })
    } else {
      const id = await createDawn(data)
      await loadDawns()
      setSelected({ id, step: null })
    }
  }

  async function handleDelete(id) {
    if (!confirm(lang === 'ko' ? '삭제하시겠습니까?' : 'Delete?')) return
    if (tab === 'sermon') {
      await deleteSermon(id)
      await loadSermons()
    } else if (tab === 'worship') {
      await deleteWorship(id)
      await loadWorships()
    } else {
      await deleteDawn(id)
      await loadDawns()
    }
    if (selected?.id === id) setSelected(null)
  }

  async function handleSave(form) {
    if (!selected?.id) return
    if (tab === 'sermon') {
      await updateSermon(selected.id, form)
      await loadSermons()
    } else if (tab === 'worship') {
      await updateWorship(selected.id, form)
      await loadWorships()
    } else {
      await updateDawn(selected.id, form)
      await loadDawns()
    }
  }

  function switchTab(t) {
    setTab(t)
    setSelected(null)
    setSelectedFolder(null)
    closeSearch()
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults(null)
  }

  useEffect(() => {
    if (!searchOpen || searchMode === 'sermon-content') return
    if (!searchQuery.trim()) { setSearchResults(null); return }
    const q = searchQuery.toLowerCase()
    if (searchMode === 'sermon-title') {
      setSearchResults([...sermons, ...dawns].filter(item => {
        const date = item.date ? item.date.replace(/-/g, '').slice(2) : ''
        const name = item.title || item.passage || ''
        return `${date} ${name}`.toLowerCase().includes(q)
      }))
    } else if (searchMode === 'worship') {
      setSearchResults(worships.filter(item => {
        const date = item.date ? item.date.replace(/-/g, '').slice(2) : ''
        return `${date} 예배인도`.toLowerCase().includes(q)
      }))
    }
  }, [searchQuery, searchMode, sermons, dawns, worships, searchOpen])

  async function handleContentSearch(query) {
    const q = (query || searchQuery).trim().toLowerCase()
    if (!q || searchMode !== 'sermon-content') return
    setSearchLoading(true)
    const matched = []
    for (const item of [...sermons, ...dawns]) {
      const basic = [item.title, item.passage, item.category, item.emphasis]
        .filter(Boolean).join(' ').toLowerCase()
      if (basic.includes(q)) { matched.push(item); continue }
      if (item.draft?.toLowerCase().includes(q)) { matched.push(item); continue }
      const isSermon = sermons.some(s => s.id === item.id)
      const steps = isSermon ? await getSermonSteps(item.id) : await getDawnSteps(item.id)
      if (steps.some(s => s.content?.toLowerCase().includes(q))) matched.push(item)
    }
    setSearchResults(matched)
    setSearchLoading(false)
  }

  function handleSettingsChange(next) {
    setSettings(next)
    saveSettings(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <header style={{
        height: 48,
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>
          SermonBlok
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: 2 }}>
          {[['sermon', '설교작성'], ['worship', '예배인도'], ['dawn', '새벽설교']].map(([t, label]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 5,
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />

        {/* 검색창 */}
        {searchOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {[['sermon-title', '설교제목'], ['sermon-content', '설교내용'], ['worship', '예배인도']].map(([mode, label], i) => (
                <button
                  key={mode}
                  onClick={() => { setSearchMode(mode); setSearchResults(null); setSearchQuery('') }}
                  style={{
                    background: searchMode === mode ? 'var(--accent)' : 'transparent',
                    color: searchMode === mode ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchMode === 'sermon-content') handleContentSearch(e.target.value)
                if (e.key === 'Escape') closeSearch()
              }}
              placeholder={searchMode === 'sermon-content' ? '설교내용 검색 후 Enter...' : searchMode === 'worship' ? '날짜 검색...' : '설교 제목 검색...'}
              style={{
                width: 220,
                fontSize: 13,
                padding: '5px 10px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg)',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            {searchLoading && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>검색 중...</span>
            )}
            <button
              onClick={closeSearch}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 찾기 버튼 */}
        <button
          onClick={() => setSearchOpen(v => !v)}
          title="찾기"
          style={{
            background: searchOpen ? 'var(--accent-light)' : 'none',
            border: '1px solid var(--border)',
            borderRadius: 6,
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: searchOpen ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          title={lang === 'ko' ? '설정' : 'Settings'}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 6,
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebarVisible && (
          <Sidebar
            tab={tab}
            items={items}
            folders={folders}
            selectedId={selected}
            selectedFolderId={selectedFolder?.id}
            onSelect={(sel) => setSelected({ id: sel.id, step: 0 })}
            onDelete={handleDelete}
            steps={steps}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveItem={handleMoveItem}
            onMoveFolder={handleMoveFolder}
            onFolderSelect={handleFolderSelect}
            width={sidebarWidth}
            searchItems={searchResults}
            searchItemsTab={searchMode === 'worship' ? 'worship' : 'sermon'}
          />
        )}

        <div
          onPointerDown={(e) => {
            if (e.button !== 0) return
            const startX = e.clientX
            const startW = sidebarWidth
            let moved = false
            const onMove = (me) => {
              if (Math.abs(me.clientX - startX) > 4) moved = true
              if (!moved) return
              const newW = Math.min(Math.max(startW + (me.clientX - startX), 140), 520)
              setSidebarWidth(newW)
              if (!sidebarVisible) setSidebarVisible(true)
            }
            const onUp = () => {
              document.removeEventListener('pointermove', onMove)
              if (!moved) setSidebarVisible(v => !v)
            }
            document.addEventListener('pointermove', onMove)
            document.addEventListener('pointerup', onUp, { once: true })
          }}
          title={sidebarVisible ? '사이드바 감추기 (드래그로 너비 조절)' : '사이드바 보이기'}
          style={{
            width: 12,
            flexShrink: 0,
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border)',
            borderLeft: sidebarVisible ? 'none' : '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            paddingTop: '28vh',
            cursor: sidebarVisible ? 'col-resize' : 'pointer',
            userSelect: 'none',
          }}
        >
          <span style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            userSelect: 'none',
            lineHeight: 1,
          }}>
            {sidebarVisible ? '◀' : '▶'}
          </span>
        </div>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
          {!selected && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ItemDetail
                key={`new-${tab}-${selectedFolder?.id ?? 'root'}`}
                tab={tab}
                item={null}
                onSave={handleCreateNew}
                lang={lang}
                defaultCategory={selectedFolder?.name}
              />
            </div>
          )}

          {selected?.id && selectedItem && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <StepView
                key={selected.id}
                tab={tab}
                item={selectedItem}
                lang={lang}
                bible={settings.bible}
                onSaveItem={handleSave}
                onItemUpdate={tab === 'sermon' ? loadSermons : tab === 'worship' ? loadWorships : loadDawns}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
