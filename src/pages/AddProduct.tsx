import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AddProduct() {
  const { addProduct, addPeriod, products } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetProductId = searchParams.get('productId') || '';
  const presetName = searchParams.get('product') || '';
  const existingProduct = presetProductId ? products.find(p => p.id === presetProductId) : null;
  const [loading, setLoading] = useState(false);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingProduct && !form.name.trim()) {
      toast.error('يرجى إدخال اسم المنتج');
      return;
    }
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

  const fields = [
    { key: 'purchasePrice', label: 'سعر الشراء (د.ج)', type: 'number' },
    { key: 'sellingPrice', label: 'سعر البيع (د.ج)', type: 'number' },
    { key: 'receivedOrders', label: 'عدد الطلبات المستلمة', type: 'number' },
    { key: 'confirmedOrders', label: 'عدد الطلبات المؤكدة', type: 'number' },
    { key: 'deliveredOrders', label: 'عدد الطلبات الواصلة', type: 'number' },
    { key: 'adSpendUSD', label: 'مصاريف الإعلان ($)', type: 'number' },
    { key: 'deliveryDiscount', label: 'تخفيض التوصيل (د.ج)', type: 'number' },
    { key: 'packagingCost', label: 'تكلفة التغليف (د.ج)', type: 'number' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        {existingProduct ? `إضافة فترة لـ "${existingProduct.name}"` : 'إضافة منتج جديد'}
      </h2>
      <form onSubmit={handleSubmit} className="stat-card space-y-5">
        {!existingProduct && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">اسم المنتج</Label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input-field"
              placeholder="اسم المنتج"
            />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{f.label}</Label>
              <Input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="input-field"
                placeholder={f.label}
                step="any"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">من تاريخ</Label>
            <Input type="date" value={form.dateFrom} onChange={e => handleChange('dateFrom', e.target.value)} className="input-field" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">إلى تاريخ</Label>
            <Input type="date" value={form.dateTo} onChange={e => handleChange('dateTo', e.target.value)} className="input-field" />
          </div>
        </div>
        <Button type="submit" className="w-full font-semibold" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          {existingProduct ? 'إضافة الفترة' : 'إضافة المنتج'}
        </Button>
      </form>
    </div>
  );
}
