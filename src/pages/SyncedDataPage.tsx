import { useEffect, useMemo } from 'react';
import { useSyncStore } from '@/store/useSyncStore';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const STATUS_GROUPS = {
  received: ['معلقة', 'مؤكدة', 'مشحونة', 'مسلمة', 'مرتجعة', 'ملغاة', 'لا يرد', 'مؤجلة', 'جاري التوصيل', 'نحو الإرجاع'],
  confirmed: ['مؤكدة', 'مشحونة', 'مسلمة', 'مرتجعة', 'جاري التوصيل', 'نحو الإرجاع'],
  delivered: ['مسلمة'],
  returned: ['مرتجعة', 'نحو الإرجاع'],
  cancelled: ['ملغاة', 'لا يرد'],
};

export default function SyncedDataPage() {
  const { orders, products, deliveryPrices, loading, fetchAllSyncedData } = useSyncStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllSyncedData();
  }, []);

  const lastSync = useMemo(() => {
    if (orders.length === 0) return null;
    return orders.reduce((latest, o) => o.synced_at > latest ? o.synced_at : latest, orders[0].synced_at);
  }, [orders]);

  const stats = useMemo(() => {
    const total = orders.length;
    const byStatus: Record<string, number> = {};
    orders.forEach(o => {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    });

    const countByGroup = (statuses: string[]) => orders.filter(o => statuses.includes(o.status)).length;

    const confirmed = countByGroup(STATUS_GROUPS.confirmed);
    const delivered = countByGroup(STATUS_GROUPS.delivered);
    const returned = countByGroup(STATUS_GROUPS.returned);

    const confirmationRate = total > 0 ? (confirmed / total) * 100 : 0;
    const deliveryRate = (delivered + returned) > 0 ? (delivered / (delivered + returned)) * 100 : 0;

    // Revenue from delivered orders
    const deliveredOrders = orders.filter(o => STATUS_GROUPS.delivered.includes(o.status));
    const totalRevenue = deliveredOrders.reduce((s, o) => s + o.amount, 0);

    // Cost calculation
    const deliveredQty = deliveredOrders.reduce((s, o) => s + o.quantity, 0);
    let totalPurchaseCost = 0;
    deliveredOrders.forEach(o => {
      const prod = products.find(p => p.name === o.product_name);
      if (prod) totalPurchaseCost += prod.purchase_price * o.quantity;
    });

    // Delivery cost
    let totalDeliveryCost = 0;
    deliveredOrders.forEach(o => {
      const dp = deliveryPrices.find(d => d.wilaya_name === o.wilaya);
      if (dp) {
        totalDeliveryCost += o.delivery_type === 'office' ? dp.office_price : dp.home_price;
      }
    });

    // Return cost
    const returnedOrders = orders.filter(o => STATUS_GROUPS.returned.includes(o.status));
    let totalReturnCost = 0;
    returnedOrders.forEach(o => {
      const dp = deliveryPrices.find(d => d.wilaya_name === o.wilaya);
      if (dp) {
        totalReturnCost += o.delivery_type === 'office' ? dp.office_price : dp.home_price;
      }
    });

    const profit = totalRevenue - totalPurchaseCost - totalDeliveryCost - totalReturnCost;

    return { total, byStatus, confirmed, delivered, returned, confirmationRate, deliveryRate, totalRevenue, profit, deliveredQty };
  }, [orders, products, deliveryPrices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <Link2Off className="h-16 w-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-bold">لا توجد بيانات مزامنة</h2>
        <p className="text-muted-foreground text-sm">
          لربط منصة EcoSmart، اذهب إلى <strong>الإعدادات</strong> وأنشئ رمز API، ثم أضفه في إعدادات EcoSmart.
        </p>
        <Button variant="outline" onClick={() => navigate('/settings')}>
          الذهاب للإعدادات
        </Button>
      </div>
    );
  }

  const statusEntries = Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Sync banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <span className="text-sm text-emerald-400">
          ✅ البيانات مُزامنة من EcoSmart — آخر مزامنة: {lastSync ? new Date(lastSync).toLocaleString('ar-DZ') : '—'}
        </span>
        <Button variant="ghost" size="icon" className="mr-auto" onClick={() => fetchAllSyncedData()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <h2 className="text-2xl font-bold">📊 بيانات EcoSmart</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="إجمالي الطلبات" value={stats.total} />
        <KpiCard label="الطلبات المسلمة" value={stats.delivered} color="text-emerald-400" />
        <KpiCard label="المرتجعات" value={stats.returned} color="text-red-400" />
        <KpiCard label="نسبة التأكيد" value={`${stats.confirmationRate.toFixed(1)}%`} color={stats.confirmationRate >= 50 ? 'text-emerald-400' : 'text-yellow-400'} />
        <KpiCard label="نسبة التوصيل" value={`${stats.deliveryRate.toFixed(1)}%`} color={stats.deliveryRate >= 60 ? 'text-emerald-400' : 'text-red-400'} />
        <KpiCard label="الإيرادات" value={`${stats.totalRevenue.toLocaleString()} د.ج`} />
        <KpiCard label="الربح الصافي" value={`${stats.profit.toLocaleString()} د.ج`} color={stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <KpiCard label="المنتجات" value={products.length} />
      </div>

      {/* Alerts */}
      {stats.profit < 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4" /> الربح الصافي سالب!
        </div>
      )}
      {stats.deliveryRate < 60 && stats.delivered > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
          <AlertTriangle className="h-4 w-4" /> نسبة التوصيل أقل من 60%
        </div>
      )}

      {/* Status breakdown */}
      <div className="stat-card">
        <h3 className="font-semibold mb-3">توزيع الحالات</h3>
        <div className="space-y-2">
          {statusEntries.map(([status, count]) => (
            <div key={status} className="flex items-center justify-between text-sm">
              <span>{status}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                </div>
                <span className="text-muted-foreground w-10 text-left">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products table */}
      <div className="stat-card">
        <h3 className="font-semibold mb-3">المنتجات المزامنة</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-right py-2">المنتج</th>
                <th className="text-right py-2">سعر البيع</th>
                <th className="text-right py-2">سعر الشراء</th>
                <th className="text-right py-2">الكمية</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{p.alias_name || p.name}</td>
                  <td className="py-2">{p.sale_price.toLocaleString()} د.ج</td>
                  <td className="py-2">{p.purchase_price.toLocaleString()} د.ج</td>
                  <td className="py-2">{p.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="stat-card text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || ''}`}>{value}</p>
    </div>
  );
}
