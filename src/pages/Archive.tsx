import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateAnalysis } from '@/lib/calculations';
import { ProductAnalysis, SortField, SortOrder } from '@/types/product';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, BarChart3, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Archive() {
  const { products, settings, deleteProduct } = useAppStore();
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('netProfit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const analyses = useMemo(() => {
    const list = products.map((p) => calculateAnalysis(p, settings));
    list.sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      return sortOrder === 'desc' ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
    return list;
  }, [products, settings, sortField, sortOrder]);

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'netProfit', label: 'الفائدة الصافية' },
    { field: 'confirmationRate', label: 'نسبة التأكيد' },
    { field: 'deliveryToConfirmationRate', label: 'نسبة التوصيل/التأكيد' },
    { field: 'deliveryToReceivedRate', label: 'نسبة التوصيل/المستلمة' },
    { field: 'returnRate', label: 'نسبة الإرجاع' },
  ];

  const handleDelete = (id: string, name: string) => {
    deleteProduct(id);
    toast.success(`تم حذف "${name}"`);
  };

  // Get unique product names for "add analysis" feature
  const uniqueNames = [...new Set(products.map(p => p.name))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">أرشيف المنتجات</h2>
        <Link to="/add">
          <Button size="sm"><PlusCircle className="h-4 w-4 ml-2" /> إضافة منتج</Button>
        </Link>
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">ترتيب حسب:</span>
        {sortOptions.map((opt) => (
          <button
            key={opt.field}
            onClick={() => {
              if (sortField === opt.field) setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
              else { setSortField(opt.field); setSortOrder('desc'); }
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              sortField === opt.field
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label} {sortField === opt.field ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
          </button>
        ))}
      </div>

      {analyses.length === 0 ? (
        <div className="stat-card text-center py-16">
          <p className="text-muted-foreground text-lg">لا توجد منتجات في الأرشيف</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {analyses.map((a) => (
            <ProductArchiveCard
              key={a.id}
              analysis={a}
              onDelete={() => handleDelete(a.id, a.name)}
              onEdit={() => navigate(`/product/${a.id}`)}
              onAnalyze={() => navigate(`/product/${a.id}/analysis`)}
              onAddAnalysis={() => navigate(`/add?product=${encodeURIComponent(a.name)}`)}
            />
          ))}
        </div>
      )}

      {/* Comparison link */}
      {analyses.length >= 2 && (
        <div className="text-center">
          <Link to="/compare">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 ml-2" /> مقارنة المنتجات
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function ProductArchiveCard({
  analysis: a,
  onDelete,
  onEdit,
  onAnalyze,
  onAddAnalysis,
}: {
  analysis: ProductAnalysis;
  onDelete: () => void;
  onEdit: () => void;
  onAnalyze: () => void;
  onAddAnalysis: () => void;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg">{a.name}</h3>
          <span className="text-xs text-muted-foreground">{a.dateFrom} → {a.dateTo}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onAddAnalysis} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-all" title="إضافة تحليل جديد">
            <PlusCircle className="h-4 w-4" />
          </button>
          <button onClick={onAnalyze} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-all" title="عرض التحاليل">
            <BarChart3 className="h-4 w-4" />
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all" title="تعديل">
            <Edit className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-loss transition-all" title="حذف">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <MiniStat label="الفائدة الصافية" value={`${a.netProfit.toFixed(2)} د.ج`} variant={a.netProfit >= 0 ? 'profit' : 'loss'} />
        <MiniStat label="نسبة التأكيد" value={`${a.confirmationRate.toFixed(1)}%`} />
        <MiniStat label="نسبة التوصيل" value={`${a.deliveryToReceivedRate.toFixed(1)}%`} variant={a.deliveryToReceivedRate >= 60 ? 'profit' : 'warning'} />
        <MiniStat label="نسبة الإرجاع" value={`${a.returnRate.toFixed(1)}%`} variant={a.returnRate <= 30 ? 'profit' : 'loss'} />
      </div>
      {a.alerts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {a.alerts.map((alert, i) => (
            <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${alert.type === 'loss' ? 'bg-loss/10 text-loss' : 'bg-warning/10 text-warning'}`}>
              {alert.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'profit' | 'loss' | 'warning' }) {
  const colors = { default: 'text-foreground', profit: 'text-profit', loss: 'text-loss', warning: 'text-warning' };
  return (
    <div>
      <span className="text-xs text-muted-foreground block">{label}</span>
      <span className={`font-bold ${colors[variant]}`}>{value}</span>
    </div>
  );
}
