import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateAnalysis, aggregatePeriods } from '@/lib/calculations';
import StatCard from '@/components/StatCard';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function ComparePage() {
  const { products, settings, loading } = useAppStore();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const analyses = useMemo(
    () => selectedIds.map(id => {
      const p = products.find(x => x.id === id);
      if (!p) return null;
      const input = aggregatePeriods(p.periods, p.name);
      return calculateAnalysis(input, settings);
    }).filter(Boolean) as any[],
    [selectedIds, products, settings]
  );

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const barData = analyses.map(a => ({
    name: `${a.name.substring(0, 12)}`,
    'الفائدة الصافية': a.netProfit,
    'المصاريف': a.totalExpenses,
  }));

  const radarData = [
    { metric: 'تأكيد', ...Object.fromEntries(analyses.map(a => [a.name, a.confirmationRate])) },
    { metric: 'توصيل', ...Object.fromEntries(analyses.map(a => [a.name, a.deliveryToReceivedRate])) },
    { metric: 'إرجاع', ...Object.fromEntries(analyses.map(a => [a.name, 100 - a.returnRate])) },
  ];

  const COLORS = ['hsl(160, 84%, 39%)', 'hsl(200, 70%, 50%)', 'hsl(45, 93%, 47%)', 'hsl(280, 65%, 60%)'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/archive')} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-bold">مقارنة المنتجات</h2>
      </div>

      <div className="stat-card">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">اختر المنتجات للمقارنة</h3>
        <div className="flex flex-wrap gap-2">
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedIds.includes(p.id) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.name} ({p.periods.length} فترات)
            </button>
          ))}
        </div>
      </div>

      {analyses.length >= 2 && (
        <>
          <div className="stat-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-2 text-muted-foreground font-medium">المؤشر</th>
                  {analyses.map(a => (
                    <th key={a.id} className="text-right py-2 font-semibold">{a.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { label: 'الفائدة الصافية', key: 'netProfit', suffix: 'د.ج' },
                  { label: 'نسبة التأكيد', key: 'confirmationRate', suffix: '%' },
                  { label: 'نسبة التوصيل', key: 'deliveryToReceivedRate', suffix: '%' },
                  { label: 'نسبة الإرجاع', key: 'returnRate', suffix: '%' },
                  { label: 'فائدة الوحدة الصافية', key: 'netProfitPerUnit', suffix: 'د.ج' },
                  { label: 'إجمالي المصاريف', key: 'totalExpenses', suffix: 'د.ج' },
                  { label: 'كوست طلبات واصلة', key: 'costPerDeliveredOrder', suffix: 'د.ج' },
                ].map(row => (
                  <tr key={row.key}>
                    <td className="py-2 text-muted-foreground">{row.label}</td>
                    {analyses.map(a => (
                      <td key={a.id} className="py-2 font-medium">{(a as any)[row.key].toFixed(2)} {row.suffix}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="stat-card">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">الفائدة vs المصاريف</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 10%, 18%)" />
                  <XAxis dataKey="name" stroke="hsl(215, 12%, 55%)" fontSize={11} />
                  <YAxis stroke="hsl(215, 12%, 55%)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(228, 14%, 12%)', border: '1px solid hsl(228, 10%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 92%)' }} />
                  <Legend />
                  <Bar dataKey="الفائدة الصافية" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="المصاريف" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="stat-card">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">رادار الأداء</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(228, 10%, 18%)" />
                  <PolarAngleAxis dataKey="metric" stroke="hsl(215, 12%, 55%)" fontSize={12} />
                  <PolarRadiusAxis stroke="hsl(215, 12%, 55%)" fontSize={10} />
                  {analyses.map((a, idx) => (
                    <Radar key={a.id} name={a.name} dataKey={a.name} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.15} />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {analyses.length < 2 && selectedIds.length > 0 && (
        <div className="stat-card text-center py-8 text-muted-foreground">اختر منتجين على الأقل للمقارنة</div>
      )}
    </div>
  );
}
