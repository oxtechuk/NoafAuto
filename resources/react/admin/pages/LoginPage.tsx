import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-800">
                <div className="p-8 text-center bg-gradient-to-br from-indigo-700 to-indigo-900 text-white">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md mb-4 font-black text-2xl">
                        S
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">لوحة تحكم Sitekit CRM</h1>
                    <p className="text-xs text-indigo-200 mt-1">سجل الدخول للمتابعة وإدارة العمليات اليومية</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {error && (
                        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
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
