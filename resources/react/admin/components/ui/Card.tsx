import React from 'react';

export const Card: React.FC<{
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}> = ({ children, className = '', title, action }) => (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden ${className}`}>
        {title && (
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
                {action && <div>{action}</div>}
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);
