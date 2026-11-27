import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    ShieldCheck,
    FileText,
    Save,
    RotateCcw,
    ExternalLink,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    AlignRight,
    AlignCenter,
    AlignLeft,
    AlignJustify,
    Quote,
    Link as LinkIcon,
    Minus,
    Undo2,
    Redo2,
    RemoveFormatting,
    Code2,
    CheckCircle2,
    Globe,
    Printer,
    FileCode,
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface LegalPagesManagerProps {
    defaultTab?: 'privacy' | 'terms';
}

interface PageData {
    slug: string;
    key: string;
    title: { ar: string; en: string };
    content: { ar: string; en: string };
    updated_at: string;
}

export const LegalPagesManager: React.FC<LegalPagesManagerProps> = ({ defaultTab = 'privacy' }) => {
    const { t, i18n } = useTranslation('admin');
    const isEn = i18n.language === 'en';
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(defaultTab);
    const [editorLang, setEditorLang] = useState<'ar' | 'en'>('ar');
    const [htmlMode, setHtmlMode] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    // Form state
    const [titleAr, setTitleAr] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [contentAr, setContentAr] = useState('');
    const [contentEn, setContentEn] = useState('');
    const [updatedAt, setUpdatedAt] = useState('');

    const editorRef = useRef<HTMLDivElement>(null);

    // Fetch legal page data
    const { data: pageResponse, isLoading } = useQuery({
        queryKey: ['admin', 'content', 'legal-pages', activeTab],
        queryFn: async () => {
            const res = await apiClient.get(`/content/legal-pages/${activeTab}`);
            return res.data?.data as PageData;
        },
    });

    useEffect(() => {
        if (pageResponse) {
            setTitleAr(pageResponse.title?.ar || (activeTab === 'terms' ? 'الشروط والأحكام' : 'سياسة الخصوصية'));
            setTitleEn(pageResponse.title?.en || (activeTab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'));
            setContentAr(pageResponse.content?.ar || '');
            setContentEn(pageResponse.content?.en || '');
            setUpdatedAt(pageResponse.updated_at || '');
        }
    }, [pageResponse, activeTab]);

    // Active content based on selected language
    const currentTitle = editorLang === 'ar' ? titleAr : titleEn;
    const currentContent = editorLang === 'ar' ? contentAr : contentEn;

    const handleContentChange = (newHtml: string) => {
        if (editorLang === 'ar') {
            setContentAr(newHtml);
        } else {
            setContentEn(newHtml);
        }
    };

    const handleTitleChange = (newTitle: string) => {
        if (editorLang === 'ar') {
            setTitleAr(newTitle);
        } else {
            setTitleEn(newTitle);
        }
    };

    // Synchronize editor innerHTML when switching language or data
    useEffect(() => {
        if (!htmlMode && editorRef.current) {
            if (editorRef.current.innerHTML !== currentContent) {
                editorRef.current.innerHTML = currentContent || '';
            }
        }
    }, [currentContent, editorLang, htmlMode]);

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.put(`/content/legal-pages/${activeTab}`, {
                title: { ar: titleAr, en: titleEn },
                content: { ar: contentAr, en: contentEn },
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'legal-pages'] });
            setNotice(isEn ? 'Saved successfully!' : 'تم حفظ الصفحة والتنسيقات بنجاح!');
            setTimeout(() => setNotice(null), 3500);
        },
    });

    // Formatting commands
    const exec = (command: string, commandValue?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, commandValue);
        if (editorRef.current) {
            handleContentChange(editorRef.current.innerHTML);
        }
    };

    const handleInsertLink = () => {
        const url = window.prompt('URL:', 'https://');
        if (url && url.trim()) {
            exec('createLink', url.trim());
        }
    };

    // Clean paste from Word / Google Docs
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const html = e.clipboardData.getData('text/html');
        if (html) {
            e.preventDefault();
            // Basic cleanup of Microsoft Word specific markup
            let cleaned = html
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
                .replace(/class="Mso[^"]*"/gi, '')
                .replace(/style="[^"]*mso-[^"]*"/gi, '')
                .replace(/<span[^>]*>\s*<\/span>/gi, '');

            document.execCommand('insertHTML', false, cleaned);
            if (editorRef.current) {
                handleContentChange(editorRef.current.innerHTML);
            }
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html dir="${editorLang === 'ar' ? 'rtl' : 'ltr'}">
                <head>
                    <title>${currentTitle}</title>
                    <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.8; }
                        h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
                        h2 { color: #1e293b; margin-top: 24px; }
                        ul, ol { padding-inline-start: 24px; }
                        li { margin-bottom: 8px; }
                    </style>
                </head>
                <body>
                    <h1>${currentTitle}</h1>
                    <div>${currentContent}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    const toolbarBtn =
        'p-1.5 rounded-md text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 transition-colors cursor-pointer';

    return (
        <div className="space-y-6 pb-12">
            {/* Header & Tabs */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-default)] pb-4">
                <div>
                    <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2.5">
                        {activeTab === 'privacy' ? (
                            <ShieldCheck className="h-7 w-7 text-emerald-600" />
                        ) : (
                            <FileText className="h-7 w-7 text-[var(--tenant-primary)]" />
                        )}
                        <span>{t('content.legal_pages_title', { defaultValue: 'إدارة الصفحات القانونية' })}</span>
                    </h1>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {t('content.legal_pages_subtitle', {
                            defaultValue: 'تعديل سياسة الخصوصية والشروط والأحكام بتنسيق وورد غني، وربطها تلقائياً بالمتجر والحاسبة.',
                        })}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href={activeTab === 'privacy' ? '/privacy' : '/terms'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors shadow-2xs"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{t('content.view_live', { defaultValue: 'معاينة بالمتجر' })}</span>
                    </a>

                    <button
                        type="button"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || isLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--tenant-primary)] text-white text-sm font-bold shadow-md hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <Save className="h-4 w-4" />
                        <span>{saveMutation.isPending ? t('common.saving', { defaultValue: 'جارِ الحفظ...' }) : t('common.save', { defaultValue: 'حفظ التعديلات' })}</span>
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            {notice && (
                <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2 shadow-2xs animate-fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{notice}</span>
                </div>
            )}

            {/* Main Tabs: Privacy vs Terms */}
            <div className="flex items-center gap-2 border-b border-[var(--border-default)]">
                <button
                    type="button"
                    onClick={() => setActiveTab('privacy')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                        activeTab === 'privacy'
                            ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{t('content.privacy_policy', { defaultValue: 'سياسة الخصوصية' })}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('terms')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                        activeTab === 'terms'
                            ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    <FileText className="h-4 w-4" />
                    <span>{t('content.terms_conditions', { defaultValue: 'الشروط والأحكام' })}</span>
                </button>

                <div className="ms-auto flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setEditorLang('ar')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            editorLang === 'ar'
                                ? 'bg-white dark:bg-slate-700 text-[var(--text-primary)] shadow-2xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        العربية
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditorLang('en')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            editorLang === 'en'
                                ? 'bg-white dark:bg-slate-700 text-[var(--text-primary)] shadow-2xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        English
                    </button>
                </div>
            </div>

            {/* Document Meta Row */}
            <div className="bg-[var(--surface-primary)] p-4 rounded-xl border border-[var(--border-default)] shadow-2xs flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                        {t('content.document_title', { defaultValue: 'عنوان الوثيقة' })} ({editorLang.toUpperCase()})
                    </label>
                    <input
                        type="text"
                        value={currentTitle}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--tenant-primary)]"
                        placeholder={activeTab === 'terms' ? 'الشروط والأحكام' : 'سياسة الخصوصية'}
                    />
                </div>

                {updatedAt && (
                    <div className="text-xs text-[var(--text-secondary)] md:self-end md:pb-2">
                        <span>{t('content.last_updated', { defaultValue: 'آخر تحديث:' })} </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                            {new Date(updatedAt).toLocaleDateString(isEn ? 'en-US' : 'ar-SA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </span>
                    </div>
                )}
            </div>

            {/* Word-like Document Container */}
            <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 p-3 sm:p-6 shadow-inner">
                {/* Word Ribbon Toolbar */}
                <div className="sticky top-20 z-20 mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-sm flex flex-wrap items-center gap-1">
                    {/* Block Formats */}
                    <select
                        onChange={(e) => {
                            if (e.target.value) exec('formatBlock', e.target.value);
                        }}
                        defaultValue=""
                        className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                        <option value="P">{isEn ? 'Paragraph' : 'فقرة عادية'}</option>
                        <option value="H1">{isEn ? 'Heading 1' : 'عنوان رئيسي H1'}</option>
                        <option value="H2">{isEn ? 'Heading 2' : 'عنوان فرعي H2'}</option>
                        <option value="H3">{isEn ? 'Heading 3' : 'عنوان قسم H3'}</option>
                        <option value="BLOCKQUOTE">{isEn ? 'Quote' : 'اقتباس / تنبيه'}</option>
                    </select>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Font sizes */}
                    <select
                        onChange={(e) => {
                            if (e.target.value) exec('fontSize', e.target.value);
                        }}
                        defaultValue="3"
                        className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                        title="Font Size"
                    >
                        <option value="2">{isEn ? 'Small (12px)' : 'صغير (12)'}</option>
                        <option value="3">{isEn ? 'Medium (14px)' : 'متوسط (14)'}</option>
                        <option value="4">{isEn ? 'Large (16px)' : 'كبير (16)'}</option>
                        <option value="5">{isEn ? 'X-Large (18px)' : 'كبير جداً (18)'}</option>
                        <option value="6">{isEn ? 'Huge (24px)' : 'ضخم (24)'}</option>
                    </select>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Basic Styling */}
                    <button type="button" onClick={() => exec('bold')} className={toolbarBtn} title="Bold (عريض)">
                        <Bold className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('italic')} className={toolbarBtn} title="Italic (مائل)">
                        <Italic className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('underline')} className={toolbarBtn} title="Underline (تسطير)">
                        <Underline className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('strikeThrough')} className={toolbarBtn} title="Strikethrough (شطب)">
                        <Strikethrough className="h-4 w-4" />
                    </button>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Text Color & Highlight */}
                    <label className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200" title="لون النص">
                        <span className="underline font-black text-rose-600">A</span>
                        <input
                            type="color"
                            onChange={(e) => exec('foreColor', e.target.value)}
                            className="w-4 h-4 border-0 p-0 bg-transparent cursor-pointer"
                        />
                    </label>

                    <label className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200" title="تظليل النص (هايلايت)">
                        <span className="bg-amber-300 text-slate-900 px-1 rounded text-[10px]">HL</span>
                        <input
                            type="color"
                            defaultValue="#fef08a"
                            onChange={(e) => exec('hiliteColor', e.target.value)}
                            className="w-4 h-4 border-0 p-0 bg-transparent cursor-pointer"
                        />
                    </label>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Alignment */}
                    <button type="button" onClick={() => exec('justifyRight')} className={toolbarBtn} title="محاذاة يمين">
                        <AlignRight className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('justifyCenter')} className={toolbarBtn} title="توسيط">
                        <AlignCenter className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('justifyLeft')} className={toolbarBtn} title="محاذاة يسار">
                        <AlignLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('justifyFull')} className={toolbarBtn} title="ضبط النص (Justify)">
                        <AlignJustify className="h-4 w-4" />
                    </button>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Lists & Divider */}
                    <button type="button" onClick={() => exec('insertUnorderedList')} className={toolbarBtn} title="قائمة نقطية">
                        <List className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('insertOrderedList')} className={toolbarBtn} title="قائمة رقمية">
                        <ListOrdered className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('insertHorizontalRule')} className={toolbarBtn} title="فاصل أفقي">
                        <Minus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={handleInsertLink} className={toolbarBtn} title="إدراج رابط">
                        <LinkIcon className="h-4 w-4" />
                    </button>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Utilities */}
                    <button type="button" onClick={() => exec('undo')} className={toolbarBtn} title="تراجع">
                        <Undo2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('redo')} className={toolbarBtn} title="إعادة">
                        <Redo2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => exec('removeFormat')} className={toolbarBtn} title="مسح التنسيق">
                        <RemoveFormatting className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={handlePrint} className={toolbarBtn} title="طباعة مسودة الوثيقة">
                        <Printer className="h-4 w-4" />
                    </button>

                    {/* HTML Source Toggle */}
                    <button
                        type="button"
                        onClick={() => setHtmlMode((v) => !v)}
                        className={`ms-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            htmlMode
                                ? 'bg-[var(--tenant-primary)] text-white'
                                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Code2 className="h-3.5 w-3.5" />
                        <span>{htmlMode ? 'Visual' : 'HTML'}</span>
                    </button>
                </div>

                {/* A4 Sheet Word Document Canvas */}
                <div className="mx-auto max-w-[850px] min-h-[750px] bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-14 relative transition-all">
                    {/* Word Page Watermark / Header */}
                    <div className="flex items-center justify-between pb-6 mb-8 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-400 select-none">
                        <span className="font-semibold tracking-wider uppercase">
                            {activeTab === 'terms' ? 'Terms & Conditions Document' : 'Privacy & Data Protection Policy'}
                        </span>
                        <span>{editorLang === 'ar' ? 'مسودة معتمدة · شركة نواف أوتو' : 'Official Document · Noaf Auto'}</span>
                    </div>

                    {/* Document Title Heading */}
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                        {currentTitle || (activeTab === 'terms' ? 'الشروط والأحكام' : 'سياسة الخصوصية')}
                    </h1>

                    {/* Word Document Editable Area */}
                    {htmlMode ? (
                        <textarea
                            value={currentContent}
                            onChange={(e) => handleContentChange(e.target.value)}
                            dir="ltr"
                            rows={24}
                            className="w-full p-4 font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none resize-y"
                        />
                    ) : (
                        <div
                            ref={editorRef}
                            contentEditable
                            dir={editorLang === 'ar' ? 'rtl' : 'ltr'}
                            onInput={(e) => handleContentChange((e.currentTarget as HTMLDivElement).innerHTML)}
                            onPaste={handlePaste}
                            data-placeholder={t('content.type_document_here', { defaultValue: 'اكتب أو الصق محتوى وثيقة الوورد هنا...' })}
                            className="min-h-[550px] text-base leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none prose prose-slate max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
                        />
                    )}

                    {/* Word Document Page Footer */}
                    <div className="mt-16 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 select-none">
                        <span>نواف أوتو لتمويل وتقسيط السيارات</span>
                        <span>صفحة رقم 1 من 1</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
