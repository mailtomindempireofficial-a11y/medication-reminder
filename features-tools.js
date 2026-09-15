/* ============================================================
   features-tools.js — لوحة الأدوات المنظمة (Tools Hub) 🧰
   شريط/لوحة منظمة تعرض كل أدوات التطبيق في مكان واحد مرتب
   بفئات واضحة — كل بطاقة تنقّل للتبويب المعني (switchTab)
   ES5 خالص — بدون let/const/arrow/async/template literals
   ============================================================ */

"use strict";

/* ---------- تعريف فئات وبطاقات الأدوات ---------- */
var TOOLS_HUB_CATEGORIES = [
  {
    title: "🩺 القياسات والأعراض",
    cards: [
      { icon: "💓", title: "العلامات الحيوية", desc: "ضغط الدم · السكر · الوزن", tab: "vitals" },
      { icon: "🩸", title: "تتبع ضغط الدم", desc: "قراءات مصنّفة ورسم بياني", tab: "vitals" },
      { icon: "🩺", title: "سجل الأعراض", desc: "سجّل واعرض أعراضك", tab: "symptoms" },
      { icon: "🌸", title: "صحة المرأة", desc: "الدورة الشهرية وتذكير الحبوب", tab: "vitals" }
    ]
  },
  {
    title: "📊 التقارير وعلاقة الالتزام",
    cards: [
      { icon: "📊", title: "تقرير الالتزام", desc: "نسبة التزامك بالجرعات", tab: "report" },
      { icon: "🗓️", title: "مواعيد الطبيب", desc: "مواعيدك القادمة والتحاليل", tab: "report" },
      { icon: "🧑‍⚕️", title: "تقرير الطبيب", desc: "تقرير طبي جاهز للطباعة", tab: "report" },
      { icon: "🕸️", title: "خريطة الالتزام", desc: "آخر 4 أسابيع بالألوان", tab: "report" }
    ]
  },
  {
    title: "🛡️ السلامة والصلاحية",
    cards: [
      { icon: "🆘", title: "بطاقة الطوارئ", desc: "بياناتك الطبية للإسعاف", tab: "safety" },
      { icon: "⏰", title: "انتهاء الصلاحية", desc: "أدوية تنتهي خلال 30 يوماً", tab: "safety" },
      { icon: "🔄", title: "إعادة التعبئة", desc: "أدوية تحتاج تعبئة قريباً", tab: "safety" },
      { icon: "👶", title: "حاسبة جرعات الأطفال", desc: "احسب جرعة طفلك بأمان", tab: "safety" },
      { icon: "🍽️", title: "تفاعلات دواء-طعام", desc: "تحقق من طعامك مع أدويتك", tab: "encyclopedia" }
    ]
  },
  {
    title: "💉 التطعيمات",
    cards: [
      { icon: "💉", title: "جدول التطعيمات", desc: "تطعيمات الأطفال والبالغين", tab: "vaccines" }
    ]
  },
  {
    title: "👨‍👩‍👧 العائلة",
    cards: [
      { icon: "👨‍👩‍👧‍👦", title: "أفراد العائلة", desc: "أفرادك وحساسياتهم وأمراضهم", tab: "family" },
      { icon: "➕", title: "إضافة فرد", desc: "أضف فرداً جديداً للعائلة", tab: "family" }
    ]
  },
  {
    title: "📚 الدليل والبحث",
    cards: [
      { icon: "📚", title: "دليل الأدوية", desc: "ابحث عن أي دواء بالعربي أو الإنجليزي", tab: "encyclopedia" },
      { icon: "🌐", title: "بحث FDA", desc: "أكثر من 100,000 دواء أمريكي", tab: "encyclopedia" },
      { icon: "🌿", title: "الأعشاب والطب البديل", desc: "فوائد وتحذيرات الأعشاب", tab: "encyclopedia" },
      { icon: "📋", title: "خطط علاجية جاهزة", desc: "خطط السكري والضغط وغيرها", tab: "encyclopedia" }
    ]
  },
  {
    title: "🤖 المساعد الذكي",
    cards: [
      { icon: "🤖", title: "اسأل المساعد", desc: "أجوبة من بياناتك الفعلية", action: "assistant" },
      { icon: "🎤", title: "الأوامر الصوتية", desc: "تحكم بالتطبيق بصوتك", action: "voice" }
    ]
  },
  {
    title: "⚙️ الإعدادات",
    cards: [
      { icon: "⚙️", title: "الإعدادات", desc: "الإشعارات والخصوصية والبيانات", tab: "settings" },
      { icon: "🔍", title: "وضع القراءة الكبير", desc: "خط أكبر وتباين أعلى لضعف البصر", action: "reading" },
      { icon: "🧓", title: "وضع كبار السن", desc: "واجهة مبسطة بأزرار كبيرة", tab: "settings" },
      { icon: "🎮", title: "وضع الأطفال", desc: "واجهة ممتعة بالنجوم", tab: "settings" },
      { icon: "📲", title: "المشاركة والمزامنة", desc: "QR · WebDAV · واتساب", tab: "settings" }
    ]
  }
];

