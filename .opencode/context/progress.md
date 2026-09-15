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

---

## تسليم: frontend-dev — الجولة التعليمية المبسطة (features-tour.js)

### الملفات المنشأة/المعدلة
- `features-tour.js` (جديد): الجولة التعليمية المبسطة كاملة — نافذة ترحيب + 12 خطوة تفاعلية + إبراز العناصر + إعادة تشغيل

### الواجهات المتاحة للآخرين
- `TOUR_STEPS`: مصفوفة 12 خطوة `{target, title, desc, icon}` — تغطي كل التبويبات + زر الإضافة + المساعد
- `shouldShowTour()`: ترجع true إذا لم تُشاهد الجولة بعد (localStorage `STORAGE_KEY + "_tourDone"` غير موجود)
- `markTourDone()`: تحفظ انتهاء الجولة في localStorage
- `renderWelcomeModal()`: نافذة ترحيب أول استخدام — أيقونة + عنوان + زرا "ابدأ الجولة" و "تخطي"
- `startTour()`: تبدأ الجولة خطوة بخطوة (طبقة تغطية + فقاعة شرح + إبراز + زر التالي/إنهاء/تخطي)
- `restartTour()`: إعادة بدء الجولة (لزر المساعدة)
- علم الجاهزية: `window.FEATURES_TOUR_READY = true`

### القرارات المهمة
- **ES5 خالص**: بدون let/const/arrow/async/template literals
- **12 خطوة**: الترحيب (شاشة كاملة) + 9 تبويبات + زر الإضافة + المساعد — كل خطوة بإيقونة وعنوان وصف مبسط
- **إبراز ديناميكي**: حدود متوهجة حول العنصر المستهدف (box-shadow) + position:absolute يتبع موقع العنصر
- **فقاعة ذكية**: موقع تلقائي (فوق/أسفل/وسط) حسب موقع الهدف + منع التداخل مع حواف الشاشة
- **لا تعديل HTML**: كل العناصر تُنشأ بـ document.createElement وتُضاف لـ document.body
- **معيار STORAGE_KEY**: يتحقق `typeof STORAGE_KEY` قبل الاستخدام — يقع على "medReminder_v1" إذا لم يكن متاحاً
- **معالجة أخطاء**: try/catch في كل دالة + دوال مساعدة داخلية (_prefix) للتنظيم

### التحقق
- [x] `node --check features-tour.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال الـ 7 معرفة في النطاق العام (ALL_DEFINED: true)
- [x] `window.FEATURES_TOUR_READY === true`
- [x] ES5 خالص (0 let/const / 0 arrow / 0 template literals)
- [x] 12 خطوة في TOUR_STEPS (≥ 10 المطلوبة)

---

## تسليم: frontend-dev — المساعد الشخصي الذكي (features-assistant.js)

### الملفات المنشأة/المعدلة
- `features-assistant.js` (جديد): المساعد الشخصي الذكي — محلل أسئلة مربوط ببيانات المستخدم الفعلية + فقاعة دردشة كاملة
- `.opencode/context/progress.md` (معدل): إضافة قسم التسليم هذا

### الواجهات المتاحة للآخرين
- `personalAssistant(q)`: تحلل السؤال وتُرجع إجابة HTML من بيانات المستخدم الفعلية — 14 نمط إجابة
- `renderAssistantPanel()`: ترسم لوحة دردشة كاملة في `#assistantPanel` (رأس + منطقة رسائل + أزرار أسئلة سريعة + مدخل نص + زر إرسال)
- `openAssistantChat()`: تفتح لوحة الدردشة (تزيل hidden + ترسم إذا فارغة)
- `closeAssistantChat()`: تُخفي لوحة الدردشة
- `sendAssistantMessage()`: تقرأ المدخل → تضيف رسالة المستخدم → تستدعي personalAssistant → تعرض الرد
- `askAssistantQuick(q)`: تستدعيها الأزرار السريعة (تضع النص في المدخل وترسل)
- `ASSISTANT_QUICK_QUESTIONS`: مصفوفة 8 أسئلة سريعة جاهزة
- علم الجاهزية: `window.FEATURES_ASSISTANT_READY = true`

### أنماط الإجابة المدعومة (14 نمط)
1. عدد/قائمة الأدوية النشطة (active !== false) مع الجرعات والجرعات/يوم
2. أقرب جرعة قادمة اليوم (مقارنة times مع الوقت الحالي)
3. الالتزام اليومي من log (taken/total + نسبة مئوية)
4. تفاعلات الأدوية عبر DRUG_INTERACTIONS_DB (أزواج الأدوية النشطة)
5. آخر قراءة ضغط + تصنيفها عبر classifyBp
6. آخر 3 أعراض مسجلة
7. أقرب موعد طبيب قادم
8. أفراد العائلة + حساسياتهم + أمراضهم المزمنة
9. التطعيمات المتبقية والمنجزة
10. أدوية تنتهي خلال 30 يوماً عبر getExpiringMeds
11. أدوية تحتاج إعادة تعبئة (quantity <= refill)
12. معلومات عن دواء من getFullEncyclopedia
13. فحص الأعراض عبر symptomChecker
14. رد ذكي مقترح للأسئلة المتاحة (fallback)

### القرارات المهمة
- **ES5 خالص**: بدون let/const/arrow/async/template literals — متوافق مع المتصفحات القديمة
- **14 نمط إجابة**: كل نمط بتحية مناسبة + محتوى من بيانات المستخدم + نصيحة ختامية
- ** FTP — ترتيب الأنماط**: "تفاعلات" قبل "أدويتي" (حتى لا يلتقطها نمط العدد)، "تطعيمات" قبل "ما هي" (حتى لا يلتقطها نمط معلومات الدواء)
- **تعقيم شامل**: `_assistantEsc()` لكل قيمة تُحقن في HTML — تستخدم escapeHtml العامة إن وُجدت أو fallback يدوي
- **تنشئ حياً للعناصر**: زر الفقاعة العائم `#assistantFab` + لوحة `#assistantPanel` تُنشأ ديناميكياً إذا لم يُضفها القائد — لا تعديل HTML مطلوب
- **CSS منزّل عبر JS**: أنماط اللوحة تُحقن كـ `<style>` مرة واحدة — متوافقة مع متغيرات CSS (variables) في index.html
- ** TypeError**: كل دالة تبدأ بتحقق typeof للدوال الخارجية (escapeHtml, todayStr, formatTimeArabic, formatDateArabic, classifyBp, checkDrugInteractions, getExpiringMeds, symptomChecker, getFullEncyclopedia)
- **معالجة أخطاء**: try/catch في كل دالة عامة + `if (!el) return;` في دوال الرسم
- **مطابقة الأدوية المرنّة**: `_assistantNameMatch()` تجعل المطابقة جزئية (toContain) — تتوافق مع أسماء الأدوية العربية المختصرة

### التحقق
- [x] `node --check features-assistant.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال الـ 7 معرفة في النطاق العام (ALL_DEFINED: true)
- [x] `window.FEATURES_ASSISTANT_READY === true`
- [x] ES5 خالص (بدون let/const/arrow/async/template literals — التحقق بعد إزالة التعليقات)
- [x] اختبار وظيفي 15/15 في Node (vm): كل أنماط الإجابة الـ 14 + الرد الذكي