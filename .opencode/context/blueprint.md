# Blueprint: تذكير الدواء — الإصدار 2.0 (المساعد الشخصي + الجولة التعليمية)

## الهدف
1. مساعد شخصي ذكي مربوط بكل بيانات المستخدم + فقاعة دردشة في الرئيسية
2. جولة تعليمية مبسطة تشرح التطبيق كاملاً لأي مستخدم

## التقنيات
- Vanilla JS (ES5) — لا مكتبات خارجية
- التخزين: localStorage عبر `saveData()` / `STORAGE_KEY`
- RTL عربي بالكامل

## بنية الملفات (المتفق عليها — لا تلمس app.js أو index.html)
```
تطبيق-تذكير-الدواء/
├── features-assistant.js   ← الوكيل 1 (المساعد الشخصي + فقاعة الدردشة)
├── features-tour.js        ← الوكيل 2 (الجولة التعليمية)
├── features-medical.js     ← موجود (لا تلمسه)
├── features-health.js      ← موجود (لا تلمسه)
├── features-sharing.js     ← موجود (لا تلمسه)
├── app.js                  ← القائد يدمج لاحقاً (لا تلمسه)
└── index.html              ← القائد يدمج لاحقاً (لا تلمسه)
```

## نماذج البيانات (appData — موجودة في app.js)
```js
appData = {
  medications: [{ id, name, dosage, form, times:[], days:[], quantity, refill, notes, expiry, missedInstr, photo, category, courseTotal, memberId, active, log:{} }],
  family: [{ id, name, bloodType, allergies, chronic, color }],
  settings: { notifications: false },
  vitals: [{ date, type, value, unit }],
  symptoms: [{ date, desc, severity }],
  appointments: [{ id, title, date, time, note }],
  contacts: { doctor, pharmacy, emergency },
  vaccinations: [{ id, name, date, done }],
  emergency: { allergies, chronic, bloodType, emergencyContact, insurance, notes },
  bpReadings: [{ date, sys, dia, pulse }],
  symptomMeds: [{ date, symptom, meds:[أسماء] }],
  alertHistory: [], pin: "", tts: false
}
```

## دوال جاهزة للاستخدام (موجودة في app.js — استدعها فقط)
- `escapeHtml(str)`, `uid()`, `todayStr()`, `formatDateArabic(date)`, `showToast(msg, type)`, `saveData()`, `renderAll()`
- `getFullEncyclopedia()` — كل الأدوية (أساسية + مخصصة)
- `checkDrugInteractions(meds)` — فحص تفاعلات
- `getExpiringMeds()` — أدوية تنتهي خلال 30 يوماً (من features-medical.js)
- `classifyBp(sys, dia)` — تصنيف ضغط الدم (من features-health.js)
- `symptomChecker(q)` — فحص الأعراض
- `switchTab(tab)` — التنقل (tabs: home, vitals, symptoms, report, family, encyclopedia, vaccines, safety, settings)

## أنماط CSS الجاهزة
`.report-card` `.vitals-card` `.btn` `.btn-primary` `.btn-outline` `.btn-block` `.section-title` `.badge` `.icon-btn` `.hidden` `.filter-row` `.fab` `.modal-overlay` `.modal`

## قواعد صارمة لكل وكيل
1. اكتب ملفك فقط (`features-*.js`) — **ممنوع تعديل app.js أو index.html**
2. ES5 فقط (بدون let/const/arrow/async/template literals)
3. لا مكتبات خارجية
4. عرّف علم الجاهزية: `window.FEATURES_ASSISTANT_READY = true;` / `window.FEATURES_TOUR_READY = true;`
5. أي بيانات جديدة تُحفظ في appData عبر `saveData()` مع تهيئة آمنة
6. كل دالة تبدأ بتحقق `if (!el) return;` + try/catch للمدخلات
7. بعد الانتهاء: أضف تسليمك إلى `.opencode/context/progress.md`

## عقود الواجهات

### الوحدة 1: features-assistant.js (المساعد الشخصي)
| الدالة | السلوك |
|---|---|
| `personalAssistant(q)` | تحلل السؤال وتجيب من بيانات المستخدم الفعلية (انظر الأنماط أدناه) |
| `renderAssistantPanel()` | ترسم فقاعة الدردشة في `#assistantPanel` (رسائل + مدخل + أزرار أسئلة سريعة) |
| `openAssistantChat()` | تفتح لوحة الدردشة |
| `closeAssistantChat()` | تغلقها |
| `sendAssistantMessage()` | ترسل رسالة المستخدم وتعرض الرد |
| `ASSISTANT_QUICK_QUESTIONS` | مصفوفة أسئلة سريعة جاهزة (≥ 8) |

