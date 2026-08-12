import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/extension-bubble-menu'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import { useEffect } from 'react'

const FONT_SIZES = ['0.75em', '0.85em', '1em', '1.2em', '1.5em', '2em']
const COLORS = ['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#6b7280']

function toHtml(value) {
  if (!value) return ''
  if (value.trimStart().startsWith('<')) return value
  return value
    .split('\n\n')
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function changeSize(editor, direction) {
  const current = editor.getAttributes('textStyle').fontSize || '1em'
  const idx = FONT_SIZES.indexOf(current)
  const base = idx === -1 ? 2 : idx
  const next = direction === '+' ? FONT_SIZES[Math.min(base + 1, FONT_SIZES.length - 1)]
                                 : FONT_SIZES[Math.max(base - 1, 0)]
  editor.chain().focus().setFontSize(next).run()
}

export default function RichEditor({ value, onChange, baseFontSize = 14 }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false }),
      TextStyle,
      Color,
      FontSize.configure({ types: ['textStyle'] }),
    ],
    content: toHtml(value),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 100%; line-height: 1.8; color: var(--text); font-family: inherit;',
      },
    },
  })

  useEffect(() => {
    if (editor) editor.view.dom.style.fontSize = `${baseFontSize}px`
  }, [editor, baseFontSize])

  if (!editor) return null

  const bubble = {
    wrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '4px 8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    },
    btn: active => ({
      background: active ? 'var(--accent)' : 'none',
      border: 'none',
      cursor: 'pointer',
      borderRadius: 4,
      padding: '3px 7px',
      fontSize: 13,
      color: active ? '#fff' : 'var(--text)',
      fontWeight: active ? 700 : 400,
      lineHeight: 1.4,
    }),
    divider: { width: 1, height: 16, background: 'var(--border)', margin: '0 3px', flexShrink: 0 },
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', position: 'relative' }}>
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100, placement: 'top' }}
      >
        <div style={bubble.wrapper}>
          {/* 굵게 */}
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
            style={{ ...bubble.btn(editor.isActive('bold')), fontWeight: 700 }}>B</button>

          {/* 기울임 */}
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
            style={{ ...bubble.btn(editor.isActive('italic')), fontStyle: 'italic' }}>I</button>

          {/* 취소선 */}
          <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
            style={{ ...bubble.btn(editor.isActive('strike')), textDecoration: 'line-through' }}>S</button>

          <div style={bubble.divider} />

          {/* 글자 크기 */}
          <button onMouseDown={e => { e.preventDefault(); changeSize(editor, '-') }}
            style={bubble.btn(false)}>A-</button>
          <button onMouseDown={e => { e.preventDefault(); changeSize(editor, '+') }}
            style={bubble.btn(false)}>A+</button>

          <div style={bubble.divider} />

          {/* 색상 */}
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
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: c,
                border: editor.isActive('textStyle', { color: c }) ? '2px solid var(--accent)' : '1px solid #aaa',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} />
    </div>
  )
}
