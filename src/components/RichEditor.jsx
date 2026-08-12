import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import { useEffect } from 'react'

const COLORS = ['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#6b7280']

// em 기반 크기 단계 (기준 fontSize에 비례해서 커짐)
const SIZES = [
  { label: '소', value: '0.82em' },
  { label: '중', value: '1em' },
  { label: '대', value: '1.25em' },
  { label: '특대', value: '1.6em' },
]

const btnBase = active => ({
  background: active ? 'var(--accent)' : 'none',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 4,
  padding: '2px 7px',
  fontSize: 13,
  lineHeight: 1.4,
  color: active ? '#fff' : 'var(--text)',
  fontWeight: active ? 700 : 400,
})

export default function RichEditor({ value, onChange, baseFontSize = 14 }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false }),
      TextStyle,
      Color,
      FontSize.configure({ types: ['textStyle'] }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: `outline: none; min-height: 200px; line-height: 1.8; color: var(--text); font-family: inherit;`,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.view.dom.style.fontSize = `${baseFontSize}px`
  }, [editor, baseFontSize])

  if (!editor) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* 서식 툴바 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '5px 12px',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
        flexShrink: 0,
        background: 'var(--bg)',
      }}>
        {/* 굵기 */}
        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
          style={btnBase(editor.isActive('bold'))}>B</button>

        {/* 기울임 */}
        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
          style={{ ...btnBase(editor.isActive('italic')), fontStyle: 'italic' }}>I</button>

        {/* 취소선 */}
        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
          style={{ ...btnBase(editor.isActive('strike')), textDecoration: 'line-through' }}>S</button>

        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

        {/* 글자 크기 */}
        {SIZES.map(s => (
          <button
            key={s.value}
            onMouseDown={e => {
              e.preventDefault()
              editor.isActive('textStyle', { fontSize: s.value })
                ? editor.chain().focus().unsetFontSize().run()
                : editor.chain().focus().setFontSize(s.value).run()
            }}
            style={btnBase(editor.isActive('textStyle', { fontSize: s.value }))}
          >{s.label}</button>
        ))}

        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

        {/* 글자 색상 */}
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
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: c,
              border: editor.isActive('textStyle', { color: c })
                ? '2px solid var(--accent)'
                : '1px solid var(--border)',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* 에디터 본문 */}
      <EditorContent
        editor={editor}
        style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}
      />
    </div>
  )
}
