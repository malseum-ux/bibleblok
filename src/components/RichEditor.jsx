import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useEffect, useState, useCallback, useRef } from 'react'

const FONT_SIZES = ['0.75em', '0.85em', '1em', '1.2em', '1.5em', '2em']
const COLORS = ['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#6b7280']

function toHtml(value) {
  if (!value) return ''
  if (value.trimStart().startsWith('<')) return value
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

export default function RichEditor({ value, onChange, baseFontSize = 14, fixedToolbar = false, editable = true }) {
  const [toolbar, setToolbar] = useState(null)
  const lastEmittedRef = useRef(toHtml(value || ''))
  const isSyncingRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false }),
      TextStyle,
      Color,
      FontSize.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['paragraph'] }),
      Underline,
    ],
    content: toHtml(value),
    onUpdate: ({ editor }) => {
      if (isSyncingRef.current) return
      const html = editor.getHTML()
      lastEmittedRef.current = html
      onChange(html)
    },
  })

  // 외부에서 value가 변경될 때 에디터 동기화 (AI 다듬기, 설교문 반영 등)
  useEffect(() => {
    if (!editor || value === undefined) return
    const html = toHtml(value || '')
    if (html === lastEmittedRef.current) return
    isSyncingRef.current = true
    editor.commands.setContent(html, false)
    lastEmittedRef.current = html
    isSyncingRef.current = false
  }, [value, editor])

  useEffect(() => {
    if (editor) editor.view.dom.style.fontSize = `${baseFontSize}px`
  }, [editor, baseFontSize])

  useEffect(() => {
    if (editor) editor.setEditable(editable)
  }, [editor, editable])

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

  const toolbarContent = (
    <>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
        style={{ ...btnStyle(editor.isActive('bold')), fontWeight: 700 }}>B</button>

      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
        style={{ ...btnStyle(editor.isActive('italic')), fontStyle: 'italic' }}>I</button>

      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }}
        style={{ ...btnStyle(editor.isActive('underline')), textDecoration: 'underline' }}>U</button>

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />

      <button onMouseDown={e => { e.preventDefault(); changeSize(editor, '-') }}
        style={btnStyle(false)}>A-</button>
      <button onMouseDown={e => { e.preventDefault(); changeSize(editor, '+') }}
        style={btnStyle(false)}>A+</button>

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />

      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run() }}
        style={btnStyle(editor.isActive({ textAlign: 'left' }))} title="왼쪽 정렬">좌</button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }}
        style={btnStyle(editor.isActive({ textAlign: 'center' }))} title="가운데 정렬">중</button>
      <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run() }}
        style={btnStyle(editor.isActive({ textAlign: 'right' }))} title="오른쪽 정렬">우</button>

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />

      <button
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run() }}
        title="기본 색상"
        style={{
          width: 15, height: 15, borderRadius: '50%', padding: 0, cursor: 'pointer', flexShrink: 0,
          background: 'transparent', border: '1px solid #aaa', position: 'relative', overflow: 'hidden',
        }}
      >
        <span style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#dc2626', transform: 'rotate(-45deg) translateY(-50%)' }} />
      </button>

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
    </>
  )

  if (fixedToolbar) {
    return (
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          padding: '5px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-sidebar)',
          flexShrink: 0,
        }}>
          {toolbarContent}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', opacity: editable ? 1 : 0.6 }}>
          <EditorContent
            editor={editor}
            style={{ lineHeight: 1.8, color: 'var(--text)', fontFamily: 'inherit', fontSize: baseFontSize }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}
      onMouseUp={showToolbar}
      onMouseDown={hideToolbar}
    >
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
          {toolbarContent}
        </div>
      )}

      <EditorContent
        editor={editor}
        style={{ lineHeight: 1.8, color: 'var(--text)', fontFamily: 'inherit', fontSize: baseFontSize }}
      />
    </div>
  )
}