/* ---------- حقن أنماط اللوحة مرة واحدة ---------- */
function _toolsInjectStyles() {
  if (window._TOOLS_STYLES_INJECTED) return;
  window._TOOLS_STYLES_INJECTED = true;
  var style = document.createElement("style");
  style.id = "toolsHubStyles";
  style.textContent =
    /* غلاف اللوحة */
    ".tools-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);" +
    "z-index:220;display:none;align-items:flex-end;justify-content:center;}" +
    ".tools-overlay.open{display:flex;}" +
    ".tools-sheet{background:var(--card,#fff);width:100%;max-width:640px;border-radius:24px 24px 0 0;" +
    "max-height:88vh;overflow-y:auto;padding:20px 18px calc(24px + env(safe-area-inset-bottom));" +
    "animation:toolsSlideUp .3s ease;}" +
    "@keyframes toolsSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}" +
    ".tools-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}" +
    ".tools-header h3{font-size:1.2rem;font-weight:800;color:var(--text,#134e4a);}" +
    ".tools-sub{font-size:.8rem;color:var(--text-muted,#5b7d7a);margin-bottom:14px;}" +
    ".tools-close{background:var(--bg,#f0fdfa);border:none;width:36px;height:36px;border-radius:50%;" +
    "font-size:1.1rem;cursor:pointer;color:var(--text,#134e4a);}" +
    /* أزرار سريعة */
    ".tools-quick{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;}" +
    ".tools-quick-btn{flex:1;min-width:130px;border:none;border-radius:14px;padding:12px 10px;" +
    "font-size:.85rem;font-weight:800;cursor:pointer;font-family:inherit;color:#fff;" +
    "background:linear-gradient(135deg,var(--primary,#0d9488),var(--primary-dark,#0f766e));" +
    "box-shadow:0 4px 14px rgba(13,148,136,.3);transition:transform .15s;}" +
    ".tools-quick-btn:active{transform:scale(.96);}" +
    ".tools-quick-btn.alt{background:linear-gradient(135deg,#0f766e,#134e4a);}" +
    /* الفئات */
    ".tools-cat{margin-bottom:18px;}" +
    ".tools-cat-title{font-size:.9rem;font-weight:800;color:var(--primary-dark,#0f766e);" +
    "margin-bottom:10px;display:flex;align-items:center;gap:6px;}" +
    ".tools-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}" +
    "@media(min-width:480px){.tools-grid{grid-template-columns:repeat(3,1fr);}}" +
    ".tools-card{background:var(--bg,#f0fdfa);border:1px solid var(--border,#e2f3f0);" +
    "border-radius:16px;padding:14px 12px;cursor:pointer;text-align:right;" +
    "transition:all .15s ease;font-family:inherit;display:flex;flex-direction:column;gap:6px;}" +
    ".tools-card:hover{border-color:var(--primary,#0d9488);box-shadow:var(--shadow,0 2px 12px rgba(13,148,136,.08));}" +
    ".tools-card:active{transform:scale(.97);}" +
    ".tools-card .tc-icon{font-size:1.6rem;line-height:1;}" +
    ".tools-card .tc-title{font-size:.85rem;font-weight:800;color:var(--text,#134e4a);}" +
    ".tools-card .tc-desc{font-size:.72rem;color:var(--text-muted,#5b7d7a);line-height:1.5;}" +
    "body.dark .tools-card{background:#0f172a;border-color:var(--border,#334155);}" +
    "body.dark .tools-card .tc-title{color:#e2e8f0;}" +
    "body.dark .tools-close{background:#0f172a;color:#e2e8f0;}" +
    /* كروت الأسئلة السريعة للمساعد (كبيرة لكبار السن) */
    ".tools-assistant{background:linear-gradient(135deg,var(--primary-light,#ccfbf1),#e6fffa);" +
    "border:1px solid var(--primary,#0d9488);border-radius:16px;padding:12px;margin-bottom:16px;}" +
    ".tools-assistant-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}" +
    "@media(min-width:480px){.tools-assistant-grid{grid-template-columns:repeat(4,1fr);}}" +
    ".tools-ask-card{background:var(--card,#fff);border:2px solid var(--primary,#0d9488);" +
    "border-radius:14px;padding:12px 8px;cursor:pointer;display:flex;flex-direction:column;" +
    "align-items:center;gap:4px;font-family:inherit;text-align:center;transition:all .15s;}" +
    ".tools-ask-card:active{transform:scale(.95);}" +
    ".tools-ask-card .tac-icon{font-size:1.5rem;line-height:1;}" +
    ".tools-ask-card .tac-title{font-size:.85rem;font-weight:800;color:var(--primary-dark,#0f766e);}" +
    ".tools-ask-card .tac-desc{font-size:.68rem;color:var(--text-muted,#5b7d7a);line-height:1.4;}" +
    "body.dark .tools-assistant{background:#134e4a;border-color:#0f766e;}" +
    "body.dark .tools-ask-card{background:#0f172a;border-color:#14b8a6;}" +
    "body.dark .tools-ask-card .tac-title{color:#99f6e4;}";
  document.head.appendChild(style);
}

