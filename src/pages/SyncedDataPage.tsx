import { useEffect, useMemo, useState } from 'react';
import { useSyncStore, SyncedProduct } from '@/store/useSyncStore';
import { useAppStore } from '@/store/useAppStore';
import { 
  Loader2, RefreshCw, CheckCircle2, AlertTriangle, Link2Off, 
  Calendar, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertCircle,
  DollarSign, Package, Truck, RotateCcw, Phone, Settings2, Pencil, RotateCw, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import StatCard from '@/components/StatCard';

type Decision = 'scale' | 'risk' | 'kill';

function getDecision(profit: number, deliveryRate: number): Decision {
  if (profit < 0 || deliveryRate < 40) return 'kill';
  if (profit > 0 && deliveryRate >= 60) return 'scale';
  return 'risk';
}

const decisionConfig = {
  scale: { label: '🔥 Scale', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', border: 'border-r-emerald-500', bg: '' },
  risk: { label: '⚠️ Risk', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', border: 'border-r-yellow-500', bg: '' },
  kill: { label: '❌ Kill', color: 'bg-red-500/20 text-red-400 border-red-500/30', border: 'border-r-red-500', bg: 'bg-red-500/5' },
};

interface ProductStat {
  product: SyncedProduct;
  created: number;
  confirmed: number;
  delivered: number;
  returned: number;
  confirmationRate: number;
  deliveryRate: number;
  revenue: number;
  profit: number;
  totalCost: number;
  adSpendDZD: number;
  purchaseCost: number;
  deliveryCost: number;
  returnCost: number;
  confirmationCost: number;
  operationCost: number;
  packagingTotal: number;
  decision: Decision;
}

export default function SyncedDataPage() {
  const { products, dailyStats, manualInputs, loading, fetchAllSyncedData, saveManualInput } = useSyncStore();
  const { settings } = useAppStore();
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllSyncedData();
  }, []);

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const lastSync = useMemo(() => {
    if (products.length === 0) return null;
    return products.reduce((latest, p) => p.synced_at > latest ? p.synced_at : latest, products[0].synced_at);
  }, [products]);

  const displayProducts = useMemo(() => {
    if (selectedProduct === 'all') return products;
    return products.filter(p => p.name === selectedProduct);
  }, [products, selectedProduct]);

  // Date presets
  const setPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  const productStats: ProductStat[] = useMemo(() => {
    return displayProducts.map(product => {
      let created: number, confirmed: number, delivered: number, returned: number;

      if (dateFrom && dateTo) {
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

      const manual = manualInputs[product.name] || { adSpend: 0, packagingCost: 0, salePriceOverride: null, purchasePriceOverride: null, deliveryDiscountOverride: null };
      const adSpendDZD = manual.adSpend * settings.currencyRate;

      // Use overrides if available
      const salePrice = manual.salePriceOverride ?? product.sale_price;
      const purchasePrice = manual.purchasePriceOverride ?? product.purchase_price;
      const discountTotal = manual.deliveryDiscountOverride != null 
        ? manual.deliveryDiscountOverride * product.total_delivered 
        : product.delivery_discount;

      const revenue = delivered * salePrice;
      const purchaseCost = delivered * purchasePrice;
      const perUnitDiscount = product.total_delivered > 0
        ? discountTotal / product.total_delivered
        : 0;
      const deliveryCost = delivered * perUnitDiscount;
      const returnCost = returned * settings.returnCost;
      const confirmationCost = confirmed * settings.confirmationCost;
      const operationCost = delivered * settings.operationCostPerOrder;
      const packagingTotal = delivered * manual.packagingCost;
      const totalCost = purchaseCost + deliveryCost + returnCost + adSpendDZD + confirmationCost + operationCost + packagingTotal;
      const profit = revenue - totalCost;

      const decision = getDecision(profit, deliveryRate);

      return {
        product,
        created, confirmed, delivered, returned,
        confirmationRate, deliveryRate,
        revenue, profit, totalCost,
        adSpendDZD, purchaseCost, deliveryCost, returnCost,
        confirmationCost, operationCost, packagingTotal,
        decision,
      };
    });
  }, [displayProducts, dailyStats, dateFrom, dateTo, manualInputs, settings]);

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

  // Smart summary
  const summary = useMemo(() => {
    const winning = productStats.filter(p => p.decision === 'scale').length;
    const risky = productStats.filter(p => p.decision === 'risk').length;
    const losing = productStats.filter(p => p.decision === 'kill').length;
    const worstProduct = productStats.reduce((worst, p) => (!worst || p.profit < worst.profit) ? p : worst, null as ProductStat | null);
    
    let text = `لديك ${winning} منتج رابح`;
    if (risky > 0) text += ` و ${risky} بحاجة مراجعة`;
    if (losing > 0) text += ` و ${losing} خاسر`;
    if (worstProduct && worstProduct.profit < 0) {
      text += `. أكبر خسارة: ${worstProduct.product.name}`;
    }
    return text;
  }, [productStats]);

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
    <div className="space-y-5">
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

      {/* Smart Summary */}
      {productStats.length > 1 && (
        <div className="p-3 rounded-lg bg-accent/50 border border-border text-sm text-foreground">
          <span className="font-semibold">📊 ملخص:</span> {summary}
        </div>
      )}

      {/* Date Range + Presets */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">فترة زمنية</h3>
        </div>
        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { label: 'آخر 7 أيام', days: 7 },
            { label: 'آخر 30 يوم', days: 30 },
            { label: 'هذا الشهر', days: 0 },
          ].map(preset => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                if (preset.days === 0) {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                  setDateFrom(firstDay.toISOString().split('T')[0]);
                  setDateTo(now.toISOString().split('T')[0]);
                } else {
                  setPreset(preset.days);
                }
              }}
            >
              {preset.label}
            </Button>
          ))}
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              إعادة تعيين
            </Button>
          )}
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
        </div>
        {dateFrom && dateTo && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">
              الأرقام محسوبة من الإحصائيات اليومية ضمن الفترة المحددة
            </p>
            <p className="text-xs text-yellow-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              مصاريف الإعلانات والتغليف تمثل القيمة الإجمالية وليست محسوبة حسب الفترة المحددة
            </p>
          </div>
        )}
      </div>

      {/* KPI Totals - Two groups */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">الأداء</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="الطلبات المنشأة" value={totals.created} />
          <StatCard label="المؤكدة" value={totals.confirmed} />
          <StatCard label="المسلمة" value={totals.delivered} variant="profit" />
          <StatCard label="المرتجعة" value={totals.returned} variant="loss" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="نسبة التأكيد" value={totalConfirmationRate} suffix="%" variant={totalConfirmationRate >= 50 ? 'profit' : 'warning'} />
          <StatCard label="نسبة التوصيل" value={totalDeliveryRate} suffix="%" variant={totalDeliveryRate >= 60 ? 'profit' : 'loss'} />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">المال</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="الإيرادات" value={totals.revenue} suffix="د.ج" />
          <StatCard
            label="الربح الصافي"
            value={totals.profit}
            suffix="د.ج"
            variant={totals.profit >= 0 ? 'profit' : 'loss'}
            className="col-span-1"
          />
        </div>
      </div>

      {/* Alerts */}
      {totals.profit < 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4" /> الربح الصافي سالب!
        </div>
      )}

      {/* Product Cards - Collapsible */}
      <h3 className="text-lg font-bold">تفاصيل المنتجات</h3>
      {productStats.map(p => {
        const config = decisionConfig[p.decision];
        const isOpen = expandedCards.has(p.product.id);
        const manual = manualInputs[p.product.name] || { adSpend: 0, packagingCost: 0, salePriceOverride: null, purchasePriceOverride: null, deliveryDiscountOverride: null };

        const getVal = (field: 'salePriceOverride' | 'purchasePriceOverride' | 'deliveryDiscountOverride', syncedVal: number) => {
          return manual[field] ?? syncedVal;
        };
        const isOverridden = (field: 'salePriceOverride' | 'purchasePriceOverride' | 'deliveryDiscountOverride') => manual[field] != null;
        const isMissing = (val: number, field: 'salePriceOverride' | 'purchasePriceOverride' | 'deliveryDiscountOverride') => val === 0 && !isOverridden(field);

        const perUnitDiscountDisplay = p.product.total_delivered > 0 ? p.product.delivery_discount / p.product.total_delivered : 0;

        return (
          <Collapsible key={p.product.id} open={isOpen} onOpenChange={() => toggleCard(p.product.id)}>
            <div className={`stat-card border-r-4 ${config.border} ${config.bg} space-y-0`}>
              {/* Header - always visible */}
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h4 className="font-semibold text-base truncate">{p.product.name}</h4>
                    <Badge variant="outline" className={`text-xs shrink-0 ${config.color}`}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">الربح</p>
                      <p className={`text-sm font-bold ${p.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {p.profit.toLocaleString('ar-DZ')} د.ج
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">التوصيل</p>
                      <p className={`text-sm font-bold ${p.deliveryRate >= 60 ? 'text-profit' : 'text-loss'}`}>
                        {p.deliveryRate.toFixed(1)}%
                      </p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Expanded content */}
              <CollapsibleContent className="pt-4 space-y-4">
                {/* Editable price fields */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <EditableField
                    label="سعر البيع (د.ج)"
                    value={getVal('salePriceOverride', p.product.sale_price)}
                    syncedValue={p.product.sale_price}
                    isOverridden={isOverridden('salePriceOverride')}
                    isMissing={isMissing(p.product.sale_price, 'salePriceOverride')}
                    onChange={v => saveManualInput(p.product.name, 'salePriceOverride', v)}
                    onReset={() => saveManualInput(p.product.name, 'salePriceOverride', null)}
                  />
                  <EditableField
                    label="سعر الشراء (د.ج)"
                    value={getVal('purchasePriceOverride', p.product.purchase_price)}
                    syncedValue={p.product.purchase_price}
                    isOverridden={isOverridden('purchasePriceOverride')}
                    isMissing={isMissing(p.product.purchase_price, 'purchasePriceOverride')}
                    onChange={v => saveManualInput(p.product.name, 'purchasePriceOverride', v)}
                    onReset={() => saveManualInput(p.product.name, 'purchasePriceOverride', null)}
                  />
                  <EditableField
                    label="تخفيض التوصيل/طلب (د.ج)"
                    value={getVal('deliveryDiscountOverride', perUnitDiscountDisplay)}
                    syncedValue={perUnitDiscountDisplay}
                    isOverridden={isOverridden('deliveryDiscountOverride')}
                    isMissing={isMissing(perUnitDiscountDisplay, 'deliveryDiscountOverride')}
                    onChange={v => saveManualInput(p.product.name, 'deliveryDiscountOverride', v)}
                    onReset={() => saveManualInput(p.product.name, 'deliveryDiscountOverride', null)}
                  />
                </div>

                {/* Read-only stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ReadOnlyField label="نسبة التأكيد" value={`${p.confirmationRate.toFixed(1)}%`} />
                  <ReadOnlyField label="المنشأة" value={p.created} />
                  <ReadOnlyField label="المؤكدة" value={p.confirmed} />
                  <ReadOnlyField label="المسلمة" value={p.delivered} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ReadOnlyField label="المرتجعة" value={p.returned} />
                </div>

                {/* Manual inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">مصاريف الإعلانات ($)</Label>
                    <Input
                      type="number"
                      value={manual.adSpend || ''}
                      onChange={e => saveManualInput(p.product.name, 'adSpend', Number(e.target.value) || 0)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">تكلفة التغليف / طلب (د.ج)</Label>
                    <Input
                      type="number"
                      value={manual.packagingCost || ''}
                      onChange={e => saveManualInput(p.product.name, 'packagingCost', Number(e.target.value) || 0)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Cost breakdown */}
                <CostBreakdown stat={p} />

                {/* Results */}
                {/* Results + New Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3 rounded-lg border ${p.revenue > 0 ? 'border-border' : 'border-border/50'}`}>
                    <p className="text-xs text-muted-foreground">الإيرادات</p>
                    <p className="text-lg font-bold">{p.revenue.toLocaleString('ar-DZ')} <span className="text-xs font-normal text-muted-foreground">د.ج</span></p>
                  </div>
                  <div className={`p-3 rounded-lg border ${p.deliveryRate >= 60 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                    <p className="text-xs text-muted-foreground">نسبة التوصيل</p>
                    <p className={`text-lg font-bold ${p.deliveryRate >= 60 ? 'text-profit' : 'text-loss'}`}>{p.deliveryRate.toFixed(1)}%</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${p.profit >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'} col-span-2 sm:col-span-1`}>
                    <p className="text-xs text-muted-foreground">الربح الصافي</p>
                    <p className={`text-lg font-bold ${p.profit >= 0 ? 'text-profit' : 'text-loss'}`}>{p.profit.toLocaleString('ar-DZ')} <span className="text-xs font-normal text-muted-foreground">د.ج</span></p>
                  </div>
                  <div className="p-3 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground">هامش الربح</p>
                    <p className={`text-lg font-bold ${p.revenue > 0 && (p.profit / p.revenue) * 100 >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0'}%
                    </p>
                  </div>
                </div>
                {p.delivered > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground">تكلفة الطلب المسلّم</p>
                      <p className="text-sm font-bold">{(p.totalCost / p.delivered).toFixed(0)} د.ج</p>
                    </div>
                    {p.adSpendDZD > 0 && (
                      <div className="p-3 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground">تكلفة الاكتساب</p>
                        <p className="text-sm font-bold">{(p.adSpendDZD / p.delivered).toFixed(0)} د.ج</p>
                      </div>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

interface EditableFieldProps {
  label: string;
  value: number;
  syncedValue: number;
  isOverridden: boolean;
  isMissing: boolean;
  onChange: (value: number) => void;
  onReset: () => void;
}

function EditableField({ label, value, syncedValue, isOverridden, isMissing, onChange, onReset }: EditableFieldProps) {
  const borderClass = isMissing
    ? 'border-yellow-500/50 bg-yellow-500/5'
    : isOverridden
      ? 'border-blue-500/50 bg-blue-500/5'
      : 'border-border/50 bg-muted/30';

  return (
    <div className={`p-2 rounded-lg border ${borderClass} relative`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {isOverridden && (
          <button onClick={onReset} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5" title="إعادة تعيين للقيمة المزامنة">
            <RotateCw className="h-2.5 w-2.5" />
          </button>
        )}
        {isMissing && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
      </div>
      <Input
        type="number"
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        placeholder={isMissing ? 'أدخل القيمة' : String(syncedValue)}
        className="h-7 text-sm font-semibold border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {isOverridden && (
        <p className="text-[9px] text-blue-400 mt-0.5 flex items-center gap-0.5">
          <Pencil className="h-2 w-2" /> معدّل يدوياً (الأصل: {syncedValue.toLocaleString()})
        </p>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}

function CostBreakdown({ stat }: { stat: ProductStat }) {
  const costs = [
    { label: 'الشراء', value: stat.purchaseCost, icon: <Package className="h-3 w-3" /> },
    { label: 'التوصيل', value: stat.deliveryCost, icon: <Truck className="h-3 w-3" /> },
    { label: 'المرتجعات', value: stat.returnCost, icon: <RotateCcw className="h-3 w-3" /> },
    { label: 'التأكيد', value: stat.confirmationCost, icon: <Phone className="h-3 w-3" /> },
    { label: 'العمليات', value: stat.operationCost, icon: <Settings2 className="h-3 w-3" /> },
    { label: 'الإعلانات', value: stat.adSpendDZD, icon: <DollarSign className="h-3 w-3" /> },
    { label: 'التغليف', value: stat.packagingTotal, icon: <Package className="h-3 w-3" /> },
  ].filter(c => c.value > 0);

  if (costs.length === 0 || stat.revenue === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">تفصيل التكاليف</p>
      {costs.map(cost => {
        const pct = (cost.value / stat.revenue) * 100;
        return (
          <div key={cost.label} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{cost.icon}</span>
            <span className="w-16 text-muted-foreground">{cost.label}</span>
            <Progress value={Math.min(pct, 100)} className="flex-1 h-1.5" />
            <span className="w-20 text-left font-medium">{cost.value.toLocaleString('ar-DZ')} د.ج</span>
            <span className="w-10 text-left text-muted-foreground">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}
