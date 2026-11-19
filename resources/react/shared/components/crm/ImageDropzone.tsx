import React, { useRef, useState } from 'react';
import { UploadCloud, X, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';

export interface ExistingImage {
    id: number;
    url: string;
    type?: string;
}

export interface ImageDropzoneProps {
    label?: string;
    description?: string;
    multiple?: boolean;
    existingImages?: ExistingImage[];
    onDeleteExisting?: (id: number) => Promise<void> | void;
    onFilesSelected: (files: File[]) => void;
    className?: string;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
    label,
    description = 'اسحب الصور وأفلتها هنا، أو اضغط للاختيار من جهازك (PNG, JPG, WEBP حتى 10MB)',
    multiple = false,
    existingImages = [],
    onDeleteExisting,
    onFilesSelected,
    className = '',
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string }[]>([]);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleFiles = (incoming: FileList | null) => {
        if (!incoming || incoming.length === 0) return;

        const validFiles = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
        const newEntries = validFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
        }));

        if (multiple) {
            const updated = [...selectedFiles, ...newEntries];
            setSelectedFiles(updated);
            onFilesSelected(updated.map((u) => u.file));
        } else {
            // Clean old previews
            selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
            const single = newEntries.slice(0, 1);
            setSelectedFiles(single);
            onFilesSelected(single.map((u) => u.file));
        }
    };

    const removeSelectedFile = (index: number) => {
        const item = selectedFiles[index];
        if (item) {
            URL.revokeObjectURL(item.preview);
        }
        const updated = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updated);
        onFilesSelected(updated.map((u) => u.file));
    };

    const handleDeleteExisting = async (id: number) => {
        if (!onDeleteExisting) return;
        setDeletingId(id);
        try {
            await onDeleteExisting(id);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {label && (
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    {label}
                </label>
            )}

            {/* Drop target */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-[var(--radius-lg)] p-6 text-center cursor-pointer transition-all ${
                    isDragging
                        ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/5 scale-[0.99]'
                        : 'border-[var(--border-default)] hover:border-[var(--tenant-primary)]/50 bg-[var(--surface-secondary)]/40 hover:bg-[var(--surface-secondary)]/80'
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple={multiple}
                    className="hidden"
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        e.target.value = '';
                    }}
                />

                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-3 rounded-full bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--tenant-primary)] shadow-[var(--shadow-xs)]">
                        <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                            اضغط لاختيار {multiple ? 'الصور' : 'الصورة'} أو اسحبها هنا
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                            {description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Existing images from server */}
            {existingImages.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                        الصور المرفوعة مسبقاً ({existingImages.length}):
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {existingImages.map((img) => (
                            <div
                                key={img.id}
                                className="relative group rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)] bg-[var(--surface-primary)] aspect-video"
                            >
                                <img
                                    src={img.url}
                                    alt="Car"
                                    className="w-full h-full object-cover"
                                />
                                {onDeleteExisting && (
                                    <button
                                        type="button"
                                        title="حذف الصورة"
                                        disabled={deletingId === img.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteExisting(img.id);
                                        }}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white hover:text-rose-400"
                                    >
                                        {deletingId === img.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Newly selected images preview */}
            {selectedFiles.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-[var(--status-success)] flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        الصور الجديدة المحددة للحفظ ({selectedFiles.length}):
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {selectedFiles.map((item, idx) => (
                            <div
                                key={idx}
                                className="relative group rounded-[var(--radius-md)] overflow-hidden border border-[var(--status-success)]/40 bg-[var(--surface-primary)] aspect-video shadow-[var(--shadow-xs)]"
                            >
                                <img
                                    src={item.preview}
                                    alt={item.file.name}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    title="إزالة"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeSelectedFile(idx);
                                    }}
                                    className="absolute top-1 end-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[9px] text-white truncate">
                                    {item.file.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