/* ---------- ضمان وجود غلاف اللوحة ---------- */
function _toolsEnsureOverlay() {
  var ov = document.getElementById("toolsHubOverlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "toolsHubOverlay";
    ov.className = "tools-overlay";
    ov.onclick = function (e) {
      if (e.target === ov) closeToolsHub();
    };
    document.body.appendChild(ov);
  }
  return ov;
}

/* ---------- تنفيذ بطاقة (تبويب أو إجراء خاص) ---------- */
function _toolsRunCard(card) {
  if (!card) return;
  closeToolsHub();
  if (card.action === "assistant") {
    if (typeof openAssistantChat === "function") openAssistantChat();
    else if (typeof switchTab === "function") switchTab("encyclopedia");
    return;
  }
  if (card.action === "voice") {
    if (typeof startVoiceCommand === "function") startVoiceCommand();
    else if (typeof startVoiceInput === "function") startVoiceInput();
    else if (typeof switchTab === "function") switchTab("settings");
    return;
  }
  if (card.action === "reading") {
    toggleReadingMode();
    return;
  }
  if (card.tab && typeof switchTab === "function") {
    switchTab(card.tab);
  }
}

/* ---------- رسم اللوحة كاملة ---------- */
function renderToolsHub() {
  var ov = _toolsEnsureOverlay();
  if (!ov) return;
  try {
    _toolsInjectStyles();
    var html = "";
    html += '<div class="tools-sheet">';
    html += '<div class="tools-header">';
    html += '<h3>🧰 لوحة الأدوات</h3>';
    html += '<button class="tools-close" onclick="closeToolsHub()" title="إغلاق">✕</button>';
    html += '</div>';
    html += '<div class="tools-sub">كل أدوات التطبيق في مكان واحد — اختر ما تحتاجه</div>';

    /* أسئلة سريعة للمساعد — كروت كبيرة بلا كتابة (لكبار السن) */
    html += '<div class="tools-assistant">';
    html += '<div class="tools-cat-title">⚡ أسئلة سريعة للمساعد — اضغط واسمع الإجابة</div>';
    html += '<div class="tools-assistant-grid">';
    html += '<button class="tools-ask-card" onclick="closeToolsHub();askAssistantQuickOpen(\'جرعتي القادمة؟\')">' +
      '<span class="tac-icon">💊</span><span class="tac-title">جرعتي القادمة؟</span>' +
      '<span class="tac-desc">متى موعد دوائي اليوم</span></button>';
    html += '<button class="tools-ask-card" onclick="closeToolsHub();askAssistantQuickOpen(\'كم دواءً عندي؟\')">' +
      '<span class="tac-icon">📋</span><span class="tac-title">كم دواءً عندي؟</span>' +
      '<span class="tac-desc">عدد أدويتي النشطة</span></button>';
    html += '<button class="tools-ask-card" onclick="closeToolsHub();askAssistantQuickOpen(\'التزامي الشهري؟\')">' +
      '<span class="tac-icon">📅</span><span class="tac-title">كم التزامي هذا الشهر؟</span>' +
      '<span class="tac-desc">نسبة التزامي بآخر 30 يوم</span></button>';
    html += '<button class="tools-ask-card" onclick="closeToolsHub();askAssistantQuickOpen(\'تقريري اليومي؟\')">' +
      '<span class="tac-icon">📈</span><span class="tac-title">تقريري اليومي</span>' +
      '<span class="tac-desc">جرعاتي المأخوذة والمتبقية</span></button>';
    html += '</div></div>';

    /* أزرار سريعة */
    html += '<div class="tools-quick">';
    html += '<button class="tools-quick-btn" onclick="closeToolsHub();openMedModal()">➕ إضافة دواء</button>';
    html += '<button class="tools-quick-btn alt" onclick="closeToolsHub();openAssistantChat()">🤖 اسأل المساعد</button>';
    var readingOn = isReadingMode();
    html += '<button class="tools-quick-btn' + (readingOn ? "" : " alt") + '" ' +
      'onclick="closeToolsHub();toggleReadingMode()">' +
      (readingOn ? "✅" : "🔍") + ' وضع القراءة الكبير</button>';
    html += '</div>';

    /* الفئات والبطاقات */
    for (var i = 0; i < TOOLS_HUB_CATEGORIES.length; i++) {
      var cat = TOOLS_HUB_CATEGORIES[i];
      html += '<div class="tools-cat">';
      html += '<div class="tools-cat-title">' + cat.title + '</div>';
      html += '<div class="tools-grid">';
      for (var j = 0; j < cat.cards.length; j++) {
        var c = cat.cards[j];
        html += '<button class="tools-card" onclick="_toolsRunCard(' +
          _toolsCardJson(c) + ')">';
        html += '<span class="tc-icon">' + c.icon + '</span>';
        html += '<span class="tc-title">' + _toolsEsc(c.title) + '</span>';
        html += '<span class="tc-desc">' + _toolsEsc(c.desc) + '</span>';
        html += '</button>';
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
    ov.innerHTML = html;
  } catch (err) {
    console.error("خطأ في رسم لوحة الأدوات:", err);
  }
}

/* ---------- تمثيل البطاقة كـ JSON آمن داخل onclick ---------- */
function _toolsCardJson(card) {
  var obj = { icon: card.icon, title: card.title, desc: card.desc };
  if (card.tab) obj.tab = card.tab;
  if (card.action) obj.action = card.action;
  var json = JSON.stringify(obj);
  return "'" + json.replace(/'/g, "\\'") + "'";
}

/* ---------- تعقيم النصوص ---------- */
function _toolsEsc(s) {
  if (typeof escapeHtml === "function") return escapeHtml(s);
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- فتح اللوحة ---------- */
function openToolsHub() {
  var ov = _toolsEnsureOverlay();
  if (!ov) return;
  try {
    if (!ov.innerHTML.trim()) renderToolsHub();
    ov.classList.add("open");
  } catch (err) {
    console.error("خطأ في فتح لوحة الأدوات:", err);
  }
}

/* ---------- إغلاق اللوحة ---------- */
function closeToolsHub() {
  var ov = document.getElementById("toolsHubOverlay");
  if (ov) ov.classList.remove("open");
}

/* ---------- علم الجاهزية ---------- */
window.FEATURES_TOOLS_READY = true;