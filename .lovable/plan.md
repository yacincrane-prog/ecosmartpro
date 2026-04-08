

# تنفيذ الخطة الكاملة: cancelled + Edge Function + واجهة المستخدم

---

## المرحلة 1: قاعدة البيانات (Migration)

```sql
ALTER TABLE synced_daily_stats ADD COLUMN cancelled integer NOT NULL DEFAULT 0;
ALTER TABLE synced_products ADD COLUMN total_cancelled integer NOT NULL DEFAULT 0;
```

---

## المرحلة 2: تحديث Edge Function (`receive-orders/index.ts`)

- إضافة `cancelled: Number(d.cancelled) || 0` في insert daily stats (سطر 108-117)
- إضافة `totalCancelled` في تجميع الإجماليات وتحديث `synced_products` (سطر 122-138)

---

## المرحلة 3: تحديث Store (`useSyncStore.ts`)

- إضافة `cancelled` إلى `SyncedDailyStat` interface
- إضافة `total_cancelled` إلى `SyncedProduct` interface

---

## المرحلة 4: تحديث واجهة المستخدم (`SyncedDataPage.tsx`)

### 4.1 — إضافة `cancelled` إلى `ProductStat` interface والحسابات
- حساب `cancelled` من daily stats المفلترة أو من `product.total_cancelled`
- إضافة `cancellationRate = cancelled / created * 100`

### 4.2 — تحسين Header البطاقة (سطر 427)
- إضافة عدد الملغاة: `{p.cancelled}✕` بلون أحمر/برتقالي بجانب الأرقام الموجودة

### 4.3 — إضافة "الملغاة" إلى grid الإحصائيات (سطر 468-474)
- إضافة `ReadOnlyField` للملغاة ونسبة الإلغاء
- تحويل grid إلى `grid-cols-2 sm:grid-cols-6` لاستيعاب الحقلين الجديدين

### 4.4 — KPI Totals (سطر 337-366)
- إضافة `StatCard` للملغاة في grid الأداء العلوي
- إضافة بطاقة نسبة الإلغاء بلون تحذيري

### 4.5 — الملخص الذكي (سطر 209-222)
- تحديث `totals` لتشمل `cancelled`

### 4.6 — شريط المزامنة (سطر 246-254)
- إضافة عدد المنتجات والأيام المزامنة: `{products.length} منتج · {uniqueDays} يوم`

---

## الملفات المتأثرة

| ملف | تغيير |
|-----|--------|
| Migration جديد | إضافة عمودي `cancelled` و `total_cancelled` |
| `supabase/functions/receive-orders/index.ts` | تخزين + تجميع `cancelled` |
| `src/store/useSyncStore.ts` | تحديث interfaces |
| `src/pages/SyncedDataPage.tsx` | عرض الملغاة + نسبة الإلغاء + تحسين الشريط |

