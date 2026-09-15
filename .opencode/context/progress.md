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

---

## تسليم: frontend-dev — وضع كبار السن المبسّط + معالج الإعداد السريع (features-simple.js)

### الملفات المنشأة/المعدلة
- `features-simple.js` (جديد): الوحدة 1 من blueprint v2.1 — وضع كبار السن المبسّط (شاشة جرعة قادمة ضخمة + أزرار عملاقة) + معالج الإعداد السريع (3 خطوات)
- `.opencode/context/progress.md` (معدل): إضافة قسم التسليم هذا

### الواجهات المتاحة للآخرين
- `isSimpleMode()`: ترجع true إذا `localStorage[STORAGE_KEY+"_simpleMode"] === "1"`
- `setSimpleMode(on)`: تحفظ "1"/"0" + تضيف/تزيل class `simple-mode` من body + renderAll + renderSimpleHome + toast
- `toggleSimpleMode()`: تبديل الوضع
- `renderSimpleHome()`: ترسم في `#homeTab` (تنشئها ديناميكياً إن لم توجد) — عنوان "💊 جرعتك القادمة" + بطاقة ضخمة (اسم 2rem / وقت 3rem / جرعة) + زر "✅ أخذتها" (markDose) + "⏰ تأجيل 10 دقائق" (snoozeDose) + "🔊 أعد القراءة" (speakText أو SpeechSynthesis) + حالة فارغة "لا توجد أدوية اليوم 🎉" + زر "➕ إضافة دواء" (openMedModal) + قراءة صوتية تلقائية عند تفعيل tts
- `renderSimpleModeToggle()`: بطاقة مفتاح "🧓 وضع كبار السن" في `#settingsSection` (ترجع بصمت إن لم يوجد)
- `shouldShowQuickSetup()`: true إذا لا أدوية و `STORAGE_KEY+"_setupDone"` غير موجود
- `markSetupDone()`: تحفظ `STORAGE_KEY+"_setupDone" = "1"`
- `startQuickSetup()`: نافذة 3 خطوات — (1) اسم الدواء (2) أوقات: صباحاً 8:00 / ظهراً 13:00 / مساءً 20:00 + تخصيص (3) عدد المرات: مرة/مرتين/3 مرات → ينشئ الدواء ببنية appData كاملة + saveData + markSetupDone + renderAll + toast
- `renderQuickSetupModal()`: تعادل startQuickSetup (واجهة القائد)
- علم الجاهزية: `window.FEATURES_SIMPLE_READY = true`

### القرارات المهمة
- **ES5 خالص**: بدون let/const/arrow/async/template literals (تحقق آلي: 0 مخالفة)
- **`#homeTab` تُنشأ ديناميكياً**: غير موجودة في index.html → `_simpleEnsureHomeTab()` تنشئها كأول عنصر في `<main>` (نمط features-assistant.js) — القائد لا يحتاج تعديل HTML
- **CSS يُحقن عبر JS**: `_simpleInjectStyles()` مرة واحدة — `body.simple-mode` يخفي الشريط السفلي/الـ fab/أقسام الرئيسية ويعرض `#homeTab` فقط (بلا تعديل index.html)
- **حماية كل استدعاء خارجي**: typeof-check لكل دوال app.js (renderAll, saveData, markDose, snoozeDose, openMedModal, uid, getTodayDoses, timeToMinutes, nowTime, todayStr, escapeHtml, showToast) مع fallbacks داخلية — الملف يعمل حتى لو حُمّل قبل app.js
- **الجرعة القادمة**: `_simpleGetNextDose()` تختار أول جرعة غير مأخوذة بوقت ≥ الآن، وإلا أول جرعة فائتة غير مأخوذة، وإلا null (كل الجرعات أُخذت)
- **توزيع المرات**: عند اختيار "مرتين" من 3 أوقات مختارة → تُرتَّب الأوقات وتُؤخذ الأولى فقط (مرة واحدة → الأولى، 3 مرات → كلها)؛ بلا اختيار → افتراضيات 8:00 / 8:00+20:00 / 8:00+13:00+20:00
- **معالجة أخطاء**: try/catch في كل دالة عامة + `if (!el) return;` في دوال الرسم (قاعدة blueprint 7 و8)
- **تعقيم المدخلات**: `_simpleEsc()` (تستخدم escapeHtml العامة إن وُجدت) لكل قيمة تُحقن في HTML

