import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useState, useEffect, useRef } from 'react'
import {
    Heading1, Heading2, Heading3, List, ListOrdered,
    CheckSquare, Quote, Type, Table as TableIcon,
    Trash2, ArrowDown, ArrowRight, PanelLeft, PanelTop,
    Link as LinkIcon, Edit
} from 'lucide-react'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    readOnly?: boolean
    style?: React.CSSProperties
}

// Slash Command Menu Component
const SlashCommandMenu = ({ editor, position, onClose }: { editor: any, position: { top: number, left: number }, onClose: () => void }) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)

    const items = [
        {
            title: 'Text',
            description: 'Just start writing with plain text.',
            icon: <Type size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setParagraph().run()
            }
        },
        {
            title: 'Heading 1',
            description: 'Big section heading.',
            icon: <Heading1 size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
            }
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading.',
            icon: <Heading2 size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
            }
        },
        {
            title: 'Heading 3',
            description: 'Small section heading.',
            icon: <Heading3 size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
            }
        },
        {
            title: 'To-do List',
            description: 'Track tasks with a to-do list.',
            icon: <CheckSquare size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run()
            }
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bulleted list.',
            icon: <List size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run()
            }
        },
        {
            title: 'Numbered List',
            description: 'Create a list with numbering.',
            icon: <ListOrdered size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run()
            }
        },
        {
            title: 'Quote',
            description: 'Capture a quote.',
            icon: <Quote size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run()
            }
        },
        {
            title: 'Table',
            description: 'Add a simple table.',
            icon: <TableIcon size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
        },

        {
            title: 'Link',
            description: 'Insert a link.',
            icon: <LinkIcon size={18} />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run()
                const url = window.prompt('Enter link URL')
                if (url) {
                    if (editor.state.selection.empty) {
                        editor.chain().focus().insertContent({
                            type: 'text',
                            text: url,
                            marks: [{ type: 'link', attrs: { href: url } }]
                        }).run()
                    } else {
                        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
                    }
                }
            }
        }
    ]

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % items.length)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                selectItem(selectedIndex)
            } else if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [selectedIndex, onClose])

    const selectItem = (index: number) => {
        const item = items[index]
        if (item) {
            // Find the slash position relative to current selection
            const { from } = editor.state.selection
            const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from, '\n', '\0')
            const slashIndex = textBefore.lastIndexOf('/')

            if (slashIndex !== -1) {
                // The absolute pos of the slash
                const absoluteSlashPos = from - (textBefore.length - slashIndex)
                const range = { from: absoluteSlashPos, to: from }
                item.command({ editor, range })
                onClose()
            } else {
                const range = { from, to: from }
                item.command({ editor, range })
                onClose()
            }
        }
    }

    return (
        <div
            ref={menuRef}
            className="slash-menu"
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 9999,
                background: 'var(--bg-secondary)',
                borderRadius: '0.5rem',
                boxShadow: 'var(--glass-shadow)',
                border: '1px solid var(--border-color)',
                width: '300px',
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '0.5rem'
            }}
        >
            <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Basic Blocks
            </div>
            {items.map((item, index) => (
                <div
                    key={index}
                    onClick={() => selectItem(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        background: index === selectedIndex ? 'var(--bg-tertiary)' : 'transparent',
                        transition: 'background 0.1s'
                    }}
                >
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '0.25rem',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)'
                    }}>
                        {item.icon}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.description}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Table Menu Button Component
const MenuButton = ({ onClick, icon: Icon, title, active = false }: any) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            background: active ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none',
            borderRadius: '0.25rem',
            padding: '0.25rem',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
        onMouseLeave={(e) => e.currentTarget.style.background = active ? 'var(--bg-tertiary)' : 'transparent'}
    >
        <Icon size={16} />
    </button>
)

