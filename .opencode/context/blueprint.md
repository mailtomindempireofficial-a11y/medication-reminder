# Blueprint: تذكير الدواء — الإصدار 1.9 (الميزات الكبيرة)

## الهدف
إضافة 12 ميزة كبيرة وضرورية لتطبيق تذكير الدواء العربي (PWA يعمل Offline First) عبر 3 وحدات JS مستقلة تُدمج لاحقاً.

## التقنيات
- Vanilla JS (ES5 متوافق مع المتصفحات القديمة) — لا مكتبات خارجية
- التخزين: localStorage عبر `saveData()` / `STORAGE_KEY`
- RTL عربي بالكامل

## بنية الملفات (المتفق عليها — لا تلمس app.js أو index.html)
```
تطبيق-تذكير-الدواء/
├── features-medical.js   ← الوكيل 1 (السلامة الطبية)
├── features-health.js    ← الوكيل 2 (الصحة والتحليل)
├── features-sharing.js   ← الوكيل 3 (المشاركة والمزامنة)
├── app.js                ← القائد يدمج لاحقاً (لا تلمسه)
└── index.html            ← القائد يدمج لاحقاً (لا تلمسه)
```

## نماذج البيانات (appData — موجودة في app.js)
```js
appData = {
  medications: [{ id, name, dosage, form, times:[], days:[], quantity, refill, notes, expiry, missedInstr, photo, category, courseTotal, memberId, active, log:{} }],
  family: [{ id, name, bloodType, allergies, chronic, color }],
  settings: { notifications: false },
  vitals: [], symptoms: [], appointments: [],
  contacts: { doctor, pharmacy, emergency },
  vaccinations: [], pin: "", tts: false, alertHistory: []
}
```

## دوال جاهزة للاستخدام (موجودة في app.js — استدعها فقط)
- `escapeHtml(str)` — تعقيم النصوص
- `uid()` — معرّف فريد
- `todayStr()` — تاريخ اليوم YYYY-MM-DD
- `formatDateArabic(date)` — تنسيق عربي
- `showToast(msg, type)` — إشعار (type: success/error)
- `saveData()` — حفظ appData
- `renderAll()` — إعادة رسم الواجهة

## أنماط CSS الجاهزة (استخدمها في HTML الذي تولّده)
`.report-card` `.vitals-card` `.btn` `.btn-primary` `.btn-outline` `.btn-block` `.section-title` `.badge` `.icon-btn` `.hidden` `.filter-row`

## قواعد صارمة لكل وكيل
1. اكتب ملفك فقط (`features-*.js`) — **ممنوع تعديل app.js أو index.html**
2. كل ملف يبدأ بـ `/* ===== [الوحدة] — الإصدار 1.9 ===== */`
3. كل دالة تُعرَّف بـ `function name() {}` (ES5 — بدون let/const/arrow/async)
4. لا مكتبات خارجية — كل شيء مدمج في الملف
5. عرّف علم جاهزية في نهاية الملف: `window.FEATURES_MEDICAL_READY = true;` (أو HEALTH/SHARING)
6. أي بيانات جديدة تُحفظ في appData عبر `saveData()` — مع تهيئة آمنة: `if (!appData.X) appData.X = [];`
7. كل دالة تبدأ بتحقق: `var el = document.getElementById("..."); if (!el) return;`
8. معالجة أخطاء try/catch في كل دالة تتعامل مع مدخلات المستخدم
9. لا تستخدم emoji في الكود إلا في نصوص الواجهة العربية
10. بعد الانتهاء: أضف تسليمك إلى `.opencode/context/progress.md` بالتنسيق الموحد

## عقود الواجهات (يجب أن تطابقها بالضبط — القائد سيربطها)

### الوحدة 1: features-medical.js (السلامة الطبية)
| الدالة | السلوك |
|---|---|
| `renderEmergencyCard()` | ترسم بطاقة الطوارئ في `#emergencyCard` (حساسية، أمراض مزمنة، فصيلة دم، جهة اتصال، تأمين) |
| `saveEmergencyInfo()` | تحفظ بيانات الطوارئ في `appData.emergency = { allergies, chronic, bloodType, emergencyContact, insurance, notes }` |
| `shareEmergencyCard()` | مشاركة واتساب لبطاقة الطوارئ كنص |
| `calculateChildDose()` | تقرأ `#childWeight` (كغ) + `#childDoseMgKg` (ملغ/كغ) + `#childConcentration` (ملغ/مل) → تعرض النتيجة في `#childDoseResult` |
| `getExpiringMeds()` | ترجع أدوية تنتهي خلال 30 يوماً |
| `renderExpiryAlerts()` | ترسم تنبيهات انتهاء الصلاحية في `#expiryAlerts` |
| `renderRefillAlerts()` | ترسم تنبيهات إعادة التعبئة (الكمية ≤ حد إعادة التعبئة) في `#refillAlerts` |

### الوحدة 2: features-health.js (الصحة والتحليل)
| الدالة | السلوك |
|---|---|
| `renderBpTracker()` | ترسم نموذج + قائمة + رسم بياني SVG لضغط الدم في `#bpTracker` |
| `addBpReading()` | تقرأ `#bpSys` + `#bpDia` + `#bpPulse` → تحفظ في `appData.bpReadings = [{date, sys, dia, pulse}]` |
| `classifyBp(sys, dia)` | ترجع تصنيفاً: طبيعي/مرتفع قليلاً/مرتفع/أزمة (حسب جمعية القلب الأمريكية) |
| `renderBpChart()` | رسم بياني SVG خطي لآخر 14 قراءة |
| `renderSymptomMedLink()` | ترسم ربط الأعراض بالأدوية في `#symptomMedLink` |
| `addSymptomMedEntry()` | تحفظ `appData.symptomMeds = [{date, symptom, meds:[أسماء الأدوية النشطة]}]` |
| `renderTreatmentPlans()` | ترسم خططاً علاجية جاهزة في `#treatmentPlans` |
| `loadTreatmentPlan(id)` | تحمّل خطة (سكري/ضغط/كوليسترول/ربو/غدة) كأدوية في appData.medications |

### الوحدة 3: features-sharing.js (المشاركة والمزامنة)
| الدالة | السلوك |
|---|---|
| `qrExportData()` | تولّد QR كود (مدمج — مكتبة qrcode-generator مدمجة في الملف) يحوي JSON البيانات → تعرضه في `#qrOutput` |
| `qrImportData()` | تفتح `#qrFileInput` → تقرأ صورة QR → تفك تشفيرها → تستورد البيانات |
| `generateDoctorReport()` | تولّد تقريراً طبياً منظماً (HTML) في `#doctorReport` + زر طباعة |
| `renderFoodInteractions()` | ترسم تفاعلات دواء-طعام في `#foodInteractions` |
| `checkFoodInteraction(drugName)` | ترجع تحذيرات الطعام لدواء معين |
| `FOOD_INTERACTIONS` | مصفوفة ثابتة ≥ 25 تفاعل دواء-طعام (وارفارين+فيتامين ك، ميتفورمين+كحول، ...) |

## التحقق لكل وكيل
- `node --check features-*.js` يجب أن ينجح (بدون أخطاء)
- كل دالة معرفة في النطاق العام (window)
- علم الجاهزية `window.FEATURES_*_READY === true`