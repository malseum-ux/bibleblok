import { useState, useEffect } from 'react'
import { SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from './constants'
import {
  createSermon, getSermons, updateSermon, deleteSermon, getSermonSteps,
  createWorship, getWorships, updateWorship, deleteWorship, getWorshipSteps,
  createDawn, getDawns, updateDawn, deleteDawn, getDawnSteps,
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
  const [selected, setSelected] = useState(null)
  const [stepContents, setStepContents] = useState({})

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
    if (selected) loadStepContents()
  }, [selected])

  async function loadSermons() {
    setSermons(await getSermons())
  }

  async function loadWorships() {
    setWorships(await getWorships())
  }

  async function loadDawns() {
    setDawns(await getDawns())
  }

  async function loadStepContents() {
    if (!selected?.id) return
    const steps = tab === 'sermon'
      ? await getSermonSteps(selected.id)
      : tab === 'worship'
      ? await getWorshipSteps(selected.id)
      : await getDawnSteps(selected.id)
    const map = {}
    steps.forEach(s => { map[s.stepIndex] = s.content })
    setStepContents(map)
  }

  const items = tab === 'sermon' ? sermons : tab === 'worship' ? worships : dawns
  const steps = tab === 'sermon' ? SERMON_STEPS : tab === 'worship' ? WORSHIP_STEPS : DAWN_STEPS
  const selectedItem = items.find(i => i.id === selected?.id)

  async function handleCreate() {
    if (tab === 'sermon') {
      const id = await createSermon({
        date: new Date().toISOString().slice(0, 10),
        category: '',
        seriesName: '',
        title: '',
        passage: '',
        emphasis: '',
      })
      await loadSermons()
      setSelected({ id, step: null })
    } else if (tab === 'worship') {
      const id = await createWorship({
        date: new Date().toISOString().slice(0, 10),
        season: '',
        lectionary: '',
      })
      await loadWorships()
      setSelected({ id, step: null })
    } else {
      const id = await createDawn({
        date: new Date().toISOString().slice(0, 10),
        seriesName: '',
        passage: '',
        emphasis: '',
      })
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
    setStepContents({})
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
          {[['sermon', '설교'], ['worship', '예배'], ['dawn', '새벽']].map(([t, label]) => (
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
        <Sidebar
          tab={tab}
          items={items}
          selectedId={selected}
          onSelect={setSelected}
          onCreate={handleCreate}
          onDelete={handleDelete}
          steps={steps}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
          {!selected && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: 'var(--text-muted)',
              gap: 8,
            }}>
              <div style={{ fontSize: 40, opacity: 0.15, fontWeight: 700 }}>
                {tab === 'sermon' ? '설교' : tab === 'worship' ? '예배' : '새벽'}
              </div>
              <div style={{ fontSize: 14 }}>
                {lang === 'ko'
                  ? '왼쪽에서 항목을 선택하거나 + 버튼으로 새로 추가하세요'
                  : 'Select an item or click + to create new'}
              </div>
            </div>
          )}

          {selected && selected.step == null && selectedItem && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ItemDetail
                tab={tab}
                item={selectedItem}
                onSave={handleSave}
                lang={lang}
              />
            </div>
          )}

          {selected && selected.step != null && selectedItem && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <StepView
                key={`${selected.id}-${selected.step}`}
                tab={tab}
                item={selectedItem}
                stepIndex={selected.step}
                savedContent={stepContents[selected.step]}
                lang={lang}
                bible={settings.bible}
                onSaved={loadStepContents}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
