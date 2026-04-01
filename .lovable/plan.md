

# تدقيق منطقي وحسابي — صفحة مزامنة EcoSmart

---

## 🚨 الأخطاء المكتشفة

### خطأ 1: تخفيض التوصيل لا يتغير مع فلتر التاريخ (Critical)

**النوع:** Logic / Calculation
**الخطورة:** حرجة

عند تصفية البيانات بفترة زمنية (مثلاً "آخر 7 أيام")، يتم جلب الطلبات من `synced_daily_stats` للفترة المحددة، لكن `delivery_discount` يُؤخذ دائماً من `synced_products` وهو القيمة الإجمالية الكاملة.

**النتيجة:** إذا اخترت 7 أيام من أصل 30 يوم، ستحصل على طلبات 7 أيام مع تخفيض توصيل 30 يوم كاملة → ربح صافي خاطئ تماماً.

**الحل:** حساب نسبة تخفيض التوصيل لكل طلب مسلّم (`delivery_discount / total_delivered`)، ثم ضربها في عدد الطلبات المسلّمة المفلترة:
```
perUnitDiscount = product.delivery_discount / product.total_delivered
filteredDeliveryCost = filteredDelivered * perUnitDiscount
```

---

### خطأ 2: تكلفة التأكيد تختلف عن المحرك الأصلي (Medium)

**النوع:** Calculation Inconsistency
**الخطورة:** متوسطة

| | SyncedDataPage | calculations.ts |
|---|---|---|
| تكلفة التأكيد | `confirmed × confirmationCost` | `delivered × confirmationCost` (ضمن confirmationAndDeliveryExpenses) |

المحرك الأصلي يضرب تكلفة التأكيد في الطلبات **المسلّمة**، بينما صفحة المزامنة تضربها في **المؤكدة**.

**منطقياً:** تكلفة التأكيد تُدفع لكل طلب مؤكد (تتصل بالعميل ← يؤكد ← تدفع). لذا `confirmed × cost` أصح واقعياً. لكن التناقض بين المحركين يعطي أرقام مختلفة لنفس المنتج.

**الحل:** توحيد المنطق — استخدام `confirmed` في كلا المحركين (وتحديث `calculations.ts` لاحقاً).

---

### خطأ 3: نسبة التوصيل محسوبة بشكل مختلف (Medium)

**النوع:** Calculation Inconsistency
**الخطورة:** متوسطة

| | SyncedDataPage | calculations.ts |
|---|---|---|
| نسبة التوصيل | `delivered / (delivered + returned) × 100` | `delivered / confirmed × 100` |

الفرق: إذا كان هناك طلبات "قيد التوصيل" (مؤكدة لكن لم تُسلّم ولم تُرجع بعد)، المعادلتان تعطيان نتائج مختلفة.

**مثال:** 40 مؤكدة، 10 مسلّمة، 30 مرتجعة (0 قيد التوصيل):
- SyncedDataPage: `10/(10+30) = 25%` ✅
- calculations.ts: `10/40 = 25%` ✅ (نفس النتيجة هنا لأنه لا توجد طلبات معلقة)

**مثال آخر:** 40 مؤكدة، 10 مسلّمة، 20 مرتجعة (10 قيد التوصيل):
- SyncedDataPage: `10/(10+20) = 33%`
- calculations.ts: `10/40 = 25%`

**الحل:** الاحتفاظ بـ `delivered / (delivered + returned)` في SyncedDataPage لأنه يعكس الواقع بشكل أدق مع بيانات EcoSmart (حيث المرتجعات تأتي منفصلة).

---

### خطأ 4: مصاريف يدوية لا تتكيف مع فلتر التاريخ (Medium)

**النوع:** Logic
**الخطورة:** متوسطة

`adSpend` و `packagingCost` هي قيم إجمالية يدخلها المستخدم. عند تصفية فترة 7 أيام، تُطبّق المصاريف الكاملة على فترة جزئية.

**الحل:** إضافة تحذير نصي عند استخدام فلتر التاريخ: "⚠️ مصاريف الإعلانات والتغليف تمثل القيمة الإجمالية وليست محسوبة حسب الفترة المحددة"

---

### خطأ 5: Edge case — صفر طلبات مسلّمة (Low)

**النوع:** Edge Case
**الخطورة:** منخفضة

عندما `total_delivered = 0`:
- `perUnitDiscount = delivery_discount / 0` = `Infinity`
- الحساب ينهار

**الحل:** فحص `total_delivered > 0` قبل القسمة، وإرجاع 0 إذا كان صفراً.

---

## 🛠️ خطة التنفيذ

### Phase 1: إصلاحات حرجة (ملف واحد)

**الملف:** `src/pages/SyncedDataPage.tsx`

1. **إصلاح delivery_discount مع فلتر التاريخ:**
```typescript
const perUnitDiscount = product.total_delivered > 0
  ? product.delivery_discount / product.total_delivered
  : 0;
const deliveryCost = delivered * perUnitDiscount;
```

2. **إضافة تحذير المصاريف اليدوية** عند تفعيل فلتر التاريخ

3. **حماية القسمة على صفر** في كل الحسابات

### Phase 2: مقاييس إضافية مفقودة

إضافة في `CostBreakdown` أو كـ StatCards:
- **ROI** = `(profit / totalCost) × 100`
- **هامش الربح الصافي** = `(profit / revenue) × 100`
- **تكلفة الطلب المسلّم** = `totalCost / delivered`
- **تكلفة الاكتساب** = `adSpendDZD / delivered`

### Phase 3: توحيد المحركات (اختياري)

تحديث `calculations.ts` ليتوافق مع منطق SyncedDataPage حيث:
- تكلفة التأكيد = `confirmed × cost` (بدلاً من delivered)
- نسبة التوصيل = `delivered / (delivered + returned)` حيث المرتجعات متاحة

---

## الملفات المتأثرة

| ملف | تغيير |
|-----|--------|
| `src/pages/SyncedDataPage.tsx` | إصلاح delivery_discount + تحذير + مقاييس جديدة |
| `src/lib/calculations.ts` | توحيد منطق التأكيد (Phase 3 اختياري) |

