import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { ProductInput } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AddProduct() {
  const { addProduct } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetName = searchParams.get('product') || '';

  const [form, setForm] = useState({
    name: presetName,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم المنتج');
      return;
    }
    const product: ProductInput = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
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
      createdAt: new Date().toISOString(),
    };
    addProduct(product);
    toast.success('تم إضافة المنتج بنجاح');
    navigate('/archive');
  };

  const fields = [
    { key: 'name', label: 'اسم المنتج', type: 'text' },
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
      <h2 className="text-2xl font-bold mb-6">إضافة تحليل منتج جديد</h2>
      <form onSubmit={handleSubmit} className="stat-card space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key} className={f.key === 'name' ? 'sm:col-span-2' : ''}>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{f.label}</Label>
              <Input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="input-field"
                placeholder={f.label}
                step={f.type === 'number' ? 'any' : undefined}
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
        <Button type="submit" className="w-full font-semibold">
          إضافة المنتج
        </Button>
      </form>
    </div>
  );
}