### التحقق
- [x] `node --check features-simple.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال الـ 9 العامة معرفة (ALL_DEFINED: true)
- [x] `window.FEATURES_SIMPLE_READY === true`
- [x] ES5 خالص (0 let/const / 0 arrow / 0 template literals / 0 async)
- [x] اختبار وظيفي 15/15 في Node (vm): isSimpleMode (افتراضي/تفعيل/تبديل)، shouldShowQuickSetup (جديد/بعد الإنهاء/مع أدوية)، إنشاء دواء ببنية صحيحة (times=["08:00","13:00"] لـ "مرتين")، اختيار الجرعة القادمة (13:00 عند 10:00)، تسجيل markDose، رسم الشاشة في 3 حالات (أدوية/كلها مأخوذة/فارغة)

---

## تسليم: frontend-dev — تحسين التحكم الصوتي (features-voice.js)

### الملفات المنشأة/المعدلة
- `features-voice.js` (جديد): وحدة التحكم الصوتي الكاملة — أوامر صوتية (إضافة دواء، تسجيل جرعة، عرض الجرعة القادمة، فحص الأعراض، مساعدة) + استماع مستمر + نطق عربي
- `.opencode/context/progress.md` (معدل): إضافة قسم التسليم هذا

### الواجهات المتاحة للآخرين
- `VOICE_COMMANDS`: مصفوفة 7 أوامر `{cmd, example, desc}` — "أضف دواء"، "خذ دوائي"، "أخذت"، "أين دوائي"، "الجرعة القادمة"، "أشعر بـ"، "مساعدة"
- `startVoiceCommand()`: تبدأ الاستماع (webkitSpeechRecognition، lang "ar-SA"، interimResults false، continuous true) — تتحقق من الدعم وإلا toast "المتصفح لا يدعم التعرف الصوتي" — onresult → processVoiceCommand، onerror → toast مخصص (not-allowed/no-speech/network)، onend → إعادة تشغيل تلقائية كل 300ms — مؤشر بصري "🎤 جارٍ الاستماع..." (عنصر ديناميكي بنبض CSS)
- `stopVoiceCommand()`: توقف الاستماع + تزيل المؤشر + toast "⏹ تم إيقاف الاستماع"
- `processVoiceCommand(text)`: تحليل النص (تطبيع: lowercase + إزالة تشكيل \u064B-\u065F) — "أضف/اضف دواء X" → openMedModal + تعبئة الاسم، "خذ/أخذت" → تسجيل الجرعة القادمة عبر markDose، "أين/الجرعة القادمة/متى" → عرض الجرعة القادمة، "أشعر/اشعر" → symptomChecker، "مساعدة/ساعدني" → عرض الأوامر، غير معروف → "لم أفهم الأمر. قل: مساعدة لمعرفة الأوامر"
- `speakText(text)`: نطق عربي (SpeechSynthesisUtterance، lang "ar-SA"، rate 0.95، اختيار صوت عربي voices.filter lang.indexOf("ar")===0) — تتحقق من window.speechSynthesis وإلا return
- `renderVoiceHelp()`: ترسم بطاقة "🎤 الأوامر الصوتية" في `#homeTab` (أو `#settingsSection` إن لم يوجد) — قائمة الأوامر + زر "🎤 ابدأ الاستماع" + زر "⏹ إيقاف" — idempotent (لا تكرر البطاقة)
- علم الجاهزية: `window.FEATURES_VOICE_READY = true`

### القرارات المهمة
- **ES5 خالص**: بدون let/const/arrow/async/template literals (تحقق آلي بعد إزالة التعليقات: 0 مخالفة)
- **openMedModal("") + تعبئة #medName**: دالة openMedModal في app.js تقبل معاملاً واحداً فقط (id) — فبدلاً من openMedModal("", name) نفتح النافذة ثم نضع الاسم في حقل #medName لتحقيق نفس السلوك المطلوب
- **مطابقة مرنة للهمزة**: التعرف الصوتي قد يُرجع "اضف" بدون همزة — نطابق "أضف" و"اضف" معاً (وكذلك "أشعر"/"اشعر")
- **استماع مستمر مزدوج**: rec.continuous = true + إعادة تشغيل تلقائية في onend (مع تأخير 300ms وتحقّق _voiceListening/_voiceRecognition لمنع إعادة التشغيل بعد الإيقاف)
- **الجرعة القادمة الذكية**: تبحث أولاً عن أول جرعة غير مأخوذة بوقت ≥ الآن، فإن لم توجد تعود لأول جرعة غير مأخوذة (fallback)
- **تطبيع النص**: lowercase + إزالة التشكيل (\u064B-\u065F، \u0670، \u0640) + توحيد المسافات — يتحمل اختلافات نطق المتكلم
- **تعقيم المدخلات**: `_voiceEsc()` (تستخدم escapeHtml العامة أو fallback يدوي) لكل قيمة تُحقن في HTML
- **معالجة أخطاء**: try/catch في كل دالة عامة + typeof check لكل دالة خارجية (getTodayDoses, markDose, symptomChecker, openMedModal, renderToday, updateSummary, todayStr, timeToMinutes, escapeHtml)
- **لا تعديل startVoiceInput**: أضفت دوالاً جديدة فقط (قاعدة blueprint)
- **لا مكتبات خارجية**: Web Speech API + SpeechSynthesis API فقط

