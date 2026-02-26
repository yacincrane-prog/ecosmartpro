import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { calculateAnalysis, periodToProductInput, aggregatePeriods } from '@/lib/calculations';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import StatCard from '@/components/StatCard';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Calendar } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { products, settings, updateProduct, updatePeriod, loading: storeLoading } = useAppStore();
  const navigate = useNavigate();
  const product = products.find((p) => p.id === id);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all');
  const [editing, setEditing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameForm, setNameForm] = useState(product?.name || '');
  const [saving, setSaving] = useState(false);

  const currentPeriod = product?.periods.find(p => p.id === selectedPeriodId);

  const [form, setForm] = useState<any>(currentPeriod || {});

  // Update form when period changes
  useMemo(() => {
    if (currentPeriod) {
      setForm(currentPeriod);
    }
  }, [selectedPeriodId]);

  const analysis = useMemo(() => {
    if (!product) return null;
    if (selectedPeriodId === 'all') {
      const input = aggregatePeriods(product.periods, product.name);
      return calculateAnalysis(editing ? { ...input, ...formToInput(form, product.name) } : input, settings);
    }
    const period = product.periods.find(p => p.id === selectedPeriodId);
    if (!period) return null;
    const input = periodToProductInput(editing ? { ...period, ...formToPeriodUpdates(form) } : period, product.name);
    return calculateAnalysis(input, settings);
  }, [product, settings, form, editing, selectedPeriodId]);

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product || !analysis) {
    return <div className="text-center py-16 text-muted-foreground">المنتج غير موجود</div>;
  }

  const handleSave = async () => {
    if (selectedPeriodId === 'all') return;
    setSaving(true);
    try {
      await updatePeriod(selectedPeriodId, {
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        receivedOrders: Number(form.receivedOrders),
        confirmedOrders: Number(form.confirmedOrders),
        deliveredOrders: Number(form.deliveredOrders),
        adSpendUSD: Number(form.adSpendUSD),
        deliveryDiscount: Number(form.deliveryDiscount),
        packagingCost: Number(form.packagingCost),
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
      });
      setEditing(false);
      toast.success('تم تحديث الفترة');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    await updateProduct(id!, { name: nameForm });
    setEditingName(false);
    toast.success('تم تحديث اسم المنتج');
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const inputFields = [
    { key: 'purchasePrice', label: 'سعر الشراء' },
    { key: 'sellingPrice', label: 'سعر البيع' },
    { key: 'receivedOrders', label: 'طلبات مستلمة' },
    { key: 'confirmedOrders', label: 'طلبات مؤكدة' },
    { key: 'deliveredOrders', label: 'طلبات واصلة' },
    { key: 'adSpendUSD', label: 'مصاريف إعلان ($)' },
    { key: 'deliveryDiscount', label: 'تخفيض توصيل' },
    { key: 'packagingCost', label: 'تكلفة تغليف' },
  ];

  const calculatedFields = [
    { label: 'فائدة الوحدة', value: analysis.unitProfit, suffix: 'د.ج' },
    { label: 'الفائدة بدون مصاريف', value: analysis.grossProfitNoExpenses, suffix: 'د.ج' },
    { label: 'مصاريف الإعلان (د.ج)', value: analysis.adSpendDZD, suffix: 'د.ج' },
    { label: 'الطلبات المسترجعة', value: analysis.returnedOrders, suffix: '' },
    { label: 'مصاريف المسترجعات', value: analysis.returnExpenses, suffix: 'د.ج' },
    { label: 'مصاريف التشغيل', value: analysis.operationExpenses, suffix: 'د.ج' },
    { label: 'مصاريف التأكيد والتوصيل', value: analysis.confirmationAndDeliveryExpenses, suffix: 'د.ج' },
    { label: 'إجمالي المصاريف', value: analysis.totalExpenses, suffix: 'د.ج' },
    { label: 'الفائدة الصافية', value: analysis.netProfit, suffix: 'د.ج', variant: analysis.netProfit >= 0 ? 'profit' : 'loss' as const },
    { label: 'فائدة الوحدة الصافية', value: analysis.netProfitPerUnit, suffix: 'د.ج', variant: analysis.netProfitPerUnit >= 0 ? 'profit' : 'loss' as const },
  ];

  const ratios = [
    { label: 'نسبة التأكيد', value: analysis.confirmationRate, suffix: '%' },
    { label: 'نسبة التوصيل/التأكيد', value: analysis.deliveryToConfirmationRate, suffix: '%' },
    { label: 'نسبة التوصيل/المستلمة', value: analysis.deliveryToReceivedRate, suffix: '%', variant: analysis.deliveryToReceivedRate >= 60 ? 'profit' : 'warning' as const },
    { label: 'كوست طلبات مستلمة', value: analysis.costPerReceivedOrder, suffix: 'د.ج' },
    { label: 'كوست طلبات مؤكدة', value: analysis.costPerConfirmedOrder, suffix: 'د.ج' },
    { label: 'كوست طلبات واصلة', value: analysis.costPerDeliveredOrder, suffix: 'د.ج' },
    { label: 'نسبة الإرجاع', value: analysis.returnRate, suffix: '%', variant: analysis.returnRate <= 30 ? 'profit' : 'loss' as const },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/archive')} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        {editingName ? (
          <div className="flex items-center gap-2">
            <Input value={nameForm} onChange={e => setNameForm(e.target.value)} className="input-field h-9" />
            <Button size="sm" onClick={handleSaveName}>حفظ</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>إلغاء</Button>
          </div>
        ) : (
          <h2 className="text-2xl font-bold cursor-pointer" onClick={() => setEditingName(true)}>{product.name}</h2>
        )}
        {selectedPeriodId !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => { setEditing(!editing); if (!editing && currentPeriod) setForm(currentPeriod); }}>
            {editing ? 'إلغاء' : 'تعديل'}
          </Button>
        )}
      </div>

      {/* Period selector */}
      {product.periods.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => { setSelectedPeriodId('all'); setEditing(false); }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedPeriodId === 'all' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            الكل
          </button>
          {product.periods.map((period) => (
            <button
              key={period.id}
              onClick={() => { setSelectedPeriodId(period.id); setEditing(false); setForm(period); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedPeriodId === period.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {period.dateFrom} → {period.dateTo}
            </button>
          ))}
        </div>
      )}

      {editing && selectedPeriodId !== 'all' && (
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">بيانات الفترة</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {inputFields.map((f) => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground mb-1 block">{f.label}</Label>
                <Input type="number" value={(form as any)[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} className="input-field" step="any" />
              </div>
            ))}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
              <Input type="date" value={form.dateFrom} onChange={e => handleChange('dateFrom', e.target.value)} className="input-field" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
              <Input type="date" value={form.dateTo} onChange={e => handleChange('dateTo', e.target.value)} className="input-field" />
            </div>
          </div>
          <Button onClick={handleSave} className="mt-4 w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            حفظ التعديلات
          </Button>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">الحسابات</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {calculatedFields.map((f) => (
            <StatCard key={f.label} label={f.label} value={f.value} suffix={f.suffix} variant={(f as any).variant || 'default'} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">النسب</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ratios.map((f) => (
            <StatCard key={f.label} label={f.label} value={f.value} suffix={f.suffix} variant={(f as any).variant || 'default'} />
          ))}
        </div>
      </div>

      {analysis.alerts.length > 0 && (
        <div className="stat-card space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">التنبيهات</h3>
          {analysis.alerts.map((alert, i) => (
            <div key={i} className={`px-3 py-2 rounded-lg text-sm font-medium ${alert.type === 'loss' ? 'bg-loss/10 text-loss' : 'bg-warning/10 text-warning'}`}>
              {alert.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formToPeriodUpdates(form: any) {
  return {
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
  };
}

function formToInput(form: any, name: string) {
  return { name, ...formToPeriodUpdates(form) };
}