**أنماط الإجابة الشخصية (مطلوبة):**
1. "كم دواء عندي؟" / "أدويتي" → عدد + قائمة أدوية المستخدم النشطة مع جرعاتها
2. "متى موعد دوائي القادم؟" / "الجرعة القادمة" → أقرب وقت جرعة اليوم
3. "التزامي" / "كم أخذت اليوم؟" → إحصائيات الالتزام اليوم (من log)
4. "تفاعل" / "هل أدويتي تتعارض؟" → فحص تفاعلات أدوية المستخدم عبر checkDrugInteractions
5. "ضغطي" / "ضغط الدم" → آخر قراءة + تصنيفها عبر classifyBp
6. "أعراضي" / "آخر الأعراض" → آخر 3 أعراض مسجلة
7. "مواعيدي" / "موعد الطبيب" → أقرب موعد طبيب
8. "عائلتي" → أفراد العائلة + حساسياتهم
9. "تطعيماتي" → التطعيمات المتبقية/المنجزة
10. "انتهاء" / "صلاحية" → أدوية تنتهي قريباً (getExpiringMeds)
11. "إعادة تعبئة" / "نفد" → أدوية تحتاج إعادة تعبئة
12. "معلومات عن [دواء]" → معلومات من getFullEncyclopedia (تفويض للمساعد القديم)
13. "أشعر بـ [عرض]" → symptomChecker
14. أي سؤال آخر → رد ذكي يقترح الأسئلة المتاحة

**الردود**: نص عربي واضح + HTML خفيف (قوائم/نقاط). كل إجابة تبدأ بتحية مناسبة وتنتهي بنصيحة.

### الوحدة 2: features-tour.js (الجولة التعليمية)
| الدالة | السلوك |
|---|---|
| `startTour()` | تبدأ الجولة خطوة بخطوة |
| `renderWelcomeModal()` | نافذة ترحيب أول مرة (اسم التطبيق + زر "ابدأ الجولة" + زر "تخطي") |
| `TOUR_STEPS` | مصفوفة خطوات (≥ 9): كل تبويب + زر الإضافة + المساعد |
| `shouldShowTour()` | ترجع true إذا أول استخدام (localStorage `STORAGE_KEY + "_tourDone"` غير موجود) |
| `markTourDone()` | تحفظ أن الجولة شوهدت |

**سلوك الجولة**: طبقة تغطية داكنة + فقاعة شرح في منتصف الشاشة (عنوان + وصف مبسط + زر "التالي") + إبراز العنصر المستهدف (حدود ملونة). الخطوات:
1. الترحيب: "أهلاً بك في تذكير الدواء 👋"
2. 🏠 الرئيسية: "أدويتك اليوم + جرعاتك + زر الإضافة"
3. 💓 الحيوية: "سجل وزنك وضغطك ودرجة حرارتك"
4. 🩺 الأعراض: "سجل أي عرض تشعر به"
5. 📊 التقارير: "التزامك + تقرير الطبيب + تحليلات"
6. 👨👩👧👦 العائلة: "أدوية كل فرد من عائلتك"
7. 📚 الدليل: "ابحث عن أي دواء + المساعد الذكي"
8. 💉 التطعيمات: "جدول تطعيمات الأطفال"
9. 🛡️ السلامة: "بطاقة الطوارئ + حاسبة جرعات الأطفال"
10. ⚙️ الإعدادات: "إشعارات + نسخ احتياطي + مزامنة"
11. ➕ زر الإضافة: "أضف دواءً جديداً بضغطة"
12. 💬 المساعد: "اسأل عن أي شيء — المساعد يعرف بياناتك"

**التنفيذ**: عناصر تُنشأ ديناميكياً (overlay + tooltip) — بدون تعديل HTML. عند نهاية الجولة: markTourDone + إعادة رسم.

## التحقق لكل وكيل
- `node --check features-*.js` ينجح
- كل دالة معرفة في النطاق العام
- علم الجاهزية true