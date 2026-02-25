import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  variant?: 'default' | 'profit' | 'loss' | 'warning';
  icon?: ReactNode;
}

export default function StatCard({ label, value, suffix, variant = 'default', icon }: StatCardProps) {
  const colorMap = {
    default: 'text-foreground',
    profit: 'text-profit',
    loss: 'text-loss',
    warning: 'text-warning',
  };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${colorMap[variant]}`}>
        {typeof value === 'number' ? value.toFixed(2) : value}
        {suffix && <span className="text-sm font-normal text-muted-foreground mr-1">{suffix}</span>}
      </div>
    </div>
  );
}
