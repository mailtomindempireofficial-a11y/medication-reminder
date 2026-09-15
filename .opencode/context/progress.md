# Progress — تذكير الدواء v1.9

وثيقة حية يحدّثها كل وكيل بعد انتهاء عمله. القائد يقرأها للدمج.

---

## [قبل البدء] — القائد

- blueprint.md جاهز: 3 وحدات مستقلة (medical / health / sharing)
- كل وكيل يكتب ملفه فقط: features-medical.js / features-health.js / features-sharing.js
- ممنوع تعديل app.js أو index.html — القائد يدمج لاحقاً

---

## تسليم: frontend-dev — وحدة السلامة الطبية (features-medical.js)

### الملفات المنشأة/المعدلة
- `features-medical.js` (جديد): وحدة السلامة الطبية كاملة — بطاقة الطوارئ، حاسبة جرعات الأطفال، تنبيهات انتهاء الصلاحية، تنبيهات إعادة التعبئة
- `.opencode/context/progress.md` (معدل): إضافة قسم التسليم هذا

### الواجهات المتاحة للآخرين
- `renderEmergencyCard()`: ترسم بطاقة الطوارئ في `#emergencyCard` (حساسية، أمراض مزمنة، فصيلة دم، جهة اتصال، تأمين، ملاحظات)
- `saveEmergencyInfo()`: تقرأ `#emAllergies/#emChronic/#emBlood/#emContact/#emInsurance/#emNotes` → تحفظ في `appData.emergency` + `saveData()` + toast نجاح
- `shareEmergencyCard()`: تبني نصاً عربياً (بيانات الطوارئ + الأدوية النشطة) → `window.open("https://wa.me/?text=" + encodeURIComponent(text))`
- `calculateChildDose()`: تقرأ `#childWeight/#childDoseMgKg/#childConcentration/#childTimes` → تعرض الجرعة الواحدة/الحجم بالمل/الجرعة اليومية في `#childDoseResult` + تحذير إرشادي
- `getExpiringMeds()`: ترجع مصفوفة `{med, daysLeft}` للأدوية المنتهية خلال 30 يوماً (مرتبة تصاعدياً)
- `renderExpiryAlerts()`: ترسم في `#expiryAlerts` قائمة الأدوية المنتهية قريباً أو رسالة "لا توجد أدوية قريبة من الانتهاء ✅"
- `renderRefillAlerts()`: ترسم في `#refillAlerts` الأدوية التي `quantity <= refill` مع زر "تم إعادة التعبئة"
- `markRefilled(medId)`: تزيد الكمية إلى ضعف حد إعادة التعبئة وتحفظ + تعيد رسم التنبيهات
- `ensureEmergencyData()`: تهيئة آمنة لـ `appData.emergency` (دالة داخلية مساعدة)
- علم الجاهزية: `window.FEATURES_MEDICAL_READY = true`

### القرارات المهمة
- **ES5 خالص**: بدون let/const/arrow/async/template literals — متوافق مع المتصفحات القديمة (تحقق آلي: ES5_CHECK = true)
- **تهيئة آمنة**: `ensureEmergencyData()` تُستدعى في كل دالة تتعامل مع `appData.emergency` قبل القراءة/الكتابة
- **مقارنة التواريخ**: تحويل `expiry` (YYYY-MM-DD) إلى `Date` محلي مع تصفير الساعات، ومقارنة بالفروق بالمللي ثانية — يتجنب أخطاء المنطقة الزمنية
- **`active !== false`**: اعتبار الدواء نشطاً ما لم يُعلَّم صراحةً بـ `active: false` (توافق مع بيانات قديمة بلا حقل active)
- **تعقيم كل المدخلات**: `escapeHtml()` لكل قيمة تُحقن في HTML (أسماء الأدوية، الكميات، المعرّفات في onclick)
- **معالجة أخطاء**: try/catch في كل دالة + تحقق `if (!el) return;` في كل دالة رسم (قاعدة blueprint 7 و8)
- **لا مكتبات خارجية**: مشاركة واتساب عبر `wa.me` مباشرة

