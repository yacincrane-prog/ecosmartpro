import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateAnalysis, periodToProductInput, aggregatePeriods } from '@/lib/calculations';
import { ProductAnalysis, PeriodInput, SortField, SortOrder } from '@/types/product';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, BarChart3, PlusCircle, Loader2, ChevronDown, ChevronUp, Calendar, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Archive() {
  const { products, settings, deleteProduct, deletePeriod, addPeriod, updatePeriod, loading } = useAppStore();
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('netProfit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  // Track which period is selected per product: 'all' or period id
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, string>>({});
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [addingPeriodFor, setAddingPeriodFor] = useState<string | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const productAnalyses = useMemo(() => {
    return products.map((product) => {
      const selectedPeriodId = selectedPeriods[product.id] || 'all';
      let input;
      if (selectedPeriodId === 'all') {
        input = aggregatePeriods(product.periods, product.name);
      } else {
        const period = product.periods.find(p => p.id === selectedPeriodId);
        input = period ? periodToProductInput(period, product.name) : aggregatePeriods(product.periods, product.name);
      }
      const analysis = calculateAnalysis(input, settings);
      return { product, analysis, selectedPeriodId };
    });
  }, [products, settings, selectedPeriods]);

  const sortedAnalyses = useMemo(() => {
    const list = [...productAnalyses];
    list.sort((a, b) => {
      const va = a.analysis[sortField] as number;
      const vb = b.analysis[sortField] as number;
      return sortOrder === 'desc' ? vb - va : va - vb;
    });
    return list;
  }, [productAnalyses, sortField, sortOrder]);

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'netProfit', label: 'الفائدة الصافية' },
    { field: 'confirmationRate', label: 'نسبة التأكيد' },
    { field: 'deliveryToConfirmationRate', label: 'نسبة التوصيل/التأكيد' },
    { field: 'deliveryToReceivedRate', label: 'نسبة التوصيل/المستلمة' },
    { field: 'returnRate', label: 'نسبة الإرجاع' },
  ];

  const handleDeleteProduct = async () => {
    if (!deleteConfirm) return;
    await deleteProduct(deleteConfirm.id);
    toast.success(`تم حذف "${deleteConfirm.name}"`);
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">أرشيف المنتجات</h2>
        <Link to="/add">
          <Button size="sm"><PlusCircle className="h-4 w-4 ml-2" /> إضافة منتج</Button>
        </Link>
      </div>

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
              sortField === opt.field ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label} {sortField === opt.field ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
          </button>
        ))}
      </div>

      {sortedAnalyses.length === 0 ? (
        <div className="stat-card text-center py-16">
          <p className="text-muted-foreground text-lg">لا توجد منتجات في الأرشيف</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedAnalyses.map(({ product, analysis, selectedPeriodId }) => (
            <div key={product.id} className="stat-card">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedPeriodId === 'all' ? `${product.periods.length} فترات` : `${analysis.dateFrom} → ${analysis.dateTo}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setAddingPeriodFor(addingPeriodFor === product.id ? null : product.id)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-all" title="إضافة فترة جديدة">
                    <PlusCircle className="h-4 w-4" />
                  </button>
                  <button onClick={() => navigate(`/product/${product.id}/analysis`)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-all" title="عرض التحاليل">
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => navigate(`/product/${product.id}`)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all" title="تعديل">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm({ id: product.id, name: product.name })} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-loss transition-all" title="حذف">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Period selector */}
              {product.periods.length > 1 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 max-w-full">
                      <button
                        onClick={() => setSelectedPeriods(prev => ({ ...prev, [product.id]: 'all' }))}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                          selectedPeriodId === 'all' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        الكل ({product.periods.length})
                      </button>
                      {product.periods.map((period, idx) => (
                        <button
                          key={period.id}
                          onClick={() => setSelectedPeriods(prev => ({ ...prev, [product.id]: period.id }))}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                            selectedPeriodId === period.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedPeriodId !== 'all' && (
                    <span className="text-xs text-muted-foreground mt-1 block mr-5">
                      {analysis.dateFrom} → {analysis.dateTo}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <MiniStat label="الفائدة الصافية" value={`${analysis.netProfit.toFixed(2)} د.ج`} variant={analysis.netProfit >= 0 ? 'profit' : 'loss'} />
                <MiniStat label="نسبة التأكيد" value={`${analysis.confirmationRate.toFixed(1)}%`} />
                <MiniStat label="نسبة التوصيل" value={`${analysis.deliveryToReceivedRate.toFixed(1)}%`} variant={analysis.deliveryToReceivedRate >= 60 ? 'profit' : 'warning'} />
                <MiniStat label="نسبة الإرجاع" value={`${analysis.returnRate.toFixed(1)}%`} variant={analysis.returnRate <= 30 ? 'profit' : 'loss'} />
              </div>

              {/* Alerts */}
              {analysis.alerts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.alerts.map((alert, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${alert.type === 'loss' ? 'bg-loss/10 text-loss' : 'bg-warning/10 text-warning'}`}>
                      {alert.message}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded periods list with edit */}
              {selectedPeriodId !== 'all' && product.periods.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  {editingPeriod && product.periods.find(p => p.id === editingPeriod) && (
                    <PeriodEditForm
                      period={product.periods.find(p => p.id === editingPeriod)!}
                      onSave={async (updates) => {
                        await updatePeriod(editingPeriod, updates);
                        setEditingPeriod(null);
                        toast.success('تم تحديث الفترة');
                      }}
                      onCancel={() => setEditingPeriod(null)}
                    />
                  )}
                  {!editingPeriod && selectedPeriodId !== 'all' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingPeriod(selectedPeriodId)} className="text-xs text-primary hover:underline">تعديل هذه الفترة</button>
                      {product.periods.length > 1 && (
                        <button onClick={async () => {
                          await deletePeriod(selectedPeriodId);
                          setSelectedPeriods(prev => ({ ...prev, [product.id]: 'all' }));
                          toast.success('تم حذف الفترة');
                        }} className="text-xs text-loss hover:underline">حذف الفترة</button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Add period form */}
              {addingPeriodFor === product.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <AddPeriodForm
                    lastPeriod={product.periods[0]}
                    onAdd={async (periodData) => {
                      await addPeriod(product.id, periodData);
                      setAddingPeriodFor(null);
                      toast.success('تم إضافة فترة جديدة');
                    }}
                    onCancel={() => setAddingPeriodFor(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {products.length >= 2 && (
        <div className="text-center">
          <Link to="/compare">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 ml-2" /> مقارنة المنتجات
            </Button>
          </Link>
        </div>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المنتج "{deleteConfirm?.name}"؟ سيتم حذف جميع الفترات الزمنية المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddPeriodForm({ lastPeriod, onAdd, onCancel }: {
  lastPeriod?: PeriodInput;
  onAdd: (data: Omit<PeriodInput, 'id' | 'productId' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    purchasePrice: lastPeriod?.purchasePrice?.toString() || '0',
    sellingPrice: lastPeriod?.sellingPrice?.toString() || '0',
    receivedOrders: '',
    confirmedOrders: '',
    deliveredOrders: '',
    adSpendUSD: lastPeriod?.adSpendUSD?.toString() || '0',
    deliveryDiscount: lastPeriod?.deliveryDiscount?.toString() || '0',
    packagingCost: lastPeriod?.packagingCost?.toString() || '0',
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onAdd({
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        receivedOrders: Number(form.receivedOrders) || 0,
        confirmedOrders: Number(form.confirmedOrders) || 0,
        deliveredOrders: Number(form.deliveredOrders) || 0,
        adSpendUSD: Number(form.adSpendUSD) || 0,
        deliveryDiscount: Number(form.deliveryDiscount) || 0,
        packagingCost: Number(form.packagingCost) || 0,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground">إضافة فترة جديدة</h4>
      <PeriodFormFields form={form} setForm={setForm} />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />}
          <Check className="h-3.5 w-3.5 ml-1" /> حفظ
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-3.5 w-3.5 ml-1" /> إلغاء</Button>
      </div>
    </div>
  );
}

function PeriodEditForm({ period, onSave, onCancel }: {
  period: PeriodInput;
  onSave: (updates: Partial<Omit<PeriodInput, 'id' | 'productId' | 'createdAt'>>) => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    purchasePrice: period.purchasePrice.toString(),
    sellingPrice: period.sellingPrice.toString(),
    receivedOrders: period.receivedOrders.toString(),
    confirmedOrders: period.confirmedOrders.toString(),
    deliveredOrders: period.deliveredOrders.toString(),
    adSpendUSD: period.adSpendUSD.toString(),
    deliveryDiscount: period.deliveryDiscount.toString(),
    packagingCost: period.packagingCost.toString(),
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave({
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        receivedOrders: Number(form.receivedOrders) || 0,
        confirmedOrders: Number(form.confirmedOrders) || 0,
        deliveredOrders: Number(form.deliveredOrders) || 0,
        adSpendUSD: Number(form.adSpendUSD) || 0,
        deliveryDiscount: Number(form.deliveryDiscount) || 0,
        packagingCost: Number(form.packagingCost) || 0,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground">تعديل الفترة</h4>
      <PeriodFormFields form={form} setForm={setForm} />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />}
          <Check className="h-3.5 w-3.5 ml-1" /> حفظ
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-3.5 w-3.5 ml-1" /> إلغاء</Button>
      </div>
    </div>
  );
}

function PeriodFormFields({ form, setForm }: { form: any; setForm: (fn: any) => void }) {
  const handleChange = (field: string, value: string) => setForm((prev: any) => ({ ...prev, [field]: value }));

  const fields = [
    { key: 'purchasePrice', label: 'سعر الشراء' },
    { key: 'sellingPrice', label: 'سعر البيع' },
    { key: 'receivedOrders', label: 'طلبات مستلمة' },
    { key: 'confirmedOrders', label: 'طلبات مؤكدة' },
    { key: 'deliveredOrders', label: 'طلبات واصلة' },
    { key: 'adSpendUSD', label: 'مصاريف إعلان ($)' },
    { key: 'deliveryDiscount', label: 'تخفيض توصيل' },
    { key: 'packagingCost', label: 'تكلفة تغليف' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {fields.map((f) => (
        <div key={f.key}>
          <Label className="text-xs text-muted-foreground mb-1 block">{f.label}</Label>
          <Input type="number" step="any" value={form[f.key]} onChange={e => handleChange(f.key, e.target.value)} className="input-field h-8 text-xs" />
        </div>
      ))}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
        <Input type="date" value={form.dateFrom} onChange={e => handleChange('dateFrom', e.target.value)} className="input-field h-8 text-xs" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
        <Input type="date" value={form.dateTo} onChange={e => handleChange('dateTo', e.target.value)} className="input-field h-8 text-xs" />
      </div>
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
