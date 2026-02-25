import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, updateSettings } = useAppStore();

  const handleChange = async (field: string, value: string) => {
    await updateSettings({ [field]: Number(value) || 0 });
    toast.success('تم تحديث الإعدادات');
  };

  const fields = [
    { key: 'currencyRate', label: 'سعر العملة (1$ = ? د.ج)', value: settings.currencyRate },
    { key: 'returnCost', label: 'سعر الإرجاع (د.ج)', value: settings.returnCost },
    { key: 'operationCostPerOrder', label: 'تكلفة التشغيل للطلب الواحد (د.ج)', value: settings.operationCostPerOrder },
    { key: 'confirmationCost', label: 'تكلفة التأكيد (د.ج)', value: settings.confirmationCost },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">الإعدادات العامة</h2>
      <div className="stat-card space-y-5">
        <p className="text-sm text-muted-foreground">هذه الإعدادات تُطبّق على جميع المنتجات تلقائيًا.</p>
        {fields.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-muted-foreground mb-1.5 block">{f.label}</Label>
            <Input
              type="number"
              value={f.value}
              onChange={(e) => handleChange(f.key, e.target.value)}
              className="input-field"
              step="any"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
