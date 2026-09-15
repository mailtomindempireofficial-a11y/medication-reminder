# Blueprint: تذكير الدواء — الإصدار 2.1 (وضعيات المستخدم + الديسك توب)

## الهدف
1. تبسيط التطبيق لكل فئة مستخدم (كبار سن، أطفال، نساء، شباب) — 5 ميزات جديدة
2. نسخة ديسك توب (Electron) بنفس الشكل الجميل تماماً
3. تنسيق نسخة الهاتف لمطابقة الويب

## التقنيات
- Vanilla JS (ES5) — لا مكتبات خارجية
- التخزين: localStorage عبر `saveData()` / `STORAGE_KEY`
- RTL عربي بالكامل
- الديسك توب: Electron يغلّف ملفات الويب نفسها (شكل مطابق 100%)

## بنية الملفات (المتفق عليها — لا تلمس app.js أو index.html)
```
تطبيق-تذكير-الدواء/
├── features-simple.js      ← الوكيل 1 (وضع كبار السن + معالج الإعداد السريع)
├── features-kids.js        ← الوكيل 2 (وضع الأطفال — نجوم + شخصية)
├── features-women.js       ← الوكيل 3 (وضع المرأة — دورة + حبوب)
├── features-voice.js       ← الوكيل 4 (تحسين التحكم الصوتي)
├── features-assistant.js   ← موجود (لا تلمسه)
├── features-tour.js        ← موجود (لا تلمسه)
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
  family, settings, vitals, symptoms, appointments, contacts, vaccinations,
  emergency, bpReadings, symptomMeds, alertHistory, pin, tts
}
```

## دوال جاهزة للاستخدام (موجودة في app.js — استدعها فقط)
- `escapeHtml(str)`, `uid()`, `todayStr()`, `nowTime()`, `formatDateArabic(date)`, `showToast(msg, type)`, `saveData()`, `renderAll()`
- `getTodayDoses()`, `isDoseTaken(medId, time, dateStr)`, `markDose(medId, time, dateStr, taken)`, `getTakenCountToday()`, `getMissedCountToday()`
- `switchTab(tab)`, `renderToday()`, `renderAllMeds()`, `updateSummary()`
- `getFullEncyclopedia()`, `checkDrugInteractions(meds)`, `getExpiringMeds()`, `classifyBp(sys, dia)`, `symptomChecker(q)`
- `startVoiceInput()` (موجود — يحسّنه الوكيل 4)
- `STORAGE_KEY` (مفتاح التخزين الأساسي)

## أنماط CSS الجاهزة
`.report-card` `.vitals-card` `.btn` `.btn-primary` `.btn-outline` `.btn-block` `.section-title` `.badge` `.icon-btn` `.hidden` `.filter-row` `.fab` `.modal-overlay` `.modal` `.summary-card` `.dose-card`

## قواعد صارمة لكل وكيل
1. اكتب ملفك فقط (`features-*.js`) — **ممنوع تعديل app.js أو index.html**
2. ES5 فقط (بدون let/const/arrow/async/template literals)
3. لا مكتبات خارجية
4. عرّف علم الجاهزية: `window.FEATURES_SIMPLE_READY = true;` / `FEATURES_KIDS_READY` / `FEATURES_WOMEN_READY` / `FEATURES_VOICE_READY`
5. أي بيانات جديدة تُحفظ في localStorage بمفتاح خاص (STORAGE_KEY + "_اسم") — لا تعدّل appData إلا عبر saveData()
6. كل دالة تبدأ بتحقق `if (!el) return;` + try/catch للمدخلات
7. بعد الانتهاء: أضف تسليمك إلى `.opencode/context/progress.md`

## عقود الواجهات

### الوحدة 1: features-simple.js (وضع كبار السن + معالج الإعداد السريع)
| الدالة | السلوك |
|---|---|
| `isSimpleMode()` | ترجع true إذا وضع كبار السن مفعّل (localStorage STORAGE_KEY+"_simpleMode") |
| `setSimpleMode(on)` | تفعيل/إيقاف + saveData + renderAll |
| `toggleSimpleMode()` | تبديل |
| `renderSimpleHome()` | شاشة مبسطة: بطاقة "الجرعة القادمة" ضخمة + زر عملاق "✅ أخذتها" + زر "⏰ تأجيل" + قراءة صوتية تلقائية + زر "🔊 أعد القراءة" |
| `renderSimpleModeToggle()` | مفتاح في الإعدادات (يستدعيها القائد) |
| `startQuickSetup()` | معالج 3 خطوات: (1) اسم الدواء (2) وقت الجرعة (3) عدد المرات — ينشئ الدواء تلقائياً |
| `shouldShowQuickSetup()` | true إذا أول استخدام (لا أدوية و localStorage STORAGE_KEY+"_setupDone" غير موجود) |
| `markSetupDone()` | يحفظ أن المعالج شوهد |
| `renderQuickSetupModal()` | نافذة المعالج (overlay + 3 خطوات + أزرار) |

