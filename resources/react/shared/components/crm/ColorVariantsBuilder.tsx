import React, { useRef } from 'react';
import { Plus, Trash2, Palette, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ColorVariant {
    name: string;
    hex: string;
    image?: string | null;
    imageFile?: File | null;
}

export interface ColorVariantsBuilderProps {
    colors: ColorVariant[];
    onChange: (colors: ColorVariant[]) => void;
    className?: string;
}

export const ColorVariantsBuilder: React.FC<ColorVariantsBuilderProps> = ({
    colors,
    onChange,
    className = '',
}) => {
    const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

    const handleAddColor = () => {
        onChange([
            ...colors,
            { name: '', hex: '#000000', image: null, imageFile: null },
        ]);
    };

    const handleRemoveColor = (index: number) => {
        onChange(colors.filter((_, i) => i !== index));
    };

    const handleUpdateColor = (index: number, updates: Partial<ColorVariant>) => {
        const next = colors.map((item, i) => (i === index ? { ...item, ...updates } : item));
        onChange(next);
    };

    const handleFileChange = (index: number, file: File | null) => {
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        handleUpdateColor(index, {
            imageFile: file,
            image: previewUrl,
        });
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Palette className="h-4 w-4 text-[var(--tenant-primary)]" />
                        الألوان وخيارات الطلاء المتاحة
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        أضف خيارات ألوان الهيكل الخارجي مع كود اللون والصورة المخصصة للون إن وجدت
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddColor}
                >
                    <Plus className="h-3.5 w-3.5 me-1" /> إضافة لون
                </Button>
            </div>

            {colors.length === 0 ? (
                <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] p-6 text-center bg-[var(--surface-secondary)]/30">
                    <Palette className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-[var(--text-secondary)]">لم تتم إضافة أي ألوان بعد.</p>
                    <button
                        type="button"
                        onClick={handleAddColor}
                        className="text-xs text-[var(--tenant-primary)] font-semibold hover:underline mt-1 inline-block"
                    >
                        + اضغط هنا لإضافة أول لون
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {colors.map((color, index) => (
                        <div
                            key={index}
                            className="bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-3.5 shadow-[var(--shadow-xs)] flex flex-col sm:flex-row items-start sm:items-center gap-3"
                        >
                            {/* Color preview circle and hex input */}
                            <div className="flex items-center gap-2 shrink-0">
                                <label className="relative cursor-pointer">
                                    <input
                                        type="color"
                                        value={color.hex || '#000000'}
                                        onChange={(e) => handleUpdateColor(index, { hex: e.target.value })}
                                        className="sr-only"
                                    />
                                    <span
                                        className="block h-9 w-9 rounded-full border border-[var(--border-default)] shadow-xs transition-transform hover:scale-110"
                                        style={{ backgroundColor: color.hex || '#000000' }}
                                        title="اضغط لتغيير اللون"
                                    />
                                </label>
                                <input
                                    type="text"
                                    value={color.hex || '#000000'}
                                    onChange={(e) => handleUpdateColor(index, { hex: e.target.value })}
                                    placeholder="#000000"
                                    className="w-24 px-2 py-1.5 text-xs font-mono rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                                    dir="ltr"
                                />
                            </div>

                            {/* Color Name */}
                            <div className="flex-1 w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={color.name}
                                    onChange={(e) => handleUpdateColor(index, { name: e.target.value })}
                                    placeholder="اسم اللون (مثال: أبيض لؤلؤي / Pearl White)"
                                    className="w-full px-3 py-1.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--tenant-primary)]"
                                />
                            </div>

                            {/* Color Image Upload */}
                            <div className="flex items-center gap-2 shrink-0">
                                <input
                                    ref={(el) => (fileInputRefs.current[index] = el)}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        handleFileChange(index, file);
                                    }}
                                />

                                {color.image ? (
                                    <div className="relative group h-9 w-12 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border-default)]">
                                        <img
                                            src={color.image}
                                            alt={color.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            title="تغيير الصورة"
                                            onClick={() => fileInputRefs.current[index]?.click()}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px]"
                                        >
                                            تغيير
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRefs.current[index]?.click()}
                                        className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--tenant-primary)] hover:text-[var(--tenant-primary)] flex items-center gap-1 transition-colors"
                                    >
                                        <Upload className="h-3 w-3" /> صورة اللون
                                    </button>
                                )}

                                <button
                                    type="button"
                                    title="حذف هذا اللون"
                                    onClick={() => handleRemoveColor(index)}
                                    className="p-2 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
