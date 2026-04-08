import { useMemo, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateAnalysis, periodToProductInput } from '@/lib/calculations';
import StatCard from '@/components/StatCard';
import { TrendingUp, TrendingDown, Truck, CheckCircle, RotateCcw, DollarSign, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';

const getDatePresets = () => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const sub = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return fmt(d); };
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  return [
    { label: '7 أيام', from: sub(7), to: fmt(today) },
    { label: '30 يوم', from: sub(30), to: fmt(today) },
    { label: 'هذا الشهر', from: fmt(startOfMonth), to: fmt(today) },
    { label: 'الشهر الماضي', from: fmt(startOfLastMonth), to: fmt(endOfLastMonth) },
    { label: 'الكل', from: '', to: '' },
  ];
};

export default function Dashboard() {
  const { products, settings, loading } = useAppStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePreset, setActivePreset] = useState('الكل');

  const presets = useMemo(() => getDatePresets(), []);

  const applyPreset = useCallback((preset: { label: string; from: string; to: string }) => {
    setDateFrom(preset.from);
    setDateTo(preset.to);
    setActivePreset(preset.label);
  }, []);

  const analyses = useMemo(() => {
    // Flatten all periods across products
    const allPeriods = products.flatMap(p =>
      p.periods.map(period => ({
        period,
        productName: p.name,
      }))
    );

    let filtered = allPeriods;
    if (dateFrom) filtered = filtered.filter(({ period }) => period.dateFrom >= dateFrom || period.dateTo >= dateFrom);
    if (dateTo) filtered = filtered.filter(({ period }) => period.dateTo <= dateTo || period.dateFrom <= dateTo);

    return filtered.map(({ period, productName }) =>
      calculateAnalysis(periodToProductInput(period, productName), settings)
    );
  }, [products, settings, dateFrom, dateTo]);

  const totals = useMemo(() => {
    if (analyses.length === 0) return null;
    const totalNetProfit = analyses.reduce((s, a) => s + a.netProfit, 0);
    const totalDelivered = analyses.reduce((s, a) => s + a.deliveredOrders, 0);
    const totalConfirmed = analyses.reduce((s, a) => s + a.confirmedOrders, 0);
    const totalReceived = analyses.reduce((s, a) => s + a.receivedOrders, 0);
    const totalReturned = analyses.reduce((s, a) => s + a.returnedOrders, 0);
    const avgNetProfitPerUnit = totalDelivered > 0 ? totalNetProfit / totalDelivered : 0;
    const overallDeliveryRate = totalReceived > 0 ? (totalDelivered / totalReceived) * 100 : 0;
    const overallConfirmationRate = totalReceived > 0 ? (totalConfirmed / totalReceived) * 100 : 0;
    const overallReturnRate = totalConfirmed > 0 ? (totalReturned / totalConfirmed) * 100 : 0;
    return { totalNetProfit, avgNetProfitPerUnit, overallDeliveryRate, overallConfirmationRate, overallReturnRate };
  }, [analyses]);

  const chartData = analyses.map((a) => ({
    name: a.name.substring(0, 15),
    'الفائدة الصافية': a.netProfit,
    'المصاريف': a.totalExpenses,
  }));

  const pieData = totals ? [
    { name: 'توصيل', value: totals.overallDeliveryRate },
    { name: 'إرجاع', value: totals.overallReturnRate },
    { name: 'أخرى', value: Math.max(0, 100 - totals.overallDeliveryRate - totals.overallReturnRate) },
  ] : [];

  const COLORS = ['hsl(160, 84%, 39%)', 'hsl(0, 72%, 51%)', 'hsl(228, 10%, 30%)'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">لوحة القيادة</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">من</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePreset(''); }} className="input-field rounded-md px-2 py-1 text-sm bg-muted border border-border" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">إلى</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePreset(''); }} className="input-field rounded-md px-2 py-1 text-sm bg-muted border border-border" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button
              key={p.label}
              variant={activePreset === p.label ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {!totals ? (
        <div className="stat-card text-center py-16">
          <p className="text-muted-foreground text-lg">لا توجد منتجات بعد. أضف منتجًا للبدء!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="الفائدة الصافية الإجمالية"
              value={totals.totalNetProfit}
              suffix="د.ج"
              variant={totals.totalNetProfit >= 0 ? 'profit' : 'loss'}
              icon={totals.totalNetProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            />
            <StatCard
              label="متوسط فائدة الوحدة الصافية"
              value={totals.avgNetProfitPerUnit}
              suffix="د.ج"
              variant={totals.avgNetProfitPerUnit >= 0 ? 'profit' : 'loss'}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <StatCard
              label="نسبة التوصيل الإجمالية"
              value={totals.overallDeliveryRate}
              suffix="%"
              variant={totals.overallDeliveryRate >= 60 ? 'profit' : 'warning'}
              icon={<Truck className="h-4 w-4" />}
            />
            <StatCard
              label="نسبة التأكيد الإجمالية"
              value={totals.overallConfirmationRate}
              suffix="%"
              variant="default"
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <StatCard
              label="نسبة الإرجاع"
              value={totals.overallReturnRate}
              suffix="%"
              variant={totals.overallReturnRate <= 30 ? 'profit' : 'loss'}
              icon={<RotateCcw className="h-4 w-4" />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="stat-card">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">الفائدة الصافية vs المصاريف</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 10%, 18%)" />
                  <XAxis dataKey="name" stroke="hsl(215, 12%, 55%)" fontSize={11} angle={-30} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(215, 12%, 55%)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(228, 14%, 12%)', border: '1px solid hsl(228, 10%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 92%)' }} />
                  <Bar dataKey="الفائدة الصافية" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="المصاريف" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="stat-card">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">توزيع النسب</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(228, 14%, 12%)', border: '1px solid hsl(228, 10%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 92%)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts */}
          {analyses.some(a => a.alerts.length > 0) && (
            <div className="stat-card space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">⚠️ التنبيهات</h3>
              {analyses.map(a => a.alerts.map((alert, i) => (
                <div key={`${a.id}-${i}`} className={`px-3 py-2 rounded-lg text-sm font-medium ${alert.type === 'loss' ? 'bg-loss/10 text-loss' : 'bg-warning/10 text-warning'}`}>
                  <span className="font-bold">{a.name}:</span> {alert.message}
                </div>
              )))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
