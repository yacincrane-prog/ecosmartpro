import { useEffect, useMemo, useState } from 'react';
import { useSyncStore } from '@/store/useSyncStore';
import { useAppStore } from '@/store/useAppStore';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Link2Off, RefreshCcw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import StatCard from '@/components/StatCard';

export default function SyncedDataPage() {
  const { products, dailyStats, loading, fetchAllSyncedData } = useSyncStore();
  const { settings } = useAppStore();
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  // Manual inputs per product (ad spend, packaging)
  const [manualInputs, setManualInputs] = useState<Record<string, { adSpend: number; packagingCost: number }>>({});

  useEffect(() => {
    fetchAllSyncedData();
  }, []);

  const lastSync = useMemo(() => {
    if (products.length === 0) return null;
    return products.reduce((latest, p) => p.synced_at > latest ? p.synced_at : latest, products[0].synced_at);
  }, [products]);

  // Filter products
  const displayProducts = useMemo(() => {
    if (selectedProduct === 'all') return products;
    return products.filter(p => p.name === selectedProduct);
  }, [products, selectedProduct]);

  // Calculate stats per product (from daily_stats if date range, otherwise from totals)
  const productStats = useMemo(() => {
    return displayProducts.map(product => {
      let created: number, confirmed: number, delivered: number, returned: number;

      if (dateFrom && dateTo) {
        // Sum daily stats within date range
        const filtered = dailyStats.filter(s =>
          s.product_name === product.name &&
          s.stat_date >= dateFrom &&
          s.stat_date <= dateTo
        );
        created = filtered.reduce((s, d) => s + d.created, 0);
        confirmed = filtered.reduce((s, d) => s + d.confirmed, 0);
        delivered = filtered.reduce((s, d) => s + d.delivered, 0);
        returned = filtered.reduce((s, d) => s + d.returned, 0);
      } else {
        created = product.total_created;
        confirmed = product.total_confirmed;
        delivered = product.total_delivered;
        returned = product.total_returned;
      }

      const confirmationRate = created > 0 ? (confirmed / created) * 100 : 0;
      const deliveryRate = (delivered + returned) > 0 ? (delivered / (delivered + returned)) * 100 : 0;

      const manual = manualInputs[product.name] || { adSpend: 0, packagingCost: 0 };
      const adSpendDZD = manual.adSpend * settings.currencyRate;

      const revenue = delivered * product.sale_price;
      const purchaseCost = delivered * product.purchase_price;
      // delivery_discount from EcoSmart is total for all orders, use directly
      const deliveryCost = product.delivery_discount;
      const returnCost = returned * settings.returnCost;
      const confirmationCost = confirmed * settings.confirmationCost;
      const operationCost = confirmed * settings.operationCostPerOrder;
      const packagingTotal = delivered * manual.packagingCost;
      const totalCost = purchaseCost + deliveryCost + returnCost + adSpendDZD + confirmationCost + operationCost + packagingTotal;
      const profit = revenue - totalCost;

      return {
        ...product,
        created,
        confirmed,
        delivered,
        returned,
        confirmationRate,
        deliveryRate,
        revenue,
        profit,
        totalCost,
        adSpendDZD,
        manual,
      };
    });
  }, [displayProducts, dailyStats, dateFrom, dateTo, manualInputs, settings]);

  // Totals
  const totals = useMemo(() => {
    return productStats.reduce(
      (acc, p) => ({
        created: acc.created + p.created,
        confirmed: acc.confirmed + p.confirmed,
        delivered: acc.delivered + p.delivered,
        returned: acc.returned + p.returned,
        revenue: acc.revenue + p.revenue,
        profit: acc.profit + p.profit,
      }),
      { created: 0, confirmed: 0, delivered: 0, returned: 0, revenue: 0, profit: 0 }
    );
  }, [productStats]);

  const totalConfirmationRate = totals.created > 0 ? (totals.confirmed / totals.created) * 100 : 0;
  const totalDeliveryRate = (totals.delivered + totals.returned) > 0 ? (totals.delivered / (totals.delivered + totals.returned)) * 100 : 0;

  const updateManualInput = (productName: string, field: 'adSpend' | 'packagingCost', value: number) => {
    setManualInputs(prev => ({
      ...prev,
      [productName]: { ...(prev[productName] || { adSpend: 0, packagingCost: 0 }), [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <Link2Off className="h-16 w-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">لم يتم ربط EcoSmart بعد</h2>
        <p className="text-muted-foreground text-sm">
          اذهب إلى <strong>الإعدادات</strong> وأنشئ رمز API، ثم أضفه في إعدادات EcoSmart لبدء المزامنة.
        </p>
        <Button variant="outline" onClick={() => navigate('/settings')}>
          الذهاب للإعدادات
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <span className="text-sm text-emerald-400">
          آخر مزامنة: {lastSync ? new Date(lastSync).toLocaleString('ar-DZ') : '—'}
        </span>
        <Button variant="ghost" size="icon" className="mr-auto" onClick={() => fetchAllSyncedData()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">فترة زمنية (اختياري)</h3>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">من</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">إلى</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">المنتج</Label>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="all">جميع المنتجات</option>
              {products.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              <RefreshCcw className="h-3.5 w-3.5 ml-1" /> إعادة تعيين
            </Button>
          )}
        </div>
        {dateFrom && dateTo && (
          <p className="text-xs text-muted-foreground mt-2">
            الأرقام محسوبة من الإحصائيات اليومية ضمن الفترة المحددة
          </p>
        )}
      </div>

      {/* KPI Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="الطلبات المنشأة" value={totals.created} />
        <StatCard label="المؤكدة" value={totals.confirmed} />
        <StatCard label="المسلمة" value={totals.delivered} variant="profit" />
        <StatCard label="المرتجعة" value={totals.returned} variant="loss" />
        <StatCard label="نسبة التأكيد" value={totalConfirmationRate} suffix="%" variant={totalConfirmationRate >= 50 ? 'profit' : 'warning'} />
        <StatCard label="نسبة التوصيل" value={totalDeliveryRate} suffix="%" variant={totalDeliveryRate >= 60 ? 'profit' : 'loss'} />
        <StatCard label="الإيرادات" value={totals.revenue} suffix="د.ج" />
        <StatCard label="الربح الصافي" value={totals.profit} suffix="د.ج" variant={totals.profit >= 0 ? 'profit' : 'loss'} />
      </div>

      {/* Alerts */}
      {totals.profit < 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4" /> الربح الصافي سالب!
        </div>
      )}

      {/* Product Cards */}
      <h3 className="text-lg font-bold">تفاصيل المنتجات</h3>
      {productStats.map(p => (
        <div key={p.id} className="stat-card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">{p.name}</h4>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> مزامنة تلقائية
            </div>
          </div>

          {/* Synced fields (read-only) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ReadOnlyField label="سعر البيع" value={`${p.sale_price.toLocaleString()} د.ج`} />
            <ReadOnlyField label="سعر الشراء" value={`${p.purchase_price.toLocaleString()} د.ج`} />
            <ReadOnlyField label="تخفيض التوصيل" value={`${p.delivery_discount.toLocaleString()} د.ج`} />
            <ReadOnlyField label="الطلبات المنشأة" value={p.created} />
            <ReadOnlyField label="المؤكدة" value={p.confirmed} />
            <ReadOnlyField label="المسلمة" value={p.delivered} />
            <ReadOnlyField label="المرتجعة" value={p.returned} />
            <ReadOnlyField label="نسبة التأكيد" value={`${p.confirmationRate.toFixed(1)}%`} />
          </div>

          {/* Manual inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">مصاريف الإعلانات ($)</Label>
              <Input
                type="number"
                value={p.manual.adSpend || ''}
                onChange={e => updateManualInput(p.name, 'adSpend', Number(e.target.value) || 0)}
                placeholder="0"
                className="input-field"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">تكلفة التغليف / طلب (د.ج)</Label>
              <Input
                type="number"
                value={p.manual.packagingCost || ''}
                onChange={e => updateManualInput(p.name, 'packagingCost', Number(e.target.value) || 0)}
                placeholder="0"
                className="input-field"
              />
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="الإيرادات" value={p.revenue} suffix="د.ج" />
            <StatCard label="نسبة التوصيل" value={p.deliveryRate} suffix="%" variant={p.deliveryRate >= 60 ? 'profit' : 'loss'} />
            <StatCard label="الربح الصافي" value={p.profit} suffix="د.ج" variant={p.profit >= 0 ? 'profit' : 'loss'} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <RefreshCw className="h-2.5 w-2.5" /> {label}
      </p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}
