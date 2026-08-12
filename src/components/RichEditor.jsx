import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useState, useCallback } from 'react'

const FONT_SIZES = ['0.75em', '0.85em', '1em', '1.2em', '1.5em', '2em']
const COLORS = ['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#6b7280']

function toHtml(value) {
  if (!value) return ''
  if (value.trimStart().startsWith('<')) return value
  // 줄 단위로 변환: 빈 줄은 <p><br></p>로 유지, 내용 있는 줄은 <p>텍스트</p>
  return value
    .split('\n')
    .map(line => line === '' ? '<p><br></p>' : `<p>${line}</p>`)
    .join('')
}

function changeSize(editor, direction) {
  const current = editor.getAttributes('textStyle').fontSize || '1em'
  const idx = FONT_SIZES.indexOf(current)
  const base = idx === -1 ? 2 : idx
  const next = direction === '+'
    ? FONT_SIZES[Math.min(base + 1, FONT_SIZES.length - 1)]
    : FONT_SIZES[Math.max(base - 1, 0)]
  editor.chain().focus().setFontSize(next).run()
}

export default function RichEditor({ value, onChange, baseFontSize = 14 }) {
  const [toolbar, setToolbar] = useState(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false }),
      TextStyle,
      Color,
      FontSize.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['paragraph'] }),
    ],
    content: toHtml(value),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (editor) editor.view.dom.style.fontSize = `${baseFontSize}px`
  }, [editor, baseFontSize])

  const showToolbar = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setToolbar(null); return }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      setToolbar({ top: rect.top - 48, left: rect.left + rect.width / 2 })
    }, 10)
  }, [])

  const hideToolbar = useCallback((e) => {
    if (!e.target.closest('[data-richtoolbar]')) setToolbar(null)
  }, [])

  if (!editor) return null

  const btnStyle = (active) => ({
    background: active ? 'var(--accent)' : 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 4,
    padding: '3px 7px',
    fontSize: 13,
    color: active ? '#fff' : 'var(--text)',
    fontWeight: 600,
    lineHeight: 1.4,
  })

  return (
    <div
      style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}
      onMouseUp={showToolbar}
      onMouseDown={hideToolbar}
    >
      {/* 선택 시 떠오르는 툴바 */}
      {toolbar && (
        <div
          data-richtoolbar="1"
          style={{
            position: 'fixed',
            top: toolbar.top,
            left: toolbar.left,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '4px 8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
        >
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
            style={{ ...btnStyle(editor.isActive('bold')), fontWeight: 700 }}>B</button>

          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
            style={{ ...btnStyle(editor.isActive('italic')), fontStyle: 'italic' }}>I</button>

          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
            style={{ ...btnStyle(editor.isActive('strike')), textDecoration: 'line-through' }}>S</button>

          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />

          <button onMouseDown={e => { e.preventDefault(); changeSize(editor, '-') }}
            style={btnStyle(false)}>A-</button>
          <button onMouseDown={e => { e.preventDefault(); changeSize(editor, '+') }}
            style={btnStyle(false)}>A+</button>

          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />

          {/* 정렬 */}
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run() }}
            style={btnStyle(editor.isActive({ textAlign: 'left' }))} title="왼쪽 정렬">좌</button>
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }}
            style={btnStyle(editor.isActive({ textAlign: 'center' }))} title="가운데 정렬">중</button>
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run() }}
            style={btnStyle(editor.isActive({ textAlign: 'right' }))} title="오른쪽 정렬">우</button>

          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />

          {COLORS.map(c => (
            <button
              key={c}
              onMouseDown={e => {
                e.preventDefault()
                editor.isActive('textStyle', { color: c })
                  ? editor.chain().focus().unsetColor().run()
                  : editor.chain().focus().setColor(c).run()
              }}
              style={{
                width: 15, height: 15, borderRadius: '50%', background: c, padding: 0,
                border: editor.isActive('textStyle', { color: c }) ? '2px solid var(--accent)' : '1px solid #aaa',
                cursor: 'pointer', flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      <EditorContent
        editor={editor}
        style={{ lineHeight: 1.8, color: 'var(--text)', fontFamily: 'inherit', fontSize: baseFontSize }}
      />
    </div>
  )
}