### التحقق
- [x] `node --check features-voice.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال الـ 6 العامة معرفة (VOICE_COMMANDS, startVoiceCommand, stopVoiceCommand, processVoiceCommand, speakText, renderVoiceHelp)
- [x] `window.FEATURES_VOICE_READY === true`
- [x] ES5 خالص (0 let/const / 0 arrow / 0 async / 0 template literals — بعد إزالة التعليقات)
- [x] اختبار وظيفي 25/25 في Node (vm): إضافة دواء بالاسم، تسجيل الجرعة القادمة، عرض الجرعة، فحص الأعراض، المساعدة، الأمر غير المعروف، التطبيع (تشكيل/lowercase)، عدم دعم المتصفح، رسم بطاقة المساعدة

---

## تسليم: frontend-dev — وضع الأطفال (features-kids.js)

### الملفات المنشأة/المعدلة
- `features-kids.js` (جديد): وضع الأطفال الكامل — نجوم + شخصية كرتونية + سلسلة أيام + شاشة ملونة مبسطة + مفتاح تبديل
- `.opencode/context/progress.md` (معدل): إضافة قسم التسليم هذا

### الواجهات المتاحة للآخرين
- `KIDS_MASCOTS`: مصفوفة 6 شخصيات ["🐻","🐱","🦊","🐰","🐼","🦁"]
- `KIDS_COLORS`: مصفوفة 6 ألوان خلفية ناعمة ["#dbeafe","#dcfce7","#fef9c3","#fce7f3","#ede9fe","#ffedd5"]
- `isKidsMode()`: ترجع true إذا `localStorage[STORAGE_KEY+"_kidsMode"] === "1"`
- `toggleKidsMode()`: تبديل الوضع + renderAll + showToast (يختار شخصية عشوائية عند التفعيل)
- `getStarsForToday()`: عدد الجرعات المأخوذة اليوم عبر isDoseTaken لكل دواء نشط × كل وقت
- `getStreak()`: الأيام المتتالية (من اليوم للخلف) التي أُخذت فيها كل الجرعات المستحقة — توقف عند أول يوم ناقص
- `getKidsMessage(stars)`: رسالة تشجيع عشوائية (0 → "ابدأ يومك! أنت بطل 💪" / 1-2 → "أحسنت! استمر! 🎉" / 3+ → "ممتاز! أنت نجم! ⭐⭐⭐")
- `renderKidsHome()`: شاشة ملونة في #homeTab — شخصية بحجم 5rem + رسالة + عداد "⭐ x N" + "🔥 N أيام متتالية" + بطاقات جرعات ملونة بزر ضخم "✅ أخذتها" (markDose + إعادة رسم) أو "✔ تم" رمادي
- `renderKidsModeToggle()`: مفتاح تبديل في #settingsSection (بطاقة "🎮 وضع الأطفال" + وصف + زر تبديل) — ترجع بدون خطأ إن لم يوجد #settingsSection
- `renderKidsModeToggleIn(container)`: دالة مساعدة داخلية لإعادة استخدام بطاقة التبديل (تُستدعى أيضاً أسفل شاشة الأطفال)
- علم الجاهزية: `window.FEATURES_KIDS_READY = true`

### القرارات المهمة
- **ES5 خالص**: بدون let/const/arrow/async/template literals (تحقق آلي: 0 مخالفة)
- **شخصية ثابتة في الجلسة**: `_kidsMascotSession` تُختار عشوائياً عند التفعيل وتبقى ثابتة حتى إعادة التفعيل (اتساق التجربة للطفل)
- **CSS منزّل عبر JS**: أنماط وضع الأطفال تُحقن كـ `<style>` مرة واحدة داخل #homeTab — لا تعديل على index.html (قاعدة blueprint 51)
- **تعقيم المدخلات**: `_kidEsc()` تستخدم escapeHtml العامة إن وُجدت أو fallback يدوي — أسماء الأدوية والمعرّفات تُعقّم قبل الحقن
- **معالجة أخطاء**: try/catch في كل دالة + تحقق `if (!el) return;` في دوال الرسم + تحقق typeof للدوال الخارجية (isDoseTaken, markDose, todayStr, renderAll, showToast, escapeHtml)
- **الاعتماد على appData فقط**: لا بيانات جديدة تُحفظ — كل القراءة من appData.medications و med.log عبر isDoseTaken
- **زر "✅ أخذتها"**: يستدعي markDose(medId, time, today, true) ثم renderAll — يعيد رسم الشاشة فوراً مع النجمة الجديدة

### التحقق
- [x] `node --check features-kids.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال الـ 10 معرفة في النطاق العام (ALL_DEFINED: true)
- [x] `window.FEATURES_KIDS_READY === true`
- [x] ES5 خالص (0 let/const / 0 arrow / 0 template literals)
- [x] `KIDS_MASCOTS` = 6 شخصيات، `KIDS_COLORS` = 6 ألوان (مطابقة للطلب)

