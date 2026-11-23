import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../../shared/components/ui/Button';
import { Input } from '../../shared/components/ui/Input';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login({ username, password });
            navigate('/admin');
        } catch (err: any) {
            setError(err.response?.data?.message || 'بيانات الدخول غير صحيحة، يرجى المحاولة مجدداً');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--tenant-sidebar-bg)] flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-md bg-[var(--surface-primary)] rounded-[var(--radius-xl)] shadow-xl overflow-hidden border border-[var(--border-default)]">
                <div className="p-8 text-center bg-[var(--tenant-primary)] text-white">
                    <img
                        src="/images/logo.png"
                        alt="تعميد"
                        className="h-20 max-h-20 w-auto mx-auto mb-4 object-contain"
                    />
                    <h1 className="text-xl font-bold tracking-tight">نظام إدارة تعميد CRM</h1>
                    <p className="text-xs text-white/70 mt-1">سجل الدخول للمتابعة وإدارة العمليات اليومية</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {error && (
                        <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--status-danger-bg)] border border-[var(--status-danger)]/20 text-xs text-[var(--status-danger)] font-medium">
                            {error}
                        </div>
                    )}

                    <Input
                        label="اسم المستخدم أو البريد الإلكتروني"
                        type="text"
                        placeholder="ادخل اسم المستخدم"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

                    <Input
                        label="كلمة المرور"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
                        <LogIn className="h-4 w-4 me-2" />
                        تسجيل الدخول
                    </Button>
                </form>
            </div>
        </div>
    );
};
