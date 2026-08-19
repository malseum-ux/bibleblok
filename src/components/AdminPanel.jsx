import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ADMIN_EMAIL = 'malseum@gmail.com'

const COLS = [
  { key: 'idx',        label: '순번',   width: 52,  sortable: false },
  { key: 'name',       label: '이름',   width: 90,  sortable: true  },
  { key: 'email',      label: '이메일', width: 200, sortable: true  },
  { key: 'phone',      label: '전화번호', width: 130, sortable: false },
  { key: 'church',     label: '교회',   width: 120, sortable: true  },
  { key: 'denomination', label: '교단', width: 100, sortable: true  },
  { key: 'paid_at',   label: '입금일',  width: 110, sortable: true  },
  { key: 'usage',      label: '이번 달 사용', width: 100, sortable: true },
  { key: 'monthly_limit', label: '월 한도', width: 80, sortable: true },
  { key: 'is_free',    label: '무료',   width: 60,  sortable: false },
  { key: 'delete',     label: '',       width: 40,  sortable: false },
]

export default function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([])
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [newEmail, setNewEmail] = useState('')
  const [addStatus, setAddStatus] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const { data } = await supabase
      .from('allowed_users')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
  }

  async function handleAdd() {
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed) return
    setAddStatus('loading')
    const { error } = await supabase.from('allowed_users').insert({ email: trimmed })
    if (error) {
      setAddStatus('error')
    } else {
      await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } })
      setNewEmail('')
      setAddStatus('sent')
      fetchUsers()
      setTimeout(() => setAddStatus(null), 3000)
    }
  }

  async function handleDelete(id) {
    await supabase.from('allowed_users').delete().eq('id', id)
    fetchUsers()
  }

  async function handleUpdate(id, field, value) {
    await supabase.from('allowed_users').update({ [field]: value }).eq('id', id)
    fetchUsers()
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const currentMonth = new Date().toISOString().slice(0, 7)

  function getUsage(u) {
    return u.usage_month === currentMonth ? (u.usage_count || 0) : 0
  }

  const sorted = [...users].sort((a, b) => {
    let av, bv
    if (sortKey === 'usage') {
      av = getUsage(a); bv = getUsage(b)
    } else if (sortKey === 'monthly_limit') {
      av = a.monthly_limit ?? 200; bv = b.monthly_limit ?? 200
    } else if (sortKey === 'paid_at') {
      av = a.paid_at || ''; bv = b.paid_at || ''
    } else {
      av = (a[sortKey] || '').toLowerCase()
      bv = (b[sortKey] || '').toLowerCase()
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const thStyle = (key) => ({
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    background: 'var(--bg-sidebar)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    cursor: COLS.find(c => c.key === key)?.sortable ? 'pointer' : 'default',
    userSelect: 'none',
    textAlign: 'left',
  })

  const tdStyle = {
    padding: '7px 10px',
    fontSize: 12,
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  }

  const inputStyle = {
    width: '100%',
    padding: '3px 6px',
    fontSize: 12,
    border: '1px solid var(--border)',
    borderRadius: 4,
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  function SortIndicator({ colKey }) {
    if (sortKey !== colKey) return <span style={{ opacity: 0.3, marginLeft: 3 }}>↕</span>
    return <span style={{ marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 'min(1100px, 96vw)',
        maxHeight: '90vh',
        background: 'var(--bg-sidebar)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', flex: 1 }}>
            사용자 관리
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="이메일 입력 후 Enter"
              style={{
                padding: '6px 10px',
                fontSize: 13,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg)',
                color: 'var(--text)',
                outline: 'none',
                width: 220,
              }}
            />
            <button
              onClick={handleAdd}
              disabled={addStatus === 'loading'}
              style={{
                padding: '6px 14px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              추가
            </button>
          </div>
          {addStatus === 'sent' && <span style={{ fontSize: 12, color: '#16a34a' }}>추가됨</span>}
          {addStatus === 'error' && <span style={{ fontSize: 12, color: '#dc2626' }}>오류</span>}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* 테이블 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              {COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
            </colgroup>
            <thead>
              <tr>
                {COLS.map(c => (
                  <th
                    key={c.key}
                    style={thStyle(c.key)}
                    onClick={() => c.sortable && handleSort(c.key)}
                  >
                    {c.label}{c.sortable && <SortIndicator colKey={c.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    등록된 사용자가 없습니다.
                  </td>
                </tr>
              )}
              {sorted.map((u, i) => {
                const usage = getUsage(u)
                const limit = u.monthly_limit ?? 200
                return (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</td>
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        defaultValue={u.name || ''}
                        placeholder="이름"
                        onBlur={e => handleUpdate(u.id, 'name', e.target.value)}
                      />
                    </td>
                    <td style={{ ...tdStyle, fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </td>
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        defaultValue={u.phone || ''}
                        placeholder="전화번호"
                        onBlur={e => handleUpdate(u.id, 'phone', e.target.value)}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        defaultValue={u.church || ''}
                        placeholder="교회"
                        onBlur={e => handleUpdate(u.id, 'church', e.target.value)}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        defaultValue={u.denomination || ''}
                        placeholder="교단"
                        onBlur={e => handleUpdate(u.id, 'denomination', e.target.value)}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="date"
                        style={inputStyle}
                        defaultValue={u.paid_at || ''}
                        onBlur={e => handleUpdate(u.id, 'paid_at', e.target.value || null)}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ color: usage >= limit && !u.is_free ? '#dc2626' : 'var(--text)' }}>
                        {usage}{!u.is_free && `/${limit}`}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        min={1}
                        style={{ ...inputStyle, width: 60 }}
                        defaultValue={limit}
                        disabled={!!u.is_free}
                        onBlur={e => handleUpdate(u.id, 'monthly_limit', parseInt(e.target.value) || 200)}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!u.is_free}
                        onChange={e => handleUpdate(u.id, 'is_free', e.target.checked)}
                        style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(u.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, lineHeight: 1, padding: 0 }}
                      >×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 하단 */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}>
          총 {users.length}명 · 셀을 클릭하여 직접 편집, 클릭 밖으로 나가면 저장
        </div>
      </div>
    </div>
  )
}