### التحقق
- [x] `node --check features-medical.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال الثماني معرفة في النطاق العام (ALL_DEFINED: true)
- [x] `window.FEATURES_MEDICAL_READY === true`
- [x] اختبار وظيفي: `getExpiringMeds()` ترجع 1 فقط (الصحيح)، `markRefilled('a')` ترفع الكمية 5 → 20، تهيئة `appData.emergency` تعمل
- [x] ES5 خالص (بدون let/const/arrow/async/template literals)

---

## تسليم: frontend-dev — وحدة الصحة والتحليل (features-health.js)

### الملفات المنشأة/المعدلة
- `features-health.js` (جديد): وحدة الصحة والتحليل كاملة — تتبع ضغط الدم، ربط الأعراض بالأدوية، خطط علاجية جاهزة

### الواجهات المتاحة للآخرين
- `classifyBp(sys, dia)`: تصنّف قراءة الضغط حسب جمعية القلب الأمريكية → ترجع `{label, color, advice}` بالعربية
- `addBpReading()`: تقرأ `#bpSys/#bpDia/#bpPulse` → تحقق → تحفظ في `appData.bpReadings` → `saveData()` → `renderBpTracker()`
- `renderBpChart()`: يرسم رسم بياني SVG خطي لآخر 14 قراءة (انقباضي أحمر + انبساطي أزرق) في `#bpChartArea`
- `renderBpTracker()`: ترسم في `#bpTracker` نموذج الإدخال + آخر قراءة مصنّفة + الرسم البياني + جدول آخر 10 قراءات
- `renderSymptomMedLink()`: ترسم في `#symptomMedLink` نموذج الربط (حقل + checkboxes الأدوية النشطة + زر حفظ) + سجل الإدخالات
- `addSymptomMedEntry()`: تقرأ `#symDesc` + الأدوية المحددة → تحفظ في `appData.symptomMeds` → `saveData()` → إعادة الرسم
- `renderTreatmentPlans()`: ترسم في `#treatmentPlans` بطاقات 5 خطط علاجية جاهزة (سكري، ضغط، كوليسترول، ربو، غدة درقية)
- `loadTreatmentPlan(id)`: تحوّل أدوية الخطة إلى كائنات كاملة وتضيفها إلى `appData.medications` → `saveData()` → `renderAll()` → toast
- علم الجاهزية: `window.FEATURES_HEALTH_READY = true`

### القرارات المهمة
- **ES5 خالص**: بدون let/const/arrow/async/template literals — متوافق مع المتصفحات القديمة
- **RBC classification**: تصنيف الضغط حسب جمعية القلب الأمريكية (ACC/AHA) — 5 مستويات: منخفض / طبيعي / مرتفع قليلاً / مرتفع / أزمة
- **SVG يدوي بدون مكتبات**: الرسم البياني يُبنى بالكامل بـ SVG + حساب الإحداثيات يدوياً (min/max dinâmico مع هامش ±10)
- **تهيئة آمنة**: كل مصفوفة جديدة تتحقق بـ `if (!appData.X) appData.X = [];` قبل أي عملية
- **5 خطط علاجية**: سكري النوع 2 / ارتفاع الضغط / الكوليسترول / الربو / قصور الدرقية — كل خطة تحتوي أدوية كاملة بجرعات وأوقات وأيام وملاحظات
- **تعقيم المدخلات**: `escapeHtml()` على كل قيمة تُحقن في HTML (أسماء، معرّفات في onclick)
- **معالجة أخطاء**: try/catch في كل دالة + تحقق `if (!el) return;` في كل دالة رسم

