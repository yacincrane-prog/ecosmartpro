import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { calculateAnalysis } from '@/lib/calculations';
import StatCard from '@/components/StatCard';
import { ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProductAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { products, settings } = useAppStore();
  const navigate = useNavigate();
  const product = products.find(p => p.id === id);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  if (!product) {
    return <div className="text-center py-16 text-muted-foreground">المنتج غير موجود</div>;
  }

  // All analyses for same product name
  const sameNameProducts = products.filter(p => p.name === product.name);
  const analyses = sameNameProducts.map(p => calculateAnalysis(p, settings));

  // Comparison products
  const comparisonAnalyses = compareIds.map(cid => {
    const cp = products.find(p => p.id === cid);
    return cp ? calculateAnalysis(cp, settings) : null;
  }).filter(Boolean) as any[];

  const allForChart = [...analyses, ...comparisonAnalyses];
  const chartData = allForChart.map(a => ({
    name: `${a.name} (${a.dateFrom})`,
    'الفائدة الصافية': a.netProfit,
    'نسبة التوصيل': a.deliveryToReceivedRate,
    'نسبة الإرجاع': a.returnRate,
  }));

  const otherProducts = products.filter(p => p.name !== product.name);
  const uniqueOtherNames = [...new Set(otherProducts.map(p => p.name))];

  const toggleCompare = (pid: string) => {
    setCompareIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/archive')} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-bold">تحاليل: {product.name}</h2>
      </div>

      {/* All analyses for this product */}
      {analyses.map((a, idx) => (
        <div key={a.id} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">الفترة: {a.dateFrom} → {a.dateTo}</h3>
            <button onClick={() => navigate(`/product/${a.id}`)} className="text-xs text-primary hover:underline">عرض التفاصيل</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="الفائدة الصافية" value={a.netProfit} suffix="د.ج" variant={a.netProfit >= 0 ? 'profit' : 'loss'} />
            <StatCard label="نسبة التأكيد" value={a.confirmationRate} suffix="%" />
            <StatCard label="نسبة التوصيل" value={a.deliveryToReceivedRate} suffix="%" variant={a.deliveryToReceivedRate >= 60 ? 'profit' : 'warning'} />
            <StatCard label="نسبة الإرجاع" value={a.returnRate} suffix="%" variant={a.returnRate <= 30 ? 'profit' : 'loss'} />
          </div>
        </div>
      ))}

      {/* Comparison selector */}
      {uniqueOtherNames.length > 0 && (
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">مقارنة مع منتجات أخرى</h3>
          <div className="flex flex-wrap gap-2">
            {otherProducts.map(p => (
              <button
                key={p.id}
                onClick={() => toggleCompare(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  compareIds.includes(p.id) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.name} ({p.dateFrom})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {allForChart.length > 0 && (
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">مقارنة بصرية</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 10%, 18%)" />
              <XAxis dataKey="name" stroke="hsl(215, 12%, 55%)" fontSize={11} />
              <YAxis stroke="hsl(215, 12%, 55%)" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(228, 14%, 12%)', border: '1px solid hsl(228, 10%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 92%)' }} />
              <Legend />
              <Bar dataKey="الفائدة الصافية" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="نسبة التوصيل" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="نسبة الإرجاع" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