**سلوك وضع كبار السن**: عند التفعيل → يخفي التبويبات (يضيف class للـ body) ويعرض شاشة واحدة فقط في #homeTab: الجرعة القادمة (أكبر وقت + اسم الدواء بخط ضخم) + زر "✅ أخذتها" (يستدعي markDose) + زر "⏰ تأجيل 10 دقائق" + زر "🔊". عند إيقافه → يعود الوضع الطبيعي.

### الوحدة 2: features-kids.js (وضع الأطفال)
| الدالة | السلوك |
|---|---|
| `isKidsMode()` | localStorage STORAGE_KEY+"_kidsMode" |
| `toggleKidsMode()` | تبديل + renderAll |
| `getStarsForToday()` | عدد الجرعات المأخوذة في وقتها اليوم (من log) |
| `getStreak()` | عدد الأيام المتتالية التي أُخذت فيها كل الجرعات |
| `renderKidsHome()` | شاشة ملونة: شخصية كرتونية (🐻/🐱/🦊/🐰 عشوائية) + "أحسنت! ⭐⭐⭐" + عداد نجوم + سلسلة أيام 🔥 + أزرار ضخمة ملونة |
| `renderKidsModeToggle()` | مفتاح في الإعدادات |
| `KIDS_MASCOTS` | مصفوفة شخصيات: ["🐻","🐱","🦊","🐰","🐼","🦁"] |

**سلوك وضع الأطفال**: عند التفعيل → شاشة ملونة مبسطة في #homeTab: الشخصية + النجوم + السلسلة + قائمة أدوية اليوم بأزرار ضخمة ملونة (كل دواء زر "✅ أخذته"). رسائل تشجيع عشوائية: "أحسنت يا بطل! 🎉", "رائع! استمر! 💪", "ممتاز! أنت نجم! ⭐".

### الوحدة 3: features-women.js (وضع المرأة)
| الدالة | السلوك |
|---|---|
| `isWomenMode()` | localStorage STORAGE_KEY+"_womenMode" |
| `toggleWomenMode()` | تبديل + renderAll |
| `addPeriodEntry(date)` | تسجيل يوم دورة (appData.periods — تهيئة آمنة) |
| `renderPeriodTracker()` | تقويم بسيط + توقع الدورة القادمة (متوسط آخر 3 دورات) |
| `addPillReminder(time)` | تذكير حبوب منع الحمل اليومي (appData.pillReminder) |
| `renderPillReminder()` | بطاقة: "حان وقت حبوبك 💊" + زر "أخذتها" + تنبيه فائت |
| `renderWomenSection()` | قسم كامل (دورة + حبوب + نصائح) — يستدعيها القائد في تبويب الحيوية |
| `renderWomenModeToggle()` | مفتاح في الإعدادات |

**البيانات**: appData.periods = [{date, flow}], appData.pillReminder = {time, lastTaken, streak}

### الوحدة 4: features-voice.js (تحسين التحكم الصوتي)
| الدالة | السلوك |
|---|---|
| `startVoiceCommand()` | يبدأ الاستماع لأوامر (webkitSpeechRecognition — تحقق من وجوده) |
| `processVoiceCommand(text)` | يحلل النص: "أضف دواء X" → يفتح نافذة الإضافة مع الاسم، "خذ دوائي" → يسجل الجرعة القادمة، "أين دوائي؟" → يعرض الجرعة القادمة، "أشعر بـ X" → symptomChecker |
| `VOICE_COMMANDS` | مصفوفة الأوامر المدعومة مع أمثلة |
| `renderVoiceHelp()` | بطاقة تعرض الأوامر الصوتية المتاحة |
| `speakText(text)` | نطق نص عربي (SpeechSynthesis — تحقق من وجوده) |

**ملاحظة**: لا تعدّل startVoiceInput الموجودة — أضف دوالاً جديدة فقط. القائد يضيف زر "🎤 أوامر صوتية" في الرئيسية.

## التحقق لكل وكيل
- `node --check features-*.js` ينجح
- كل دالة معرفة في النطاق العام
- علم الجاهزية true