---

## تسليم: frontend-dev — وضع المرأة (features-women.js)

### الملفات المنشأة/المعدلة
- `features-women.js` (جديد): وضع المرأة الكامل — تتبع الدورة الشهرية + توقع الدورة القادمة + تذكير حبوب منع الحمل + مفتاح تبديل
- `.opencode/context/progress.md` (معدل): إضافة قسم التسليم هذا

### الواجهات المتاحة للآخرين
- `isWomenMode()`: ترجع true إذا `localStorage[STORAGE_KEY+"_womenMode"] === "1"`
- `toggleWomenMode()`: تبديل الوضع + renderAll + renderWomenModeToggle + renderWomenSection + showToast
- `addPeriodEntry(date)`: تضيف {date, flow: "متوسط"} إلى appData.periods (تهيئة آمنة + منع التكرار) + saveData + المفتاح الخاص + إعادة رسم تتبع الدورة
- `deletePeriodEntry(date)`: تحذف سجل الدورة بالتاريخ + saveData + المفتاح الخاص + إعادة رسم
- `predictNextPeriod()`: تحسب متوسط الفرق بين آخر 3 تواريخ (UpTo 3 last dates) + تضيفه لآخر تاريخ → ترجع Date أو null إن كان أقل من تاريخين
- `renderPeriodTracker()`: ترسم بطاقة في `#womenSection` — زر "➕ تسجيل اليوم" + آخر 5 دورات (تاريخ + حذف) + توقع الدورة القادمة مع الأيام المتبقية
- `addPillReminder(time)`: تحفظ {time, lastTaken: "", streak: 0} في appData.pillReminder + saveData + المفتاح الخاص
- `promptPillReminder()`: تطلب الوقت عبر window.prompt + تحقق من HH:MM + تستدعي addPillReminder
- `markPillTaken()`: تسجل lastTaken = todayStr() + streak++ + saveData + المفتاح الخاص (تمنع التكرار اليومي)
- `renderPillReminder()`: ترسم بطاقة في `#womenSection` — "💊 حان وقت حبوبك [الوقت]" + زر "✅ أخذتها" + "🔥 سلسلة: N يوم" + تنبيه النسيان/التسجيل
- `renderWomenSection()`: ترسم القسم الكامل في `#womenSection` — عنوان "🌸 صحة المرأة" + تتبع الدورة + تذكير الحبوب + نصائح
- `renderWomenModeToggle()`: ترسم مفتاح تبديل في `#settingsSection` — بطاق "🌸 وضع المرأة" + زر تبديل (idempotent)
- علم الجاهزية: `window.FEATURES_WOMEN_READY = true`

