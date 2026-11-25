import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    ArrowRight,
    ArrowLeft,
    Save,
    Image as ImageIcon,
    Tag,
    Hash,
    X,
    Clock,
    Star,
    CheckCircle2,
    FileText,
    Globe,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { formatLocaleString } from '../../../shared/components/crm/CrudTableManager';
import { RichTextEditor } from '../../../shared/components/ui/RichTextEditor';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';

interface BlogPostItem {
    id: number;
    title: any;
    title_translations?: { ar?: string; en?: string };
    excerpt?: any;
    excerpt_translations?: { ar?: string; en?: string };
    content?: any;
    content_translations?: { ar?: string; en?: string };
    thumbnail?: string | null;
    is_published: boolean;
    is_featured?: boolean;
    tag?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    meta_keywords?: string | null;
    reading_time?: number;
    categories?: Array<{ id: number; name: any }>;
    category_ids?: number[];
    created_at?: string;
}

export const BlogPostsPage: React.FC = () => {
    const { t, i18n } = useTranslation('admin');
    const isEn = i18n.language === 'en';
    const dateLocale = isEn ? 'en-US' : 'ar-SA';
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [mode, setMode] = useState<'list' | 'editor'>('list');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editorLang, setEditorLang] = useState<'ar' | 'en'>(isEn ? 'en' : 'ar');
    const [notice, setNotice] = useState<string | null>(null);

    // Editor fields
    const [titleAr, setTitleAr] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [excerptAr, setExcerptAr] = useState('');
    const [excerptEn, setExcerptEn] = useState('');
    const [contentAr, setContentAr] = useState('');
    const [contentEn, setContentEn] = useState('');
    const [isPublished, setIsPublished] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
    const [tag, setTag] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [keywordInput, setKeywordInput] = useState('');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: postsRes, isLoading } = useQuery({
        queryKey: ['admin', 'content', 'blogs', debouncedSearch],
        queryFn: async () => {
            const res = await apiClient.get('/content/blogs', {
                params: { search: debouncedSearch || undefined },
            });
            return res.data;
        },
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['admin', 'content', 'blog-categories'],
        queryFn: async () => (await apiClient.get('/content/blog-categories')).data?.data ?? [],
        staleTime: 5 * 60 * 1000,
    });

    const posts: BlogPostItem[] = useMemo(() => postsRes?.data ?? [], [postsRes]);

    const openNewEditor = () => {
        setEditingId(null);
        setTitleAr('');
        setTitleEn('');
        setExcerptAr('');
        setExcerptEn('');
        setContentAr('');
        setContentEn('');
        setIsPublished(true);
        setIsFeatured(false);
        setSelectedCategoryIds([]);
        setTag('');
        setKeywords([]);
        setKeywordInput('');
        setMetaTitle('');
        setMetaDescription('');
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setError(null);
        setMode('editor');
    };

    const openEditEditor = (post: BlogPostItem) => {
        setEditingId(post.id);
        setTitleAr(post.title_translations?.ar || (typeof post.title === 'string' ? post.title : ''));
        setTitleEn(post.title_translations?.en || '');
        setExcerptAr(post.excerpt_translations?.ar || (typeof post.excerpt === 'string' ? post.excerpt : ''));
        setExcerptEn(post.excerpt_translations?.en || '');
        setContentAr(post.content_translations?.ar || (typeof post.content === 'string' ? post.content : ''));
        setContentEn(post.content_translations?.en || '');
        setIsPublished(Boolean(post.is_published));
        setIsFeatured(Boolean(post.is_featured));
        setSelectedCategoryIds(post.category_ids ?? (post.categories?.map((c) => c.id) || []));
        setTag(post.tag || '');
        setKeywords(
            post.meta_keywords
                ? post.meta_keywords.split(',').map((k) => k.trim()).filter(Boolean)
                : []
        );
        setKeywordInput('');
        setMetaTitle(post.meta_title || '');
        setMetaDescription(post.meta_description || '');
        setThumbnailFile(null);
        setThumbnailPreview(post.thumbnail || null);
        setError(null);
        setMode('editor');
    };

    const addKeyword = (raw: string) => {
        const cleaned = raw.replace(/,/g, '').trim();
        if (!cleaned) return;
        if (!keywords.includes(cleaned)) {
            setKeywords((prev) => [...prev, cleaned]);
        }
        setKeywordInput('');
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            fd.append('title[ar]', titleAr.trim() || titleEn.trim());
            fd.append('title[en]', titleEn.trim() || titleAr.trim());
            if (excerptAr.trim() || excerptEn.trim()) {
                fd.append('excerpt[ar]', excerptAr.trim());
                fd.append('excerpt[en]', excerptEn.trim());
            }
            fd.append('content[ar]', contentAr || contentEn || '<p></p>');
            fd.append('content[en]', contentEn || contentAr || '<p></p>');
            fd.append('is_published', isPublished ? '1' : '0');
            fd.append('is_featured', isFeatured ? '1' : '0');
            selectedCategoryIds.forEach((cid) => fd.append('category_ids[]', String(cid)));
            if (tag.trim()) fd.append('tag', tag.trim());
            if (keywords.length > 0 || editingId) fd.append('meta_keywords', keywords.join(', '));
            if (metaTitle.trim()) fd.append('meta_title', metaTitle.trim());
            if (metaDescription.trim()) fd.append('meta_description', metaDescription.trim());
            if (thumbnailFile) fd.append('thumbnail', thumbnailFile);

            if (editingId) {
                fd.append('_method', 'PUT');
                return (await apiClient.post(`/content/blogs/${editingId}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })).data;
            }
            return (await apiClient.post('/content/blogs', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'blogs'] });
            setMode('list');
            setNotice(t('content.blog_saved'));
            setTimeout(() => setNotice(null), 3500);
        },
        onError: (e: any) => {
            const errors = e?.response?.data?.errors;
            const firstErr = errors ? Object.values(errors).flat()[0] : null;
            setError((firstErr as string) || e?.response?.data?.message || t('common.error'));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/content/blogs/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'blogs'] }),
    });

    const toggleCategory = (id: number) => {
        setSelectedCategoryIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    if (mode === 'editor') {
        const BackIcon = isEn ? ArrowLeft : ArrowRight;
        const activeTitle = editorLang === 'ar' ? titleAr : titleEn;
        const activeExcerpt = editorLang === 'ar' ? excerptAr : excerptEn;
        const activeContent = editorLang === 'ar' ? contentAr : contentEn;

        return (
            <div className="space-y-5">
                {/* Editor Top Bar */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMode('list')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                            <BackIcon className="h-4 w-4" />
                            <span>{t('content.blog_back_list')}</span>
                        </button>
                        <h1 className="text-base font-bold text-slate-900">
                            {editingId ? t('content.blog_edit_post') : t('content.blog_new_post')}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Bilingual Tab Switcher */}
                        <div className="inline-flex rounded-lg bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => setEditorLang('ar')}
                                className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                                    editorLang === 'ar' ? 'bg-white text-[var(--tenant-primary,#1877F2)] shadow-2xs' : 'text-slate-600'
                                }`}
                            >
                                العربية
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorLang('en')}
                                className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                                    editorLang === 'en' ? 'bg-white text-[var(--tenant-primary,#1877F2)] shadow-2xs' : 'text-slate-600'
                                }`}
                            >
                                English
                            </button>
                        </div>

                        <button
                            type="button"
                            disabled={saveMutation.isPending || (!titleAr.trim() && !titleEn.trim())}
                            onClick={() => saveMutation.mutate()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--tenant-primary,#1877F2)] hover:brightness-110 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-xs"
                        >
                            <Save className="h-4 w-4" />
                            <span>{saveMutation.isPending ? t('common.saving') : t('content.blog_save')}</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                        {error}
                    </div>
                )}

                {/* 2-Column Word-like Editor Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
                    {/* Left: Title, Excerpt, Rich Text Word Editor */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    {t('content.post_title')} ({editorLang.toUpperCase()}) *
                                </label>
                                <input
                                    type="text"
                                    dir={editorLang === 'ar' ? 'rtl' : 'ltr'}
                                    value={activeTitle}
                                    onChange={(e) => (editorLang === 'ar' ? setTitleAr(e.target.value) : setTitleEn(e.target.value))}
                                    placeholder={t('content.blog_title_ph')}
                                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    {t('content.blog_excerpt')} ({editorLang.toUpperCase()})
                                </label>
                                <textarea
                                    rows={2}
                                    dir={editorLang === 'ar' ? 'rtl' : 'ltr'}
                                    value={activeExcerpt}
                                    onChange={(e) => (editorLang === 'ar' ? setExcerptAr(e.target.value) : setExcerptEn(e.target.value))}
                                    placeholder={t('content.blog_excerpt_ph')}
                                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                />
                            </div>
                        </div>

                        <RichTextEditor
                            value={activeContent}
                            onChange={(html) => (editorLang === 'ar' ? setContentAr(html) : setContentEn(html))}
                            placeholder={t('content.blog_content_ph')}
                            dir={editorLang === 'ar' ? 'rtl' : 'ltr'}
                            wordsLabel={t('content.blog_words')}
                            htmlLabel={t('content.blog_html_mode')}
                        />
                    </div>

                    {/* Right Sidebar: Publishing, Categories, Thumbnail, SEO Keywords */}
                    <div className="space-y-4">
                        {/* Publishing & Categories */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                                {t('content.blog_publish_box')}
                            </h3>

                            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                                <span>{t('content.publish_now')}</span>
                                <input
                                    type="checkbox"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="h-4 w-4 accent-[var(--tenant-primary,#1877F2)]"
                                />
                            </label>

                            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                                <span className="flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 text-amber-500" />
                                    {t('content.blog_featured')}
                                </span>
                                <input
                                    type="checkbox"
                                    checked={isFeatured}
                                    onChange={(e) => setIsFeatured(e.target.checked)}
                                    className="h-4 w-4 accent-[var(--tenant-primary,#1877F2)]"
                                />
                            </label>

                            {categories.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                    <div className="text-xs font-bold text-slate-700">{t('content.blog_categories')}</div>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                        {categories.map((cat: any) => (
                                            <label key={cat.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategoryIds.includes(cat.id)}
                                                    onChange={() => toggleCategory(cat.id)}
                                                    className="h-3.5 w-3.5 accent-[var(--tenant-primary,#1877F2)]"
                                                />
                                                <span>{formatLocaleString(cat.name)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Featured Image */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5 text-[var(--tenant-primary,#1877F2)]" />
                                <span>{t('content.featured_image')}</span>
                            </h3>
                            {thumbnailPreview && (
                                <img
                                    src={thumbnailPreview}
                                    alt="Preview"
                                    className="w-full h-36 object-cover rounded-lg border border-slate-200"
                                />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setThumbnailFile(file);
                                        setThumbnailPreview(URL.createObjectURL(file));
                                    }
                                }}
                                className="w-full text-xs text-slate-600 file:me-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                            />
                        </div>

                        {/* SEO & Keywords */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{t('content.blog_seo_box')}</span>
                            </h3>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    {t('content.blog_tag')}
                                </label>
                                <input
                                    type="text"
                                    value={tag}
                                    onChange={(e) => setTag(e.target.value)}
                                    placeholder={t('content.blog_tag_ph')}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                                    <Hash className="h-3 w-3" />
                                    {t('content.blog_keywords')}
                                </label>
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ',') {
                                                e.preventDefault();
                                                addKeyword(keywordInput);
                                            }
                                        }}
                                        placeholder={t('content.blog_keywords_ph')}
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => addKeyword(keywordInput)}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">{t('content.blog_keywords_hint')}</p>
                                {keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {keywords.map((kw) => (
                                            <span
                                                key={kw}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium"
                                            >
                                                <span>#{kw}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setKeywords((prev) => prev.filter((item) => item !== kw))}
                                                    className="hover:text-rose-600 cursor-pointer"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    {t('content.blog_meta_title')}
                                </label>
                                <input
                                    type="text"
                                    value={metaTitle}
                                    onChange={(e) => setMetaTitle(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    {t('content.blog_meta_desc')}
                                </label>
                                <textarea
                                    rows={2}
                                    value={metaDescription}
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* List Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <FileText className="h-6 w-6 text-[var(--tenant-primary,#1877F2)]" />
                        <span>{t('content.blogs_title')}</span>
                    </h1>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{t('content.blogs_sub')}</p>
                </div>
                <button
                    type="button"
                    onClick={openNewEditor}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--tenant-primary,#1877F2)] hover:brightness-110 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    <span>{t('content.blog_new_post')}</span>
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('content.blog_search_ph')}
                        className="w-full ps-9 pe-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[var(--tenant-primary,#1877F2)]"
                    />
                </div>
            </div>

            {/* Posts Grid/Table */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--tenant-primary,#1877F2)]" />
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 py-14 text-center text-xs text-slate-400">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    {t('content.blog_no_posts')}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.map((post) => {
                        const titleText = isEn
                            ? (post.title_translations?.en || formatLocaleString(post.title))
                            : (post.title_translations?.ar || formatLocaleString(post.title));
                        const postKeywords = post.meta_keywords
                            ? post.meta_keywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 4)
                            : [];

                        return (
                            <div
                                key={post.id}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
                            >
                                {post.thumbnail ? (
                                    <img src={post.thumbnail} alt={titleText} className="w-full h-40 object-cover" />
                                ) : (
                                    <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-300">
                                        <ImageIcon className="h-10 w-10" />
                                    </div>
                                )}

                                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                    post.is_published
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}
                                            >
                                                {post.is_published ? t('common.active') : t('common.inactive')}
                                            </span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {t('content.blog_reading_min', { count: post.reading_time || 1 })}
                                            </span>
                                        </div>

                                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{titleText}</h3>

                                        {postKeywords.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {postKeywords.map((kw) => (
                                                    <span
                                                        key={kw}
                                                        className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                                                    >
                                                        #{kw}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-[11px] text-slate-400">
                                            {post.created_at ? new Date(post.created_at).toLocaleDateString(dateLocale) : '—'}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditEditor(post)}
                                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[var(--tenant-primary,#1877F2)] hover:border-[var(--tenant-primary,#1877F2)] cursor-pointer"
                                                title={t('common.edit')}
                                            >
                                                <Edit className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm(t('common.confirm_delete'))) {
                                                        deleteMutation.mutate(post.id);
                                                    }
                                                }}
                                                className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 cursor-pointer"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {notice && (
                <div className="fixed bottom-6 start-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{notice}</span>
                </div>
            )}
        </div>
    );
};
