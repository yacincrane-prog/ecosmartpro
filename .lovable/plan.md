

# استبدال التقويمات + تحسين الهوية البصرية لتتطابق مع EcoSmart

---

## التحليل

من الصور المرفوعة، هوية EcoSmart تعتمد على:
- **اللون البرتقالي** كلون أساسي (تقريباً `hsl(25, 95%, 53%)`)
- **خلفية داكنة** مع بطاقات بحدود خفيفة
- **شريط علوي برتقالي** مع تبويبات (التأكيد / التتبع / stats)
- **Bottom tab bar** بـ 5 تبويبات مع أيقونات + نص
- **تقويم مخصص** مع أزرار presets (Aujourd'hui / Hier / Semaine / Mois) وزر تأكيد برتقالي
- **بطاقات بيضاء/فاتحة** على خلفية داكنة مع حدود ذهبية/برتقالية للعناصر المهمة

حالياً المنصة تستخدم:
- اللون الأخضر `hsl(160, 84%, 39%)` كلون أساسي
- `input type="date"` الأصلي في 5 صفحات (10 حقول)
- تقويم `react-day-picker` موجود في `calendar.tsx` لكنه غير مستخدم

---

## خطة التنفيذ

### 1. إنشاء مكون `DatePickerField` مخصص

مكون واحد يستبدل كل `input type="date"`:
- يستخدم `Popover` + مكون `Calendar` الموجود
- يعرض التاريخ المختار بتنسيق عربي
- أزرار presets (اليوم / أمس / هذا الأسبوع / هذا الشهر)
- زر "تأكيد" برتقالي أسفل التقويم (كما في EcoSmart)
- يقبل نفس الـ API: `value: string` (YYYY-MM-DD) و `onChange: (value: string) => void`

### 2. تحديث الهوية البصرية — الألوان

تغيير `index.css` CSS variables:

| متغير | القيمة الحالية | القيمة الجديدة |
|--------|---------------|---------------|
| `--primary` | `160 84% 39%` (أخضر) | `25 95% 53%` (برتقالي EcoSmart) |
| `--primary-foreground` | `228 15% 8%` | `0 0% 100%` (أبيض) |
| `--ring` | `160 84% 39%` | `25 95% 53%` |
| `--sidebar-primary` | `160 84% 39%` | `25 95% 53%` |
| `--sidebar-ring` | `160 84% 39%` | `25 95% 53%` |

الألوان الدلالية (profit/loss/warning) تبقى كما هي — الأخضر للربح والأحمر للخسارة.

### 3. تحديث `gradient-text`

من `from-primary to-emerald-400` إلى `from-primary to-amber-400` ليتناسب مع البرتقالي.

### 4. استبدال كل `input type="date"` في 5 ملفات

الملفات المتأثرة:
- `src/pages/AddProduct.tsx` (2 حقول)
- `src/pages/Archive.tsx` (4 حقول — في AddPeriodForm و PeriodEditForm)
- `src/pages/ProductDetail.tsx` (2 حقول)
- `src/pages/Dashboard.tsx` (2 حقول)
- `src/pages/SyncedDataPage.tsx` (2 حقول)

### 5. تحسينات بصرية إضافية

- تحديث `chart-1` ليتوافق مع اللون البرتقالي الجديد
- تحديث ألوان الـ bottom tab bar النشطة

---

## الملفات المتأثرة

| ملف | تغيير |
|-----|--------|
| `src/components/ui/DatePickerField.tsx` | **جديد** — مكون التقويم المخصص |
| `src/index.css` | تحديث CSS variables للهوية البرتقالية |
| `src/pages/AddProduct.tsx` | استبدال input date بـ DatePickerField |
| `src/pages/Archive.tsx` | استبدال input date بـ DatePickerField |
| `src/pages/ProductDetail.tsx` | استبدال input date بـ DatePickerField |
| `src/pages/Dashboard.tsx` | استبدال input date بـ DatePickerField |
| `src/pages/SyncedDataPage.tsx` | استبدال input date بـ DatePickerField |

