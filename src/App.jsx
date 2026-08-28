import { useState, useEffect } from 'react'
import AuthGate, { useUserEmail } from './components/AuthGate'
import AdminPanel from './components/AdminPanel'
import {
  createSermon, getSermons, updateSermon, deleteSermon,
  createWorship, getWorships, updateWorship, deleteWorship,
  createDawn, getDawns, updateDawn, deleteDawn,
  createCell, getCells, updateCell, deleteCell,
  getFolders, createFolder, deleteFolder, moveItemToFolder, moveFolder, renameFolder,
  getSermonSteps, getWorshipSteps, getDawnSteps,
  saveSermonStep, saveWorshipStep, saveDawnStep,
  exportAllData, importAllData, migrateLocalToSupabase,
} from './db'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS, CELL_STEPS } from './constants'
import { getSettings, saveSettings, applyTheme } from './settings'
import { fetchUsage } from './usage'
import Sidebar from './components/Sidebar'
import ItemDetail from './components/ItemDetail'
import StepView from './components/StepView'
import CellView from './components/CellView'
import CellForm from './components/CellForm'
import SettingsPanel from './components/SettingsPanel'

const ADMIN_EMAIL = 'malseum@gmail.com'

function AppInner() {
  const userEmail = useUserEmail()
  const isAdmin = userEmail === ADMIN_EMAIL

  const [adminOpen, setAdminOpen] = useState(false)
  const [usageInfo, setUsageInfo] = useState(null)

  const [tab, setTab] = useState('sermon')
  const [settings, setSettings] = useState(getSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sermons, setSermons] = useState([])
  const [worships, setWorships] = useState([])
  const [dawns, setDawns] = useState([])
  const [cells, setCells] = useState([])
  const [folders, setFolders] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)
  const [sidebarVisible, setSidebarVisible] = useState(() => window.innerWidth >= 900)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState('sermon-title')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [fontSizes, setFontSizes] = useState({ sermon: 14, worship: 14, dawn: 14, cell: 14 })

  // 이전(migration) 상태
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState(null)

  const lang = settings.lang

  useEffect(() => { applyTheme(settings.theme) }, [settings.theme])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    async function loadUsage() { setUsageInfo(await fetchUsage()) }
    loadUsage()
    window.addEventListener('usageUpdated', loadUsage)
    return () => window.removeEventListener('usageUpdated', loadUsage)
  }, [])

  // 로컬 IndexedDB 이전 필요 여부 확인
  useEffect(() => {
    if (localStorage.getItem('sb_migrated')) return
    // IndexedDB에 sermonblok DB가 있고 데이터가 있으면 이전 배너 표시
    const req = indexedDB.open('sermonblok')
    req.onsuccess = (e) => {
      const localDb = e.target.result
      if (!localDb.objectStoreNames.contains('sermons')) { localDb.close(); return }
      try {
        const tx = localDb.transaction(['sermons', 'dawns'], 'readonly')
        let count = 0
        let done = 0
        const check = () => { if (++done === 2 && count > 0) setMigrationNeeded(true); localDb.close() }
        tx.objectStore('sermons').count().onsuccess = (ev) => { count += ev.target.result; check() }
        tx.objectStore('dawns').count().onsuccess = (ev) => { count += ev.target.result; check() }
      } catch { localDb.close() }
    }
  }, [])

  // 초기 데이터 로드 (Supabase에서)
  useEffect(() => {
    loadSermons()
    loadWorships()
    loadDawns()
    loadCells()
  }, [])

  useEffect(() => {
    loadFolders()
    setSelectedFolder(null)
  }, [tab])

  async function loadSermons() { setSermons(await getSermons()) }
  async function loadWorships() { setWorships(await getWorships()) }
  async function loadDawns() { setDawns(await getDawns()) }
  async function loadCells() { setCells(await getCells()) }
  async function loadFolders() { setFolders(await getFolders(tab)) }

  async function handleMigrate() {
    setMigrating(true)
    try {
      const result = await migrateLocalToSupabase()
      localStorage.setItem('sb_migrated', '1')
      setMigrationResult({ success: true, count: result.count })
      setMigrationNeeded(false)
      await loadSermons()
      await loadWorships()
      await loadDawns()
      await loadCells()
    } catch (e) {
      setMigrationResult({ error: e.message })
    }
    setMigrating(false)
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
    tab === 'sermon' ? await loadSermons() : tab === 'worship' ? await loadWorships() : tab === 'dawn' ? await loadDawns() : await loadCells()
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

  async function handleRenameFolder(folderId, name) {
    await renameFolder(folderId, name)
    await loadFolders()
  }

  async function handleMoveItem(itemId, folderId) {
    try {
      await moveItemToFolder(tab, itemId, folderId)
      tab === 'sermon' ? await loadSermons() : tab === 'worship' ? await loadWorships() : tab === 'dawn' ? await loadDawns() : await loadCells()
    } catch (e) {
      alert((lang === 'ko' ? '이동 실패: ' : 'Move failed: ') + e.message)
    }
  }

  function handleFolderSelect(folder) {
    setSelectedFolder(folder)
    setSelected(null)
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (!json.version || !json.data) { alert('올바르지 않은 파일입니다.'); return }
      await importAllData(json)
      await loadSermons()
      await loadWorships()
      await loadDawns()
      await loadCells()
      await loadFolders()
    } catch { alert('파일을 불러오지 못했습니다.') }
  }

  const items = tab === 'sermon' ? sermons : tab === 'worship' ? worships : tab === 'dawn' ? dawns : cells
  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : tab === 'dawn' ? DAWN_STEPS : CELL_STEPS
  const selectedItem = items.find(i => i.id === selected?.id)

  async function handleCreateNew(formData) {
    try {
      const data = { ...formData, folderId: selectedFolder?.id || null }
      if (tab === 'sermon') {
        const id = await createSermon(data)
        await loadSermons()
        setSelected({ id, step: null })
      } else if (tab === 'worship') {
        const id = await createWorship(data)
        await loadWorships()
        setSelected({ id, step: null })
      } else if (tab === 'dawn') {
        const id = await createDawn(data)
        await loadDawns()
        setSelected({ id, step: null })
      } else {
        const id = await createCell(data)
        await loadCells()
        setSelected({ id, step: null })
      }
    } catch (e) {
      alert((lang === 'ko' ? '저장 실패: ' : 'Save failed: ') + e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm(lang === 'ko' ? '삭제하시겠습니까?' : 'Delete?')) return
    if (tab === 'sermon') { await deleteSermon(id); await loadSermons() }
    else if (tab === 'worship') { await deleteWorship(id); await loadWorships() }
    else if (tab === 'dawn') { await deleteDawn(id); await loadDawns() }
    else { await deleteCell(id); await loadCells() }
    if (selected?.id === id) setSelected(null)
  }

  async function handleSave(form) {
    if (!selected?.id) return
    try {
      if (tab === 'sermon') { await updateSermon(selected.id, form); await loadSermons() }
      else if (tab === 'worship') { await updateWorship(selected.id, form); await loadWorships() }
      else if (tab === 'dawn') { await updateDawn(selected.id, form); await loadDawns() }
      else { await updateCell(selected.id, form); await loadCells() }
    } catch (e) {
      alert((lang === 'ko' ? '저장 실패: ' : 'Save failed: ') + e.message)
    }
  }

  async function handleExportItem(itemId) {
    const allItems = tab === 'sermon' ? sermons : tab === 'worship' ? worships : dawns
    const item = allItems.find(i => i.id === itemId)
    if (!item) return
    const stepsData = tab === 'sermon'
      ? await getSermonSteps(itemId)
      : tab === 'worship'
      ? await getWorshipSteps(itemId)
      : await getDawnSteps(itemId)
    const stepsMap = {}
    stepsData.forEach(s => { stepsMap[s.stepIndex] = s.content })
    const blob = new Blob([JSON.stringify({ version: 2, tab, item, steps: stepsMap }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.date || 'item'}-${item.title || item.passage || 'export'}.json`
    a.click()
    URL.revokeObjectURL(url)
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
      const stepsData = isSermon ? await getSermonSteps(item.id) : await getDawnSteps(item.id)
      if (stepsData.some(s => s.content?.toLowerCase().includes(q))) matched.push(item)
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
        <button
          onClick={() => setSidebarVisible(v => !v)}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        {!isMobile && <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>SermonBlok</span>}
        {!isMobile && <div style={{ width: 1, height: 20, background: 'var(--border)' }} />}
        <div style={{ display: 'flex', gap: 2 }}>
          {(lang === 'en'
            ? [['sermon', 'Sermon'], ['worship', 'Worship'], ['dawn', 'Dawn Prayer'], ['cell', 'Cell Material']]
            : [['sermon', '설교작성'], ['worship', '예배인도'], ['dawn', '새벽설교'], ['cell', '교재작성']]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: 5,
                padding: '4px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />

        {usageInfo && !usageInfo.isAdmin && !usageInfo.isFree && (
          <div style={{
            fontSize: 12,
            color: usageInfo.count >= usageInfo.limit ? '#dc2626' : 'var(--text-muted)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {lang === 'en' ? `${usageInfo.count}/${usageInfo.limit} this month` : `이번 달 ${usageInfo.count}/${usageInfo.limit}회`}
          </div>
        )}

        {searchOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {(lang === 'en'
                ? [['sermon-title', 'Sermon Title'], ['sermon-content', 'Sermon Content'], ['worship', 'Worship']]
                : [['sermon-title', '설교제목'], ['sermon-content', '설교내용'], ['worship', '예배인도']]
              ).map(([mode, label], i) => (
                <button
                  key={mode}
                  onClick={() => { setSearchMode(mode); setSearchResults(null); setSearchQuery('') }}
                  style={{
                    background: searchMode === mode ? 'var(--accent)' : 'transparent',
                    color: searchMode === mode ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                    padding: '4px 10px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
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
              placeholder={lang === 'en'
                ? (searchMode === 'sermon-content' ? 'Search content, press Enter...' : searchMode === 'worship' ? 'Search by date...' : 'Search sermon title...')
                : (searchMode === 'sermon-content' ? '설교내용 검색 후 Enter...' : searchMode === 'worship' ? '날짜 검색...' : '설교 제목 검색...')}
              style={{
                width: 220, fontSize: 13, padding: '5px 10px',
                border: '1px solid var(--border)', borderRadius: 6,
                background: 'var(--bg)', color: 'var(--text)', outline: 'none',
              }}
            />
            {searchLoading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>검색 중...</span>}
            <button onClick={closeSearch} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
              ×
            </button>
          </div>
        )}

        <button
          onClick={() => setSearchOpen(v => !v)}
          title="찾기"
          style={{
            background: searchOpen ? 'var(--accent-light)' : 'none',
            border: '1px solid var(--border)', borderRadius: 6,
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: searchOpen ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        {isAdmin && (
          <button
            onClick={() => setAdminOpen(true)}
            title="사용자 관리"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
        )}

        <button
          onClick={() => setSettingsOpen(true)}
          title={lang === 'ko' ? '설정' : 'Settings'}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 6,
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setSettingsOpen(false)}
          onImport={handleFileImport}
        />
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 데스크탑 사이드바 */}
        {!isMobile && sidebarVisible && (
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
            onRenameFolder={handleRenameFolder}
            width={sidebarWidth}
            searchItems={searchResults}
            searchItemsTab={searchMode === 'worship' ? 'worship' : 'sermon'}
            lang={lang}
          />
        )}

        {/* 사이드바 너비 조절 핸들 */}
        {!isMobile && sidebarVisible && (
          <div
            onPointerDown={(e) => {
              if (e.button !== 0) return
              const startX = e.clientX
              const startW = sidebarWidth
              const onMove = (me) => {
                setSidebarWidth(Math.min(Math.max(startW + (me.clientX - startX), 140), 520))
              }
              document.addEventListener('pointermove', onMove)
              document.addEventListener('pointerup', () => document.removeEventListener('pointermove', onMove), { once: true })
            }}
            style={{ width: 5, flexShrink: 0, background: 'var(--border)', cursor: 'col-resize', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--border)'}
          />
        )}

        {/* 모바일 사이드바 오버레이 */}
        {isMobile && sidebarVisible && (
          <>
            <div onClick={() => setSidebarVisible(false)} style={{ position: 'fixed', inset: 0, top: 48, background: 'rgba(0,0,0,0.4)', zIndex: 49 }} />
            <div style={{ position: 'fixed', top: 48, left: 0, bottom: 0, width: 280, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
              <Sidebar
                tab={tab}
                items={items}
                folders={folders}
                selectedId={selected}
                selectedFolderId={selectedFolder?.id}
                onSelect={(sel) => { setSelected({ id: sel.id, step: 0 }); setSidebarVisible(false) }}
                onDelete={handleDelete}
                steps={steps}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onMoveItem={handleMoveItem}
                onMoveFolder={handleMoveFolder}
                onFolderSelect={handleFolderSelect}
                onRenameFolder={handleRenameFolder}
                width={280}
                searchItems={searchResults}
                searchItemsTab={searchMode === 'worship' ? 'worship' : 'sermon'}
                lang={lang}
              />
            </div>
          </>
        )}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

          {/* 로컬 데이터 이전 배너 */}
          {migrationNeeded && (
            <div style={{
              background: 'rgba(83, 74, 183, 0.08)',
              borderBottom: '1px solid rgba(83, 74, 183, 0.3)',
              padding: '10px 16px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
            }}>
              <span style={{ color: '#534AB7', fontWeight: 600 }}>기존 데이터 이전</span>
              <span style={{ color: 'var(--text-muted)' }}>이전에 작성한 설교가 이 기기에 남아 있습니다. 클라우드로 이전하면 모든 기기에서 사용할 수 있습니다.</span>
              <button
                onClick={handleMigrate}
                disabled={migrating}
                style={{
                  marginLeft: 'auto', background: '#534AB7', color: '#fff',
                  border: 'none', borderRadius: 5, padding: '5px 14px',
                  fontSize: 12, fontWeight: 600, cursor: migrating ? 'not-allowed' : 'pointer',
                  flexShrink: 0, opacity: migrating ? 0.7 : 1,
                }}
              >
                {migrating ? '이전 중...' : '클라우드로 이전'}
              </button>
              <button
                onClick={() => { localStorage.setItem('sb_migrated', '1'); setMigrationNeeded(false) }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px', flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          )}

          {/* 이전 결과 메시지 */}
          {migrationResult && (
            <div style={{
              padding: '8px 16px', fontSize: 12, flexShrink: 0,
              background: migrationResult.success ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)',
              color: migrationResult.success ? '#16a34a' : '#dc2626',
              borderBottom: '1px solid var(--border)',
            }}>
              {migrationResult.success
                ? `이전 완료! ${migrationResult.count}개 항목이 클라우드에 저장되었습니다.`
                : `이전 실패: ${migrationResult.error}`}
            </div>
          )}

          {!selected && tab !== 'cell' && (
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

          {!selected && tab === 'cell' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px', maxWidth: 560 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-heading)', marginBottom: 20 }}>
                {lang === 'en' ? 'Create New Cell Material' : '새 나눔 교재 만들기'}
              </div>
              <CellForm cell={null} onSave={handleCreateNew} lang={lang} />
            </div>
          )}

          {selected?.id && selectedItem && tab !== 'cell' && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <StepView
                key={selected.id}
                tab={tab}
                item={selectedItem}
                lang={lang}
                bible={settings.bible}
                fontSize={fontSizes[tab]}
                onFontSizeChange={size => setFontSizes(prev => ({ ...prev, [tab]: size }))}
                isMobile={isMobile}
                onSaveItem={handleSave}
                onItemUpdate={tab === 'sermon' ? loadSermons : tab === 'worship' ? loadWorships : loadDawns}
                onGenerated={() => {}}
                onExport={() => handleExportItem(selected.id)}
                cells={cells}
                onGoToCell={(cellId) => { switchTab('cell'); setSelected({ id: cellId, step: 0 }) }}
              />
            </div>
          )}

          {selected?.id && selectedItem && tab === 'cell' && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <CellView
                key={selected.id}
                item={selectedItem}
                lang={lang}
                bible={settings.bible}
                fontSize={fontSizes.cell}
                onFontSizeChange={size => setFontSizes(prev => ({ ...prev, cell: size }))}
                isMobile={isMobile}
                onSaveItem={handleSave}
                onExport={() => handleExportItem(selected.id)}
                sermons={[...sermons, ...dawns]}
                onGoToSermon={(sermonId, isSermon) => {
                  switchTab(isSermon ? 'sermon' : 'dawn')
                  setSelected({ id: sermonId, step: 0 })
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return <AuthGate><AppInner /></AuthGate>
}
