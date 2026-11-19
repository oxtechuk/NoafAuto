import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label, value, icon, trend, trendValue, className = '',
}) => (
    <div className={`bg-[var(--surface-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-5 shadow-[var(--shadow-xs)] flex items-center justify-between ${className}`}>
        <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
            {trendValue && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${
                    trend === 'up' ? 'text-[var(--status-success)]' :
                    trend === 'down' ? 'text-[var(--status-danger)]' :
                    'text-[var(--text-muted)]'
                }`}>
                    {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                    {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                    {trendValue}
                </p>
            )}
        </div>
        {icon && (
            <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] shrink-0">
                {icon}
            </div>
        )}
    </div>
);