### القرارات المهمة
- **ES5 خالص**: بدون let/const/arrow/async/template literals (تحقق آلي: 0 مخالفة)
- **مزامنة مزدوجة للبيانات**: `_womenPersist()` تستدعي saveData() (عقد الواجهة) + تكتب في `STORAGE_KEY + "_womenData"` — السبب: loadData() في app.js لا يستعيد appData.periods/pillReminder من localStorage (قائمة بيضاء محددة فقط)، فبدون المفتاح الخاص تُفقد البيانات عند إعادة التحميل
- **تهديد JSON**: `_womenLoadData()` تُستدعى في DOMContentLoaded + في renderWomenSection — تحمي من فقدان البيانات إذا استُدعي renderWomenSection قبل التحميل الأولي
- **منع التكرار**: addPeriodEntry يتحقق من عدم تكرار التاريخ، markPillTaken يتحقق من lastTaken !== todayStr()
- **เตือน نسيان ذكي**: renderPillReminder تميّز بين: أخذت اليوم ✅ / لم تسجلي بعد (منشأ جديد) ⚠️ / نسيت حبوبك ⚠️ — رسائل مختلفة لكل حالة
- **تنبؤ بآخر 3 فقط**: predictNextPeriod تأخذ آخر 3 دورات (UpTo 3) لتقليل تأثير الدورات غير المنتظمة القديمة
- **حاويات فرعية**: renderPeriodTracker/renderPillReminder يستخدمان `_womenContainer()` لإنشاء #periodTrackerCard/#pillReminderCard داخل #womenSection — تسمح بإعادة رسم مستقلة بدون حذف محتوى الآخر
- **مفتاح تبديل idempotent**: renderWomenModeToggle يتحقق من وجود womenModeSwitch وحدّث فئة on فقط (بدون تكرار البطاقة)
- **حماية من المتصفح**: التهيئة مسجلة بـ typeof document !== "undefined" — آمنة في Node
- **معالجة أخطاء**: try/catch في كل دالة عامة + تحقق `if (!el) return;` في دوال الرسم + `typeof X === "function"` لكل دالة خارجية

### التحقق
- [x] `node --check features-women.js` — نجح بدون أخطاء (SYNTAX_OK)
- [x] كل الدوال العشرون معرفة في النطاق العام (ALL_DEFINED: true)
- [x] `window.FEATURES_WOMEN_READY === true`
- [x] ES5 خالص (0 let/const / 0 arrow / 0 async / 0 template literals)
- [x] اختبار وظيفي 39/39 في Node (vm): isWomenMode، toggleWomenMode، addPeriodEntry (3 إضافات)، منع التكرار، حفظ المفتاح الخاص، deletePeriodEntry، predictNextPeriod (3 تواريخ + date + null مع تاريخ واحد + آخر 3 فقط)، addPillReminder، markPillTaken (+ منع التكرار اليومي)، renderWomenSection (عنوان + نصائح)، renderPeriodTracker (زر + توقع + أيام متبقية)، renderPillReminder (سلسلة + تنبيه نسيان + زر إعداد)، renderWomenModeToggle (بطاقة + لا تكرار + تحديث حالة + بدون حاوية)

---

## تسليم: frontend-dev — التحسينات الكبرى الأربعة (لوحة الأدوات + المساعد + الدليل + الأيقونة)

### الملفات المنشأة/المعدلة
- `features-tools.js` (جديد): لوحة الأدوات المنظمة (Tools Hub) — 8 فئات ألوان + بحث + بطاقات مرتبة + CSS منزّل عبر JS + أزرار سريعة
- `features-encyclopedia.js` (جديد): البحث المرتب في دليل الأدوية — شاشة ترحيب عند حقل فارغ (تصنيفات + الأكثر شيوعاً + الأكثر مشاهدة) + نتائج مرتبة بالصلة فور الكتابة + تتبع المشاهدات في localStorage
- `features-assistant.js` (معدّل): ربط المساعد بالبيانات — إصلاح التطعيمات من VACCINE_SCHEDULE، آخر قراءات شاملة (ضغط/سكر/وزن)، الالتزام الشهري، أنماط بحث جديدة ("ابحث عن"، "جرعتي"، "قراءاتي"، "التزامي الشهري"، "أحتاج تعبئة")، توسيع الأسئلة السريعة إلى 12
- `index.html` (معدّل): زر "🧰 الأدوات" في الشريط السفلي + `<script>` لـ features-tools.js و features-encyclopedia.js + CSS لزر الأدوات + رابط icon-512.png للفافيكون
- `manifest.json` (معدّل): أيقونة maskable منفصلة `maskable-512.png` + فصل purpose إلى "any" و "maskable"
- `icons/icon-192.png` (مُولّد): أيقونة تركوازية 192×192 بتصميم كبسولة بيضاء على خلفية متدرجة #0d9488→#0f766e
- `icons/icon-512.png` (مُولّد): أيقونة تركوازية 512×512 بنفس التصميم
- `icons/maskable-512.png` (مُولّد): نسخة maskable بكبسولة أصغر (36% من الحجم) لضمان المنطقة الآمنة 80%

