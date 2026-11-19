import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw, Home, Terminal, CheckCircle2 } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
    moduleName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    safeModeTriggered: boolean;
    showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            safeModeTriggered: false,
            showDetails: false,
        };
    }

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('🛡️ [ThemeShield Guard] Caught error in module:', this.props.moduleName || 'Unknown', error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    private handleEnableSafeMode = (): void => {
        try {
            localStorage.setItem('tameed_safe_mode', 'true');
            // Remove any dynamically injected child theme styles
            const childStyle = document.getElementById('tameed-child-theme-shield');
            if (childStyle) {
                childStyle.remove();
            }
            this.setState({ safeModeTriggered: true });
            setTimeout(() => {
                window.location.reload();
            }, 400);
        } catch {
            window.location.reload();
        }
    };

    public render(): ReactNode {
        if (this.state.hasError) {
            const moduleLabel = this.props.moduleName || 'هذه الصفحة';

            return (
                <div className="p-6 md:p-10 max-w-3xl mx-auto my-6">
                    <div className="bg-white rounded-2xl border border-rose-200/80 shadow-lg shadow-rose-500/5 p-6 md:p-8 space-y-6 text-start">
                        {/* Header Banner */}
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-slate-800">
                                        درع الحماية: تم احتواء خطأ في {moduleLabel}
                                    </h3>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        الداشبورد محمي
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    قام نظام الحماية (Theme Shield) بعزل هذا الجزء تلقائياً لمنع تعطل باقي لوحة التحكم أو التأثير على بياناتك. يمكنك إعادة المحاولة أو تشغيل وضع الأمان.
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={this.handleRetry}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--tenant-primary,#092C29)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>إعادة المحاولة الآن</span>
                            </button>

                            <button
                                type="button"
                                onClick={this.handleEnableSafeMode}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-all shadow-sm cursor-pointer"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تشغيل وضع الأمان (Safe Mode)</span>
                            </button>

                            <a
                                href="/admin"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                            >
                                <Home className="w-3.5 h-3.5" />
                                <span>الرئيسية</span>
                            </a>

                            <button
                                type="button"
                                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 text-xs font-medium hover:text-slate-700 ms-auto transition-colors cursor-pointer"
                            >
                                <Terminal className="w-3.5 h-3.5" />
                                <span>{this.state.showDetails ? 'إخفاء التفاصيل' : 'التفاصيل التقنية'}</span>
                            </button>
                        </div>

                        {/* Error Details (Collapsible) */}
                        {this.state.showDetails && (
                            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2 overflow-x-auto text-left dir-ltr">
                                <div className="text-rose-400 font-bold">
                                    {this.state.error?.toString()}
                                </div>
                                {this.state.errorInfo && (
                                    <pre className="text-slate-400 whitespace-pre-wrap leading-relaxed">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
