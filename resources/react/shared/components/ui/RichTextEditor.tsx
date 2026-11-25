import React, { useEffect, useRef, useState } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    AlignRight,
    AlignCenter,
    AlignLeft,
    Quote,
    Link as LinkIcon,
    Image as ImageIcon,
    Minus,
    Undo2,
    Redo2,
    RemoveFormatting,
    Code2,
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    dir?: 'rtl' | 'ltr';
    wordsLabel?: string;
    htmlLabel?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = '',
    dir = 'rtl',
    wordsLabel = 'words',
    htmlLabel = 'HTML',
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [htmlMode, setHtmlMode] = useState(false);

    useEffect(() => {
        if (!htmlMode && editorRef.current && editorRef.current.innerHTML !== (value || '')) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value, htmlMode]);

    const exec = (command: string, commandValue?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, commandValue);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInsertLink = () => {
        const url = window.prompt('URL:', 'https://');
        if (url && url.trim()) {
            exec('createLink', url.trim());
        }
    };

    const handleInsertImage = () => {
        const url = window.prompt('Image URL:', 'https://');
        if (url && url.trim()) {
            exec('insertImage', url.trim());
        }
    };

    const plainText = (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText ? plainText.split(' ').length : 0;

    const toolbarBtn =
        'p-1.5 rounded-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 transition-colors cursor-pointer';

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            {/* Word-like Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-2.5 py-2 bg-slate-50 border-b border-slate-200">
                <select
                    onChange={(e) => {
                        if (e.target.value) exec('formatBlock', e.target.value);
                    }}
                    defaultValue=""
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                    <option value="P">Paragraph</option>
                    <option value="H1">Heading 1</option>
                    <option value="H2">Heading 2</option>
                    <option value="H3">Heading 3</option>
                </select>

                <div className="h-5 w-px bg-slate-200 mx-0.5" />

                <button type="button" onClick={() => exec('bold')} className={toolbarBtn} title="Bold"><Bold className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('italic')} className={toolbarBtn} title="Italic"><Italic className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('underline')} className={toolbarBtn} title="Underline"><Underline className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('strikeThrough')} className={toolbarBtn} title="Strikethrough"><Strikethrough className="h-4 w-4" /></button>

                <div className="h-5 w-px bg-slate-200 mx-0.5" />

                <label className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-slate-200/80 cursor-pointer text-xs text-slate-600" title="Text Color">
                    <span className="font-bold underline">A</span>
                    <input
                        type="color"
                        onChange={(e) => exec('foreColor', e.target.value)}
                        className="w-4 h-4 border-0 p-0 bg-transparent cursor-pointer"
                    />
                </label>

                <div className="h-5 w-px bg-slate-200 mx-0.5" />

                <button type="button" onClick={() => exec('justifyRight')} className={toolbarBtn} title="Align Right"><AlignRight className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('justifyCenter')} className={toolbarBtn} title="Align Center"><AlignCenter className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('justifyLeft')} className={toolbarBtn} title="Align Left"><AlignLeft className="h-4 w-4" /></button>

                <div className="h-5 w-px bg-slate-200 mx-0.5" />

                <button type="button" onClick={() => exec('insertUnorderedList')} className={toolbarBtn} title="Bullet List"><List className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('insertOrderedList')} className={toolbarBtn} title="Numbered List"><ListOrdered className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('formatBlock', 'BLOCKQUOTE')} className={toolbarBtn} title="Quote"><Quote className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('insertHorizontalRule')} className={toolbarBtn} title="Divider"><Minus className="h-4 w-4" /></button>

                <div className="h-5 w-px bg-slate-200 mx-0.5" />

                <button type="button" onClick={handleInsertLink} className={toolbarBtn} title="Insert Link"><LinkIcon className="h-4 w-4" /></button>
                <button type="button" onClick={handleInsertImage} className={toolbarBtn} title="Insert Image URL"><ImageIcon className="h-4 w-4" /></button>

                <div className="h-5 w-px bg-slate-200 mx-0.5" />

                <button type="button" onClick={() => exec('undo')} className={toolbarBtn} title="Undo"><Undo2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('redo')} className={toolbarBtn} title="Redo"><Redo2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => exec('removeFormat')} className={toolbarBtn} title="Clear Formatting"><RemoveFormatting className="h-4 w-4" /></button>

                <button
                    type="button"
                    onClick={() => setHtmlMode((v) => !v)}
                    className={`ms-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        htmlMode ? 'bg-[var(--tenant-primary,#1877F2)] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>{htmlLabel}</span>
                </button>
            </div>

            {/* Editable Surface */}
            {htmlMode ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    dir="ltr"
                    rows={14}
                    className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-950/5 focus:outline-hidden resize-y"
                />
            ) : (
                <div
                    ref={editorRef}
                    contentEditable
                    dir={dir}
                    data-placeholder={placeholder}
                    onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
                    className="min-h-[340px] max-h-[540px] overflow-y-auto p-5 text-sm text-slate-800 leading-relaxed focus:outline-hidden prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
                />
            )}

            {/* Status Bar */}
            <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>{wordCount} {wordsLabel}</span>
                <span className="uppercase">{dir}</span>
            </div>
        </div>
    );
};