### الواجهات المتاحة للآخرين
- `openToolsHub()`: تفتح لوحة الأدوات كنافذة overlay كاملة مع 8 فئات + بحث
- `closeToolsHub()`: تُغلق اللوحة
- `renderToolsHub()`: ترسم محتوى اللوحة (تصنيفات + بطاقات + أزرار سريعة)
- `_toolsRunCard(action, target)`: تتعامل مع إجراءات البطاقات (فتح تبويب / مساعد / صوت)
- `_encyTrackClick(arName)`: تسجل مشاهدة دواء في localStorage
- `_encyOpenDetails(arName)`: تفتح تفاصيل دواء + تتبع المشاهدة
- `window.FEATURES_TOOLS_READY = true`
- `window.FEATURES_ENCYCLOPEDIA_READY = true`

### التحديثات على features-assistant.js
- إصلاح `_assistantVaccinations`: تقرأ VACCINE_SCHEDULE (الجدول الكامل) و appData.vaccinations (المسجلة) بدلاً من فحص v.done === true
- إضافة `_assistantAllVitals`: آخر قراءة لكل نوع (bp/sugar/weight) من appData.vitals
- إضافة `_assistantMonthlyAdherence`: نسبة الالتزام خلال 30 يوماً من med.log + سلسلة الأيام + أيام كاملة/ناقصة/فائتة
- توسيع ASSISTANT_QUICK_QUESTIONS إلى 12 سؤالاً
- نمط "ابحث عن/ابحث لي عن" → _assistantDrugInfo
- نمط "جرعتي/الجرعة القادمة/الnext dose" → _assistantNextDose
- نمط "قراءاتي/آخر قياسات" → _assistantAllVitals
- نمط "التزامي الشهري" → _assistantMonthlyAdherence
- تحسين _assistantWelcome لتعكس كل الإمكانيات الجديدة

### القرارات المهمة
- **8 فئات (لبطلب المستخدم)**: اعتمدنا 8 فئات (而非 blueprint's 4) لأن الطلب الأخير هو الأدق: 🩺 القياسات والأعراض / 📊 التقارير / 🛡️ السلامة والصلاحية / 💉 التطعيمات / 👨👩👧 العائلة / 📚 الدليل والبحث / 🤖 المساعد الذكي / ⚙️ الإعدادات
- **عدم تعديل app.js**: استخدمنا نمط "إعادة التعريف اللاحق" — features-encyclopedia.js تُحمَّل بعد app.js في redefine renderEncyclopedia
- **توليد PNG برمجياً**: Node script يستخدم zlib فقط (built-in) — لا مكتبات خارجية — encoder PNG بدائي: signature + IHDR + deflate scanlines + IEND مع CRC32
- **أيقونة maskable منفصلة**: manifest.json يolo "any" و "maskable" منفصلين لضمان عرض صحيح على جميع المنصات
- **تتبع المشاهدات**: localStorage key `medReminder_v1_encyRecent` — مصفوفة أسماء عربية (حد أقصى 8) تُحدَّث عند كل نقر
- **ترتيب البحث حسب الصلة**: 6 مستويات (اسم عربي يبدأ → اسم إنجليزي يبدأ → اسم عربي يحتوي → اسم إنجليزي يحتوي → علامة تجارية → تصنيف)

### التحقق
- [x] `node --check` لـ features-tools.js و features-encyclopedia.js و features-assistant.js و app.js و drugdb.js و drug-interactions.js — كلها نجحت (ALL_SYNTAX_OK)
- [x] أيقونة 192×192: التوقيع صحيح، الزاوية #0d9488، المركز #ccfbf1 (خط الكبسولة) — dimensions=192x192, bytes=15548
- [x] أيقونة 512×512: التوقيع صحيح، نفس الألوان — dimensions=512x512, bytes=36142
- [x] أيقونة maskable-512: مُولّدة بنجاح (bytes=36253) — كبسولة 36% من الحجم ضمن المنطقة الآمنة
- [x] index.html: زر الأدوات موجود (line 1620)، سكربتات موجودة (lines 2021-2022)، favicon محدّث (line 15)
- [x] manifest.json: 3 أيقونات (any 192, any 512, maskable 512)

### ما لم يُنجز (إن وجد)
- [x] لا شيء — كل المهام مكتملة

---