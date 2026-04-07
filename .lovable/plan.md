

# تحليل شامل — صفحة إضافة منتج جديد (AddProduct)

---

## الأخطاء المكتشفة

### 1. لا يوجد تحقق من صحة البيانات (Critical — Logic)

**المشكلة:** كل الحقول الرقمية تُحوّل بـ `Number(x) || 0` — أي أن المستخدم يمكنه إرسال نموذج بكل القيم = 0 (سعر بيع 0، طلبات 0). هذا يُنشئ منتج بدون بيانات مفيدة ويُفسد التحليلات.

**الحل:**
- إلزام `sellingPrice > 0` و `purchasePrice > 0` كحد أدنى
- تحذير (وليس منع) إذا كانت الطلبات = 0
- عرض رسائل خطأ واضحة تحت كل حقل

### 2. لا يوجد تحقق منطقي بين الحقول (Critical — Logic)

**المشكلة:** يمكن إدخال `deliveredOrders > confirmedOrders` أو `confirmedOrders > receivedOrders` — وهذا مستحيل واقعياً. محرك الحسابات يحسب `returnedOrders = confirmed - delivered`، فإذا كان `delivered > confirmed` يُصبح المرتجع سالباً → حسابات خاطئة.

**الحل:**
- تحقق: `receivedOrders >= confirmedOrders >= deliveredOrders`
- عرض تحذير فوري عند الإدخال إذا كانت العلاقة مخالفة
- منع الإرسال إذا كان التسلسل خاطئ

### 3. `dateTo` يمكن أن يكون قبل `dateFrom` (Medium — Logic)

**المشكلة:** لا يوجد تحقق من أن تاريخ النهاية بعد تاريخ البداية. كلاهما يبدأ بتاريخ اليوم مما يعني فترة = يوم واحد دائماً كافتراضي.

**الحل:** تحقق `dateTo >= dateFrom` عند الإرسال + تنبيه

### 4. `deliveryDiscount` غامض المعنى (Medium — UX)

**المشكلة:** في `calculations.ts` السطر 10-11:
```
deliveryDiscountExpenses = deliveryDiscount × deliveredOrders
confirmationAndDeliveryExpenses = (confirmationCost + deliveryDiscount + packagingCost) × deliveredOrders
```
أي أن `deliveryDiscount` هنا هو **لكل طلب**. لكن في صفحة المزامنة EcoSmart، التخفيض يأتي **إجمالي** ويُقسم على المسلّمة. الـ placeholder يقول "تخفيض التوصيل (د.ج)" بدون توضيح هل هو لكل طلب أم إجمالي.

**الحل:** تغيير الـ label إلى "تخفيض التوصيل / طلب (د.ج)" وإضافة tooltip يشرح

### 5. تكرار `deliveryDiscount` في الحسابات (Critical — Calculation)

**المشكلة:** في `calculations.ts`:
- سطر 10: `deliveryDiscountExpenses = deliveryDiscount × deliveredOrders`
- سطر 11: `confirmationAndDeliveryExpenses = (confirmationCost + deliveryDiscount + packagingCost) × deliveredOrders`
- سطر 12: `totalExpenses = adSpendDZD + returnExpenses + operationExpenses + confirmationAndDeliveryExpenses`

`deliveryDiscount` يُحسب مرتين! مرة في `deliveryDiscountExpenses` (لا يُستخدم في totalExpenses) ومرة داخل `confirmationAndDeliveryExpenses`. الحساب الفعلي سليم لأن `deliveryDiscountExpenses` لا يدخل في `totalExpenses`، لكن وجوده كمتغير منفصل مُضلّل — يبدو وكأنه محسوب مرتين.

**الحل:** حذف `deliveryDiscountExpenses` كمتغير منفصل أو توضيح أنه للعرض فقط

### 6. لا يوجد معاينة فورية للحسابات (High — UX)

**المشكلة:** المستخدم يدخل 10 حقول ويضغط "إضافة" ثم يذهب للأرشيف ليرى النتائج. لا يعرف الربح المتوقع قبل الحفظ.

**الحل:** إضافة قسم "معاينة سريعة" أسفل النموذج يعرض:
- الربح الصافي المتوقع
- نسبة التأكيد
- نسبة التوصيل
- تنبيهات (إن وجدت)
يتحدث تلقائياً مع كل تغيير في الحقول

### 7. لا يوجد تجميع بصري للحقول (Medium — UI)

**المشكلة:** 8 حقول في grid واحد بدون تقسيم منطقي. المستخدم لا يفهم العلاقة بين الحقول.

**الحل:** تقسيم إلى 3 مجموعات:
- **الأسعار:** سعر الشراء + سعر البيع
- **الطلبات:** المستلمة + المؤكدة + الواصلة
- **المصاريف:** مصاريف إعلان + تخفيض توصيل + تكلفة تغليف

### 8. قيم سلبية مقبولة (Low — Edge Case)

**المشكلة:** `type="number"` يقبل أرقام سالبة. سعر شراء = -100 أو طلبات = -5 لا معنى لهما.

**الحل:** إضافة `min="0"` لكل الحقول الرقمية

---

## خطة التنفيذ

### Phase 1: إصلاحات في `AddProduct.tsx`

| التغيير | التأثير |
|---------|---------|
| تحقق من صحة البيانات: `sellingPrice > 0`, `purchasePrice > 0` | منع بيانات فارغة |
| تحقق منطقي: `received >= confirmed >= delivered` مع رسائل خطأ | منع حسابات خاطئة |
| تحقق `dateTo >= dateFrom` | منع فترات مقلوبة |
| إضافة `min="0"` لكل الحقول | منع قيم سالبة |
| تقسيم الحقول لـ 3 مجموعات بعناوين | وضوح بصري |
| تغيير label تخفيض التوصيل إلى "/ طلب" | إزالة الغموض |

### Phase 2: معاينة فورية في `AddProduct.tsx`

| التغيير | التأثير |
|---------|---------|
| قسم معاينة يعرض الربح + النسب تلقائياً | المستخدم يرى النتيجة قبل الحفظ |
| تلوين (أخضر/أحمر) حسب الربح | قرار سريع |

### Phase 3: تنظيف `calculations.ts` (اختياري)

| التغيير | التأثير |
|---------|---------|
| حذف أو توضيح `deliveryDiscountExpenses` | إزالة الالتباس |

### الملفات المتأثرة

| ملف | تغيير |
|-----|--------|
| `src/pages/AddProduct.tsx` | تحقق + تجميع بصري + معاينة فورية |
| `src/lib/calculations.ts` | تنظيف (Phase 3) |