export default function RichTextEditor({ value, onChange, placeholder, readOnly = false, style }: RichTextEditorProps) {
    const [menuState, setMenuState] = useState<{ isOpen: boolean, position: { top: number, left: number } }>({
        isOpen: false,
        position: { top: 0, left: 0 }
    })

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
            }),
            Placeholder.configure({
                placeholder: placeholder || (readOnly ? '' : "Type '/' for commands..."),
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            BubbleMenuExtension.configure({
                element: null, // Let React component handle element
            }),
            Image,
            Link.configure({
                openOnClick: false,
            })
        ],
        content: value,
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            onChange(html)

            // Slash command hook
            if (!readOnly) {
                const { selection } = editor.state
                const { from } = selection
                const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from, '\n', '\0')

                // Simple trigger: if last char was '/'
                // For better UX, we might check if it's start of paragraph or preceded by space
                if (textBefore === '/') {
                    const coords = editor.view.coordsAtPos(from)
                    setMenuState({
                        isOpen: true,
                        position: { top: coords.bottom + 5, left: coords.left }
                    })
                } else if (menuState.isOpen) {
                    // Check if we should close (e.g. space typed, or backspace removed slash)
                    const fullTextBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from, '\n', '\0')
                    if (!fullTextBefore.includes('/')) {
                        setMenuState(prev => ({ ...prev, isOpen: false }))
                    }
                }
            }
        },
        editorProps: {
            handleKeyDown: (_view, event) => {
                if (menuState.isOpen && ['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
                    // Let the menu handle it via its own listener
                    return false
                }
                return false
            }
        }
    })

    // Update content if value changes externally
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            // Only update if content is different to avoid cursor jumps
            if (editor.getText() === '' && value === '') return // Avoid loop on empty
            if (Math.abs(editor.getHTML().length - value.length) > 10) { // Rough heuristic
                editor.commands.setContent(value)
            }
        }
    }, [value, editor])

    return (
        <div className="tiptap-editor-wrapper" style={{ position: 'relative', ...style }}>
            {editor && !readOnly && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    shouldShow={({ editor }: { editor: any }) => editor.isActive('table')}
                    className="bubble-menu-table"
                >
                    <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                        padding: '0.5rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        boxShadow: 'var(--glass-shadow)'
                    }}>
                        <MenuButton
                            onClick={() => editor.chain().focus().addColumnBefore().run()}
                            icon={PanelLeft}
                            title="Add Column Before"
                        />
                        <MenuButton
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                            icon={ArrowRight}
                            title="Add Column After"
                        />
                        <MenuButton
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                            icon={Trash2}
                            title="Delete Column"
                        />
                        <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 0.25rem' }} />
                        <MenuButton
                            onClick={() => editor.chain().focus().addRowBefore().run()}
                            icon={PanelTop}
                            title="Add Row Before"
                        />
                        <MenuButton
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                            icon={ArrowDown}
                            title="Add Row After"
                        />
                        <MenuButton
                            onClick={() => editor.chain().focus().deleteRow().run()}
                            icon={Trash2}
                            title="Delete Row"
                        />
                        <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 0.25rem' }} />
                        <MenuButton
                            onClick={() => editor.chain().focus().deleteTable().run()}
                            icon={Trash2}
                            title="Delete Table"
                            active={true} // Highlight delete table
                        />
                    </div>
                </BubbleMenu>
            )}
            {editor && !readOnly && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    shouldShow={({ editor }: { editor: any }) => editor.isActive('image')}
                    className="bubble-menu-image"
                >
                    <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                        padding: '0.5rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        boxShadow: 'var(--glass-shadow)'
                    }}>
                        <MenuButton
                            onClick={() => {
                                const url = window.prompt('Enter new image URL')
                                if (url) {
                                    editor.chain().focus().setImage({ src: url }).run()
                                }
                            }}
                            icon={Edit}
                            title="Edit Image"
                        />
                        <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 0.25rem' }} />
                        <MenuButton
                            onClick={() => editor.chain().focus().deleteSelection().run()}
                            icon={Trash2}
                            title="Delete Image"
                            active={true}
                        />
                    </div>
                </BubbleMenu>
            )}

            <EditorContent editor={editor} className={readOnly ? 'read-only' : ''} />

            {menuState.isOpen && !readOnly && editor && (
                <SlashCommandMenu
                    editor={editor}
                    position={menuState.position}
                    onClose={() => setMenuState({ ...menuState, isOpen: false })}
                />
            )}

            <style>{`
                .tiptap-editor-wrapper {
                    font-family: 'Inter', sans-serif;
                }
                .ProseMirror {
                    min-height: ${readOnly ? 'auto' : '100px'};
                    outline: none;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    color: var(--text-primary);
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: var(--text-secondary);
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                /* Typography */
                .ProseMirror h1 { font-size: 1.8rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; line-height: 1.2; color: var(--text-primary); }
                .ProseMirror h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; color: var(--text-primary); }
                .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: var(--text-primary); }
                .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; color: var(--text-primary); }
                .ProseMirror blockquote { border-left: 3px solid var(--border-color); padding-left: 1rem; color: var(--text-secondary); font-style: italic; }
                .ProseMirror a { color: var(--accent-color); text-decoration: underline; cursor: pointer; }
                .ProseMirror img { max-width: 100%; height: auto; border-radius: 0.5rem; }
                
                /* Task List */
                ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    margin-bottom: 0.25rem;
                }
                ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    margin-right: 0.5rem;
                    user-select: none;
                    margin-top: 0.15rem; /* Better alignment with text */
                }
                ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                }
                ul[data-type="taskList"] li > div > p {
                    margin: 0;
                }
                ul[data-type="taskList"] li[data-checked="true"] > div {
                    text-decoration: line-through;
                    color: var(--text-secondary);
                }
                ul[data-type="taskList"] input[type="checkbox"] {
                    cursor: pointer;
                    width: 1.1em;
                    height: 1.1em;
                }

                /* Tables */
                .ProseMirror table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 0;
                    overflow: hidden;
                }
                .ProseMirror td, .ProseMirror th {
                    min-width: 1em;
                    border: 2px solid var(--border-color);
                    padding: 3px 5px;
                    vertical-align: top;
                    box-sizing: border-box;
                    position: relative;
                }
                .ProseMirror th {
                    font-weight: bold;
                    text-align: left;
                    background-color: var(--bg-tertiary);
                }
                .ProseMirror .selectedCell:after {
                    z-index: 2;
                    position: absolute;
                    content: "";
                    left: 0; right: 0; top: 0; bottom: 0;
                    background: rgba(200, 200, 255, 0.4);
                    pointer-events: none;
                }
                .ProseMirror .column-resize-handle {
                    position: absolute;
                    right: -2px;
                    top: 0;
                    bottom: -2px;
                    width: 4px;
                    background-color: #adf;
                    pointer-events: none;
                }
            `}</style>
        </div>
    )
}
