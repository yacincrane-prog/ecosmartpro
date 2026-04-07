import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { calculateAnalysis } from '@/lib/calculations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AddProduct() {
  const { addProduct, addPeriod, products, settings } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetProductId = searchParams.get('productId') || '';
  const presetName = searchParams.get('product') || '';
  const existingProduct = presetProductId ? products.find(p => p.id === presetProductId) : null;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: existingProduct?.name || presetName,
    purchasePrice: '',
    sellingPrice: '',
    receivedOrders: '',
    confirmedOrders: '',
    deliveredOrders: '',
    adSpendUSD: '',
    deliveryDiscount: '',
    packagingCost: '',
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const purchase = Number(form.purchasePrice);
    const selling = Number(form.sellingPrice);
    const received = Number(form.receivedOrders);
    const confirmed = Number(form.confirmedOrders);
    const delivered = Number(form.deliveredOrders);

    if (!existingProduct && !form.name.trim()) {
      newErrors.name = 'يرجى إدخال اسم المنتج';
    }
    if (selling <= 0) {
      newErrors.sellingPrice = 'سعر البيع يجب أن يكون أكبر من 0';
    }
    if (purchase <= 0) {
      newErrors.purchasePrice = 'سعر الشراء يجب أن يكون أكبر من 0';
    }
    if (purchase >= selling && selling > 0 && purchase > 0) {
      newErrors.purchasePrice = 'سعر الشراء يجب أن يكون أقل من سعر البيع';
    }
    if (confirmed > received && received > 0) {
      newErrors.confirmedOrders = 'المؤكدة لا يمكن أن تتجاوز المستلمة';
    }
    if (delivered > confirmed && confirmed > 0) {
      newErrors.deliveredOrders = 'الواصلة لا يمكن أن تتجاوز المؤكدة';
    }
    if (form.dateTo < form.dateFrom) {
      newErrors.dateTo = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Live preview calculation
  const preview = useMemo(() => {
    const input = {
      id: '', name: '',
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      receivedOrders: Number(form.receivedOrders) || 0,
      confirmedOrders: Number(form.confirmedOrders) || 0,
      deliveredOrders: Number(form.deliveredOrders) || 0,
      adSpendUSD: Number(form.adSpendUSD) || 0,
      deliveryDiscount: Number(form.deliveryDiscount) || 0,
      packagingCost: Number(form.packagingCost) || 0,
      dateFrom: form.dateFrom, dateTo: form.dateTo, createdAt: '',
    };
    if (input.sellingPrice <= 0 && input.deliveredOrders <= 0) return null;
    return calculateAnalysis(input, settings);
  }, [form, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const periodData = {
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

      if (existingProduct) {
        await addPeriod(existingProduct.id, periodData);
        toast.success('تم إضافة الفترة بنجاح');
      } else {
        await addProduct(form.name.trim(), periodData);
        toast.success('تم إضافة المنتج بنجاح');
      }
      navigate('/archive');
    } catch {
      toast.error('حدث خطأ أثناء الإضافة');
    } finally {
      setLoading(false);
    }
  };

  const priceFields = [
    { key: 'purchasePrice', label: 'سعر الشراء (د.ج)' },
    { key: 'sellingPrice', label: 'سعر البيع (د.ج)' },
  ];

  const orderFields = [
    { key: 'receivedOrders', label: 'الطلبات المستلمة' },
    { key: 'confirmedOrders', label: 'الطلبات المؤكدة' },
    { key: 'deliveredOrders', label: 'الطلبات الواصلة' },
  ];

  const expenseFields = [
    { key: 'adSpendUSD', label: 'مصاريف الإعلان ($)' },
    { key: 'deliveryDiscount', label: 'تخفيض التوصيل / طلب (د.ج)', tooltip: 'المبلغ المخصوم من كل طلب كتخفيض على التوصيل' },
    { key: 'packagingCost', label: 'تكلفة التغليف / طلب (د.ج)' },
  ];

  const renderField = (f: { key: string; label: string; tooltip?: string }) => (
    <div key={f.key}>
      <div className="flex items-center gap-1 mb-1.5">
        <Label className="text-xs text-muted-foreground">{f.label}</Label>
        {f.tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs">
                {f.tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input
        type="number"
        min="0"
        step="any"
        value={(form as any)[f.key]}
        onChange={(e) => handleChange(f.key, e.target.value)}
        className={`input-field ${errors[f.key] ? 'border-destructive' : ''}`}
        placeholder="0"
      />
      {errors[f.key] && (
        <p className="text-xs text-destructive mt-1">{errors[f.key]}</p>
      )}
    </div>
  );

  const formatNum = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        {existingProduct ? `إضافة فترة لـ "${existingProduct.name}"` : 'إضافة منتج جديد'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        {!existingProduct && (
          <div className="stat-card p-4">
            <Label className="text-xs text-muted-foreground mb-1.5 block">اسم المنتج</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`input-field ${errors.name ? 'border-destructive' : ''}`}
              placeholder="اسم المنتج"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
        )}

        {/* Prices Group */}
        <div className="stat-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">💰 الأسعار</h3>
          <div className="grid grid-cols-2 gap-4">
            {priceFields.map(renderField)}
          </div>
        </div>

        {/* Orders Group */}
        <div className="stat-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">📦 الطلبات</h3>
          <div className="grid grid-cols-3 gap-4">
            {orderFields.map(renderField)}
          </div>
        </div>

        {/* Expenses Group */}
        <div className="stat-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">💸 المصاريف</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {expenseFields.map(renderField)}
          </div>
        </div>

        {/* Dates */}
        <div className="stat-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">📅 الفترة الزمنية</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">من تاريخ</Label>
              <Input type="date" value={form.dateFrom} onChange={e => handleChange('dateFrom', e.target.value)} className="input-field" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">إلى تاريخ</Label>
              <Input
                type="date"
                value={form.dateTo}
                onChange={e => handleChange('dateTo', e.target.value)}
                className={`input-field ${errors.dateTo ? 'border-destructive' : ''}`}
              />
              {errors.dateTo && <p className="text-xs text-destructive mt-1">{errors.dateTo}</p>}
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {preview && (
          <div className="stat-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">📊 معاينة سريعة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`rounded-lg p-3 text-center ${preview.netProfit >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                <div className="text-xs text-muted-foreground mb-1">الربح الصافي</div>
                <div className={`text-sm font-bold flex items-center justify-center gap-1 ${preview.netProfit >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {preview.netProfit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatNum(preview.netProfit)} د.ج
                </div>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">نسبة التأكيد</div>
                <div className="text-sm font-bold text-foreground">{preview.confirmationRate.toFixed(1)}%</div>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">نسبة التوصيل</div>
                <div className={`text-sm font-bold ${preview.deliveryToReceivedRate < 60 ? 'text-yellow-500' : 'text-foreground'}`}>
                  {preview.deliveryToReceivedRate.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">ربح / وحدة</div>
                <div className={`text-sm font-bold ${preview.netProfitPerUnit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {formatNum(preview.netProfitPerUnit)} د.ج
                </div>
              </div>
            </div>
            {preview.alerts.length > 0 && (
              <div className="space-y-1">
                {preview.alerts.map((alert, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded ${alert.type === 'loss' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-600'}`}>
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {alert.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button type="submit" className="w-full font-semibold" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          {existingProduct ? 'إضافة الفترة' : 'إضافة المنتج'}
        </Button>
      </form>
    </div>
  );
}
