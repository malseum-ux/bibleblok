import { useState, useEffect, useRef } from 'react'
import AuthGate from './components/AuthGate'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from './constants'
import {
  createSermon, getSermons, updateSermon, deleteSermon,
  createWorship, getWorships, updateWorship, deleteWorship,
  createDawn, getDawns, updateDawn, deleteDawn,
  getFolders, createFolder, deleteFolder, moveItemToFolder, moveFolder,
  getSermonSteps, getWorshipSteps, getDawnSteps,
  saveSermonStep, saveWorshipStep, saveDawnStep,
} from './db'
import { getSettings, saveSettings, applyTheme } from './settings'
import { isFileSystemSupported, loadRootHandle, pickRootDirectory, clearRootHandle, verifyPermission, saveItemToDirectory, deleteItemFromDirectory, listTabFiles, readFileContent, parseJsonFile, parseSblMeta, buildFileBaseName, deleteFileFromDir } from './fileSystem'
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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)
  const [sidebarVisible, setSidebarVisible] = useState(() => window.innerWidth >= 900)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState('sermon-title')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [fontSizes, setFontSizes] = useState({ sermon: 14, worship: 14, dawn: 14 })
  const [rootHandle, setRootHandle] = useState(null)
  const [fsFiles, setFsFiles] = useState([])
  const [sblViewer, setSblViewer] = useState(null)

  const lang = settings.lang

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    loadSermons()
    loadWorships()
    loadDawns()
    if (isFileSystemSupported()) {
      loadRootHandle().then(async handle => {
        if (!handle) return
        const ok = await verifyPermission(handle)
        if (ok) setRootHandle(handle)
      })
    }
  }, [])

  useEffect(() => {
    loadFolders()
    setSelectedFolder(null)
  }, [tab])

  useEffect(() => {
    if (!rootHandle) { setFsFiles([]); return }

    async function syncLocalFiles() {
      // 1단계: 중복 항목 제거 (같은 날짜+제목/본문)
      for (const t of ['sermon', 'worship', 'dawn']) {
        const all = t === 'sermon' ? await getSermons()
          : t === 'worship' ? await getWorships()
          : await getDawns()
        const seen = new Map()
        for (const item of [...all].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))) {
          const key = `${item.date}_${item.title || ''}_${item.passage || ''}`
          if (seen.has(key)) {
            if (t === 'sermon') await deleteSermon(item.id)
            else if (t === 'worship') await deleteWorship(item.id)
            else await deleteDawn(item.id)
          } else {
            seen.set(key, true)
          }
        }
      }

      // 2단계: 현재 탭 파일 목록 업데이트 (사이드바 표시용)
      const currentFiles = await listTabFiles(rootHandle, tab)
      setFsFiles(currentFiles)

      // 3단계: 세 탭 모두 orphan 파일 가져오기
      const imported = { sermon: false, worship: false, dawn: false }

      for (const t of ['sermon', 'worship', 'dawn']) {
        const files = t === tab ? currentFiles : await listTabFiles(rootHandle, t)
        const dbItems = t === 'sermon' ? await getSermons()
          : t === 'worship' ? await getWorships()
          : await getDawns()
        const existingBaseNames = new Set(dbItems.map(i => buildFileBaseName(t, i)))
        const orphans = files.filter(f => !existingBaseNames.has(f.name.replace(/\.(json|sbl)$/, '')))

        for (const file of orphans) {
          const text = await readFileContent(file.handle)
          if (!text) continue

          let itemData, steps = {}
          if (file.type === 'json') {
            const parsed = parseJsonFile(text)
            if (!parsed) continue
            itemData = parsed.item
            steps = parsed.steps
          } else {
            const meta = parseSblMeta(text)
            if (!meta.date && !meta.title && !meta.passage) continue
            const lines = text.split('\n')
            const sepIdx = lines.findIndex(l => l.startsWith('━'))
            const headerEnd = (lines.findIndex((l, i) => i > 0 && l === '') + 1) || 5
            const bodyText = (sepIdx > -1 ? lines.slice(headerEnd, sepIdx) : lines.slice(headerEnd)).join('\n').trim()
            const draftText = sepIdx > -1 ? lines.slice(sepIdx + 2).join('\n').trim() : ''
            itemData = {
              date: meta.date || null, title: meta.title || null,
              passage: meta.passage || null, season: meta.season || null,
              category: meta.category || null, emphasis: null,
              draft: draftText || bodyText || null,
            }
          }

          let newId
          if (t === 'sermon') {
            newId = await createSermon({ ...itemData, folderId: null })
            for (const [idx, content] of Object.entries(steps)) {
              if (content) await saveSermonStep(newId, Number(idx), content)
            }
            imported.sermon = true
          } else if (t === 'worship') {
            newId = await createWorship({ ...itemData, folderId: null })
            for (const [idx, content] of Object.entries(steps)) {
              if (content) await saveWorshipStep(newId, Number(idx), content)
            }
            imported.worship = true
          } else {
            newId = await createDawn({ ...itemData, folderId: null })
            for (const [idx, content] of Object.entries(steps)) {
              if (content) await saveDawnStep(newId, Number(idx), content)
            }
            imported.dawn = true
          }

          // .sbl 파일은 .json으로 변환 후 원본 삭제 (다음 sync에서 중복 방지)
          if (file.type === 'sbl') {
            await saveItemToDirectory(rootHandle, t, itemData, steps)
            await deleteFileFromDir(rootHandle, t, file.name)
          }
        }
      }

      if (imported.sermon) await loadSermons()
      if (imported.worship) await loadWorships()
      if (imported.dawn) await loadDawns()
    }

    syncLocalFiles()
  }, [rootHandle, tab])

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

  async function handlePickFolder() {
    const handle = await pickRootDirectory()
    if (handle) setRootHandle(handle)
  }

  async function handleFsFileOpen(file) {
    const text = await readFileContent(file.handle)
    if (!text) return

    if (file.type === 'sbl') {
      const meta = parseSblMeta(text)
      const title = meta.title || meta.passage || file.name.replace(/\.sbl$/, '')
      setSblViewer({ title, content: text })
      return
    }

    const parsed = parseJsonFile(text)
    if (!parsed) return

    const { item: itemData, steps } = parsed

    const currentItems = tab === 'sermon' ? sermons : tab === 'worship' ? worships : dawns
    const existing = currentItems.find(i =>
      i.date === itemData.date &&
      ((itemData.title && i.title === itemData.title) || (itemData.passage && i.passage === itemData.passage))
    )

    if (existing) {
      setSelected({ id: existing.id, step: 0 })
      if (isMobile) setSidebarVisible(false)
      return
    }

    let newId
    if (tab === 'sermon') {
      newId = await createSermon({ ...itemData, folderId: null })
      for (const [idx, content] of Object.entries(steps)) {
        if (content) await saveSermonStep(newId, Number(idx), content)
      }
      await loadSermons()
    } else if (tab === 'worship') {
      newId = await createWorship({ ...itemData, folderId: null })
      for (const [idx, content] of Object.entries(steps)) {
        if (content) await saveWorshipStep(newId, Number(idx), content)
      }
      await loadWorships()
    } else {
      newId = await createDawn({ ...itemData, folderId: null })
      for (const [idx, content] of Object.entries(steps)) {
        if (content) await saveDawnStep(newId, Number(idx), content)
      }
      await loadDawns()
    }

    setSelected({ id: newId, step: 0 })
    if (isMobile) setSidebarVisible(false)
  }

  async function handleClearFolder() {
    await clearRootHandle()
    setRootHandle(null)
  }

  async function saveItemToFs(itemId, targetTab) {
    if (!rootHandle) return
    const t = targetTab || tab
    const allItems = t === 'sermon' ? await getSermons() : t === 'worship' ? await getWorships() : await getDawns()
    const item = allItems.find(i => i.id === itemId)
    if (!item) return
    const steps = t === 'sermon'
      ? await getSermonSteps(itemId)
      : t === 'worship'
      ? await getWorshipSteps(itemId)
      : await getDawnSteps(itemId)
    const stepsMap = {}
    steps.forEach(s => { stepsMap[s.stepIndex] = s.content })
    await saveItemToDirectory(rootHandle, t, item, stepsMap)
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
    if (rootHandle) {
      const allItems = tab === 'sermon' ? sermons : tab === 'worship' ? worships : dawns
      const item = allItems.find(i => i.id === id)
      if (item) await deleteItemFromDirectory(rootHandle, tab, item)
    }
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

  const content = (
    <>
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

        {/* 글자 크기 조절 */}
        {!isMobile && <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', height: 32 }}>
          <button
            onClick={() => setFontSizes(prev => ({ ...prev, [tab]: Math.max(11, prev[tab] - 1) }))}
            style={{ background: 'none', border: 'none', borderRight: '1px solid var(--border)', padding: '0 7px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1 }}
          >
            ↓
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 22, textAlign: 'center', userSelect: 'none' }}>
            {fontSizes[tab]}
          </span>
          <button
            onClick={() => setFontSizes(prev => ({ ...prev, [tab]: Math.min(22, prev[tab] + 1) }))}
            style={{ background: 'none', border: 'none', borderLeft: '1px solid var(--border)', padding: '0 7px', height: '100%', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1 }}
          >
            ↑
          </button>
        </div>}

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
          rootHandle={rootHandle}
          onPickFolder={handlePickFolder}
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
            width={sidebarWidth}
            searchItems={searchResults}
            searchItemsTab={searchMode === 'worship' ? 'worship' : 'sermon'}
            fsFiles={fsFiles.filter(f => !new Set(items.map(i => buildFileBaseName(tab, i))).has(f.name.replace(/\.(json|sbl)$/, '')))}
            onFsFileOpen={handleFsFileOpen}
          />
        )}

        {/* 데스크탑 사이드바 드래그 핸들 */}
        {!isMobile && (
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
            <span style={{ fontSize: 9, color: 'var(--text-muted)', userSelect: 'none', lineHeight: 1 }}>
              {sidebarVisible ? '◀' : '▶'}
            </span>
          </div>
        )}

        {/* 모바일 사이드바 오버레이 */}
        {isMobile && sidebarVisible && (
          <>
            <div
              onClick={() => setSidebarVisible(false)}
              style={{ position: 'fixed', inset: 0, top: 48, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
            />
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
                onFolderSelect={(folder) => { handleFolderSelect(folder); setSidebarVisible(false) }}
                width={280}
                searchItems={searchResults}
                searchItemsTab={searchMode === 'worship' ? 'worship' : 'sermon'}
                fsFiles={fsFiles.filter(f => !new Set(items.map(i => buildFileBaseName(tab, i))).has(f.name.replace(/\.(json|sbl)$/, '')))}
                onFsFileOpen={handleFsFileOpen}
              />
            </div>
          </>
        )}

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
                fontSize={fontSizes[tab]}
                isMobile={isMobile}
                onSaveItem={handleSave}
                onItemUpdate={tab === 'sermon' ? loadSermons : tab === 'worship' ? loadWorships : loadDawns}
                onGenerated={(itemId) => saveItemToFs(itemId)}
              />
            </div>
          )}
        </main>

      </div>
    </div>

    {sblViewer && (

      <div
        onClick={() => setSblViewer(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: 'var(--bg)', borderRadius: 8, width: '100%', maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-heading)' }}>{sblViewer.title} (이전 형식 — 읽기 전용)</span>
            <button onClick={() => setSblViewer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
          </div>
          <pre style={{ flex: 1, overflow: 'auto', padding: 16, fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text)', lineHeight: 1.7, margin: 0, fontFamily: 'inherit' }}>
            {sblViewer.content}
          </pre>
        </div>
      </div>
    )}
    </>
  )

  return <AuthGate>{content}</AuthGate>
}
