

# خطة تكامل EcoSmart - استقبال البيانات وإدارة API Tokens

## ملخص
إضافة نظام تكامل كامل مع منصة EcoSmart: جداول لتخزين البيانات المزامنة، Edge Function لاستقبال الطلبات، واجهة إدارة API Tokens في الإعدادات، وصفحة جديدة لعرض البيانات المزامنة مع حسابات تلقائية.

---

## الخطوة 1: إنشاء جداول قاعدة البيانات (Migration)

إنشاء 4 جداول جديدة بـ migration واحدة:

- **`api_tokens`** — رموز API مع `token` فريد (auto-generated hex)، `label`، `is_active`، `last_used_at`، وRLS بحيث كل مستخدم يدير رموزه فقط
- **`synced_orders`** — الطلبات المستقبلة من EcoSmart (product_name, status, price, amount, quantity, discount, delivery_type, delivery_provider, wilaya, commune, order_created_at)
- **`synced_products`** — المنتجات المزامنة (name, alias_name, sale_price, purchase_price, qty) مع UNIQUE على (user_id, name)
- **`synced_delivery_prices`** — أسعار التوصيل حسب الولاية (wilaya_name, home_price, office_price) مع UNIQUE على (user_id, wilaya_name)

كل الجداول مع RLS policies مناسبة.

---

## الخطوة 2: إنشاء Edge Function `receive-orders`

ملف: `supabase/functions/receive-orders/index.ts`

**المنطق:**
1. التحقق من `Authorization: Bearer <TOKEN>` بمطابقته مع `api_tokens` (is_active = true) باستخدام service_role key
2. إذا كان Body يحتوي `{ "test": true }` → إرجاع `{ "ok": true }` فقط
3. حذف جميع `synced_orders` القديمة للمستخدم
4. Bulk insert للطلبات الجديدة
5. Upsert للمنتجات في `synced_products` (on conflict: user_id + name)
6. Upsert لأسعار التوصيل في `synced_delivery_prices` (on conflict: user_id + wilaya_name)
7. تحديث `last_used_at` للـ token
8. إرجاع `{ "ok": true, "orders_received": N, "products_received": N }`

يتضمن CORS headers ومعالجة OPTIONS وInput validation.

---

## الخطوة 3: تحديث صفحة الإعدادات

ملف: `src/pages/SettingsPage.tsx`

إضافة قسم **"ربط EcoSmart"** أسفل الإعدادات الحالية:
- عرض Token الحالي (مخفي جزئياً) مع زر **نسخ**
- زر **"إنشاء رمز جديد"** → يُولّد token ويعرضه
- زر **"إلغاء الرمز"** → يحذف/يعطل Token
- عرض **آخر استخدام** للرمز
- نص توضيحي لكيفية الربط مع EcoSmart

---

## الخطوة 4: إنشاء صفحة البيانات المزامنة

ملف جديد: `src/pages/SyncedDataPage.tsx`

**المحتوى:**
- بانر أخضر "البيانات مُزامنة من EcoSmart" مع تاريخ آخر مزامنة (من `synced_at` في آخر طلب)
- Empty state إذا لم تكن هناك بيانات (مع شرح خطوات الربط)
- **إحصائيات تلقائية محسوبة من `synced_orders`:**
  - عدد الطلبات حسب الحالة (معلقة، مؤكدة، مشحونة، مسلمة، مرتجعة، ملغاة، إلخ)
  - نسبة التأكيد = (مؤكدة + مشحونة + مسلمة + مرتجعة) / إجمالي
  - نسبة التوصيل = مسلمة / (مسلمة + مرتجعة)
- **بيانات المنتجات** من `synced_products` (سعر شراء/بيع)
- **حساب الربح** = مبلغ المسلمة - (سعر الشراء × الكمية) - تكلفة التوصيل - تكلفة المرتجعات
- تكلفة التوصيل من `synced_delivery_prices` حسب ولاية كل طلب ونوعه

إضافة route `/synced-data` في `App.tsx` وlink في `AppLayout.tsx`.

---

## الخطوة 5: إنشاء Zustand Store للبيانات المزامنة

ملف جديد: `src/store/useSyncStore.ts`

- `fetchApiTokens()` — جلب tokens المستخدم
- `createApiToken(label)` — إنشاء token جديد
- `deleteApiToken(id)` — حذف token
- `fetchSyncedOrders()` — جلب الطلبات المزامنة
- `fetchSyncedProducts()` — جلب المنتجات المزامنة
- `fetchSyncedDeliveryPrices()` — جلب أسعار التوصيل

---

## الملفات المتأثرة

| ملف | تغيير |
|-----|--------|
| Migration جديدة | 4 جداول + RLS |
| `supabase/functions/receive-orders/index.ts` | Edge Function جديدة |
| `src/store/useSyncStore.ts` | Store جديد |
| `src/pages/SettingsPage.tsx` | إضافة قسم API Tokens |
| `src/pages/SyncedDataPage.tsx` | صفحة جديدة |
| `src/App.tsx` | إضافة route |
| `src/components/AppLayout.tsx` | إضافة nav link |

