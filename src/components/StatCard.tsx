import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  variant?: 'default' | 'profit' | 'loss' | 'warning';
  icon?: ReactNode;
  className?: string;
}

function formatValue(value: string | number, suffix?: string): string {
  if (typeof value === 'string') return value;
  
  // Percentages: 1 decimal
  if (suffix === '%') return value.toFixed(1);
  
  // Money or large numbers: use locale formatting
  if (suffix === 'د.ج' || suffix === '$') {
    return Number.isInteger(value) ? value.toLocaleString('ar-DZ') : value.toLocaleString('ar-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  
  // Integers (orders, counts): no decimals
  if (Number.isInteger(value)) return value.toLocaleString('ar-DZ');
  
  // Fallback
  return value.toLocaleString('ar-DZ', { maximumFractionDigits: 2 });
}

export default function StatCard({ label, value, suffix, variant = 'default', icon, className = '' }: StatCardProps) {
  const colorMap = {
    default: 'text-foreground',
    profit: 'text-profit',
    loss: 'text-loss',
    warning: 'text-warning',
  };

  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${colorMap[variant]}`}>
        {formatValue(value, suffix)}
        {suffix && <span className="text-sm font-normal text-muted-foreground mr-1">{suffix}</span>}
      </div>
    </div>
  );
}