### التحقق
- [x] `node --check features-health.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال الثمانية معرفة في النطاق العام (ALL_DEFINED: true)
- [x] `window.FEATURES_HEALTH_READY === true`
- [x] ES5 خالص (بدون let/const/arrow/async/template literals)

---

## تسليم: frontend-dev — وحدة المشاركة والمزامنة (features-sharing.js)

### الملفات المنشأة/المعدلة
- `features-sharing.js` (جديد، ~345KB): وحدة المشاركة والمزامنة كاملة — مزامنة QR (تصدير/استيراد)، تقرير الطبيب، تفاعلات دواء-طعام
- `.opencode/context/progress.md` (معدل): إضافة قسم التسليم هذا

### الواجهات المتاحة للآخرين
- `qrExportData()`: تبني JSON من appData (medications, family, vitals, symptoms, appointments, vaccinations, emergency, bpReadings, symptomMeds) → encodeURIComponent → تولّد QR عبر `qrcode(0,"M")` → تعرض SVG في `#qrOutput` + زر تنزيل PNG + تحذير "يحتوي بيانات صحية حساسة"
- `downloadQrPng()`: تحوّل SVG → Image → canvas → toDataURL → رابط تحميل PNG
- `qrImportData()`: تفتح `#qrFileInput` (accept="image/*") → تقرأ الصورة → تفك QR عبر jsQR → decodeURIComponent → JSON.parse → `mergeQrData()` → saveData + renderAll + toast نجاح / "تعذر قراءة رمز QR"
- `mergeQrData(data)`: تدمج البيانات المستوردة في appData مع تهيئة آمنة لكل حقل (Array.isArray لكل مصفوفة)
- `generateDoctorReport()`: تبني تقريراً طبياً في `#doctorReport` (معلومات المريض من family[0] + جدول الأدوية + آخر 5 علامات حيوية + آخر 5 قراءات ضغط + آخر 5 أعراض + تنبيهات التفاعلات + تذييل) + زر طباعة
- `printDoctorReport()`: تفتح نافذة جديدة document.write + print (fallback إلى window.print)
- `checkFoodInteraction(drugName)`: تبحث في FOOD_INTERACTIONS (تطابق الاسم أو جزء منه) → ترجع مصفوفة النتائج
- `renderFoodInteractions()`: ترسم في `#foodInteractions` حقل بحث + زر + قائمة نتائج ملوّنة 🔴/🟡/🟢 + عرض تلقائي لتفاعلات أدوية المستخدم
- `searchFoodInteractions()`: تقرأ `#foodSearch` وتعرض النتائج في `#foodResults`
- `FOOD_INTERACTIONS`: مصفوفة ثابتة بـ 32 تفاعلاً (≥ 25) بصيغة `{drug, food, risk, advice}`
- علم الجاهزية: `window.FEATURES_SHARING_READY = true`

### القرارات المهمة
- **مكتبة توليد QR**: ادمجت `qrcode-generator` v1.4.4 (Kazuhiko Arase — MIT) كاملة في بداية الملف — ES5 خالص، تعمل Offline، تُعرّف `qrcode(typeNumber, errorCorrectionLevel)` مع `addData/make/createSvgTag/createDataURL`
- **مكتبة فك QR**: ادمجت `jsQR` v1.4.0 (MIT) كاملة (~256KB) — ES5 خالص (webpack bundle)، تعمل Offline، تُعرّف `jsQR(data, w, h)` عبر UMD (في المتصفح تُثبَّت على window.jsQR)
- **التحقق من الدمج**: اختبار دورة QR كاملة في Node (vm sandbox): توليد QR → تحويل الوحدات إلى RGBA → فك بـ jsQR → تطابق البيانات 100%
- **typeNumber = 0**: تفعيل الحجم التلقائي للـ QR لاستيعاب بيانات كبيرة (حتى ~3KB)
- **تهيئة آمنة للاستيراد**: كل حقل يُدمج فقط إذا كان `Array.isArray` (أو object للـ emergency) — لا يُفسد appData عند بيانات ناقصة
- **التفاعلات الدوائية في التقرير**: `buildInteractionAlerts()` تفحص أزواج الأدوية النشطة عبر `DRUG_INTERACTIONS_DB` و`DRUG_INTERACTIONS` (إن وُجدتا) — و`typeof checkDrugInteractions === "function"` يُستخدم كبوابة تحقق
- **ES5 خالص**: بدون let/const/arrow/async/template literals (تحقق آلي على كامل الملف: 0 مخالفة)
- **معالجة أخطاء**: try/catch في كل دالة + تحقق `if (!el) return;` في كل دالة رسم (قاعدة blueprint 7 و8)

### التحقق
- [x] `node --check features-sharing.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال الـ 13 معرفة في النطاق العام (ALL_DEFINED: true)
- [x] `window.FEATURES_SHARING_READY === true`
- [x] ES5 خالص على كامل الملف (0 arrow / 0 let/const / 0 template / 0 async)
- [x] اختبار وظيفي 27/27 في Node (vm): دورة QR كاملة encode→decode، دمج البيانات، تقرير الطبيب، تفاعلات الطعام، تصدير QR
- [x] `FOOD_INTERACTIONS` = 32 تفاعلاً (≥ 25 المطلوبة)