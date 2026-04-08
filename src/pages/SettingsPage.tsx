import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useSyncStore } from '@/store/useSyncStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Trash2, Plus, Key, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  const { tokens, fetchApiTokens, createApiToken, deleteApiToken } = useSyncStore();
  const [newTokenLabel, setNewTokenLabel] = useState('EcoSmart');
  const [creatingToken, setCreatingToken] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchApiTokens();
  }, []);

  const handleChange = async (field: string, value: string) => {
    await updateSettings({ [field]: Number(value) || 0 });
    toast.success('تم تحديث الإعدادات');
  };

  const handleCreateToken = async () => {
    setCreatingToken(true);
    const token = await createApiToken(newTokenLabel);
    if (token) {
      setNewlyCreatedToken(token.token);
      toast.success('تم إنشاء رمز API جديد');
    } else {
      toast.error('فشل إنشاء الرمز');
    }
    setCreatingToken(false);
  };

  const handleDeleteToken = async (id: string) => {
    await deleteApiToken(id);
    toast.success('تم حذف الرمز');
    setNewlyCreatedToken(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ');
  };

  const fields = [
    { key: 'currencyRate', label: 'سعر العملة (1$ = ? د.ج)', value: settings.currencyRate },
    { key: 'returnCost', label: 'سعر الإرجاع (د.ج)', value: settings.returnCost },
    { key: 'operationCostPerOrder', label: 'تكلفة التشغيل للطلب الواحد (د.ج)', value: settings.operationCostPerOrder },
    { key: 'confirmationCost', label: 'تكلفة التأكيد (د.ج)', value: settings.confirmationCost },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold">الإعدادات العامة</h2>

      {/* General settings */}
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

      {/* EcoSmart Integration */}
      <div className="stat-card space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">ربط EcoSmart</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          أنشئ رمز API وأضفه في إعدادات EcoSmart لمزامنة البيانات تلقائياً.
        </p>

        {/* Create new token */}
        <div className="flex gap-2">
          <Input
            value={newTokenLabel}
            onChange={(e) => setNewTokenLabel(e.target.value)}
            placeholder="اسم الرمز"
            className="input-field flex-1"
          />
          <Button onClick={handleCreateToken} disabled={creatingToken} size="sm">
            {creatingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إنشاء
          </Button>
        </div>

        {/* Newly created token (show once) */}
        {newlyCreatedToken && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <p className="text-xs text-emerald-400">⚠️ انسخ هذا الرمز الآن، لن يظهر مرة أخرى:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background p-2 rounded flex-1 break-all">{newlyCreatedToken}</code>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(newlyCreatedToken)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Existing tokens */}
        {tokens.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">الرموز الحالية:</p>
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.token.slice(0, 8)}••••••••
                    {t.last_used_at && ` · آخر استخدام: ${new Date(t.last_used_at).toLocaleDateString('ar-DZ')}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(t.token)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteToken(t.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">كيفية الربط:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>أنشئ رمز API أعلاه</li>
            <li>افتح إعدادات EcoSmart</li>
            <li>الصق الرمز في خانة "API Token"</li>
            <li>أضف رابط المنصة: <code className="bg-background px-1 rounded">{`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receive-orders`}</code></li>
            <li>اختبر الاتصال</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
