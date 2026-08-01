import { useState, useEffect } from 'react'
import { listTabFiles, readFileContent, verifyPermission } from '../fileSystem'

function fmtLabel(name) {
  const base = name.replace(/\.txt$/, '')
  const sep  = base.indexOf('___')
  const front = sep > -1 ? base.slice(0, sep) : base
  return front.replace(/_/g, ' ').trim()
}

export default function LocalSidebar({ tab, rootHandle, refreshKey, width = 200 }) {
  const [files, setFiles]   = useState([])
  const [loading, setLoading] = useState(false)
  const [viewer, setViewer]   = useState(null)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!rootHandle) { setFiles([]); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      const ok = await verifyPermission(rootHandle)
      if (!ok || cancelled) { setLoading(false); return }
      const list = await listTabFiles(rootHandle, tab)
      if (!cancelled) { setFiles(list); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [tab, rootHandle, refreshKey])

  if (!rootHandle) return null

  async function openFile(file) {
    const content = await readFileContent(file.handle)
    setViewer({ name: file.name, content: content || '내용 없음' })
    setCopied(false)
  }

  function copyContent() {
    navigator.clipboard.writeText(viewer.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <aside style={{
        width, minWidth: 160,
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 12px 8px',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={rootHandle.name}>
            {rootHandle.name}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {loading && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>불러오는 중...</div>
          )}
          {!loading && files.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', opacity: 0.6 }}>저장된 파일 없음</div>
          )}
          {files.map(file => (
            <div
              key={file.name}
              onClick={() => openFile(file)}
              title={fmtLabel(file.name)}
              style={{
                padding: '7px 12px', fontSize: 12,
                color: 'var(--text-heading)', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {fmtLabel(file.name)}
            </div>
          ))}
        </div>
      </aside>

      {viewer && (
        <div onClick={() => setViewer(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg)', borderRadius: 10,
            border: '1px solid var(--border)',
            width: 700, maxWidth: '90vw', maxHeight: '82vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '13px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-heading)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {fmtLabel(viewer.name)}
              </span>
              <button onClick={copyContent} style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 5,
                color: copied ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 11, padding: '4px 10px', cursor: 'pointer',
              }}>
                {copied ? '복사됨' : '복사'}
              </button>
              <button onClick={() => setViewer(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>×</button>
            </div>
            <pre style={{
              margin: 0, padding: '16px 20px', overflowY: 'auto',
              fontSize: 13, lineHeight: 1.8,
              color: 'var(--text-heading)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'inherit',
            }}>
              {viewer.content}
            </pre>
          </div>
        </div>
      )}
    </>
  )
}
