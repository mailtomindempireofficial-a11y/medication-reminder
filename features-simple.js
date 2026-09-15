/* ============================================================
   features-simple.js — وضع كبار السن المبسّط + معالج الإعداد السريع
   الوحدة 1 — blueprint v2.1
   ES5 خالص — بدون let/const/arrow/async/template literals
   ============================================================ */

"use strict";

/* ============================================================
   أدوات مساعدة داخلية (خاصة بالوحدة)
   ============================================================ */

/* مفتاح تخزين آمن — يعتمد على STORAGE_KEY العام مع fallback */
function _simpleKey(suffix) {
  var base = (typeof STORAGE_KEY !== "undefined" && STORAGE_KEY) ? STORAGE_KEY : "medReminder_v1";
  return base + suffix;
}

/* تعقيم النصوص قبل الحقن في HTML */
function _simpleEsc(str) {
  if (typeof escapeHtml === "function") return escapeHtml(str);
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* تعقيم للاستخدام داخل قيم السمات (onclick) */
function _simpleEscAttr(str) {
  return _simpleEsc(str).replace(/'/g, "&#39;");
}

/* رسالة toast آمنة */
function _simpleToast(msg, type) {
  if (typeof showToast === "function") showToast(msg, type);
}

/* وقت اليوم الحالي بصيغة HH:MM */
function _simpleNowTime() {
  if (typeof nowTime === "function") return nowTime();
  var d = new Date();
  var h = d.getHours();
  var m = d.getMinutes();
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

/* تحويل HH:MM إلى دقائق */
function _simpleTimeToMin(t) {
  if (typeof timeToMinutes === "function") return timeToMinutes(t);
  var parts = String(t).split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/* تاريخ اليوم بصيغة YYYY-MM-DD */
function _simpleTodayStr() {
  if (typeof todayStr === "function") return todayStr();
  var d = new Date();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

/* حقن أنماط الوضع المبسّط مرة واحدة */
function _simpleInjectStyles() {
  if (window._SIMPLE_STYLES_INJECTED) return;
  window._SIMPLE_STYLES_INJECTED = true;
  var style = document.createElement("style");
  style.id = "simpleStyles";
  style.textContent =
    "#homeTab{display:none;}" +
    "body.simple-mode .bottom-nav{display:none!important;}" +
    "body.simple-mode .fab{display:none!important;}" +
    "body.simple-mode .search-box{display:none!important;}" +
    "body.simple-mode #shoppingBtn{display:none!important;}" +
    "body.simple-mode #todaySection{display:none!important;}" +
    "body.simple-mode #allSection{display:none!important;}" +
    "body.simple-mode #doseAlert{display:none!important;}" +
    "body.simple-mode #interactionAlerts{display:none!important;}" +
    "body.simple-mode #safetyAlerts{display:none!important;}" +
    "body.simple-mode #homeTab{display:block!important;}" +
    ".simple-home{padding:16px;text-align:center;}" +
    ".simple-title{font-size:2rem;font-weight:900;margin:8px 0 20px;color:var(--text,#134e4a);}" +
    ".simple-dose-card{background:linear-gradient(135deg,var(--primary,#0d9488),var(--primary-dark,#0f766e));" +
    "color:#fff;border-radius:24px;padding:30px 20px;margin:0 0 24px;box-shadow:0 10px 30px rgba(13,148,136,.35);}" +
    ".simple-med-name{font-size:2rem;font-weight:900;margin-bottom:10px;line-height:1.3;}" +
    ".simple-med-time{font-size:3rem;font-weight:900;line-height:1.2;}" +
    ".simple-med-dosage{font-size:1.2rem;margin-top:10px;opacity:.95;}" +
    ".simple-empty{padding:30px 16px;margin:0 0 24px;background:var(--card,#fff);border:2px dashed var(--border,#e2f3f0);" +
    "border-radius:24px;color:var(--text,#134e4a);}" +
    ".simple-empty-emoji{font-size:3.5rem;margin-bottom:10px;}" +
    ".simple-empty-text{font-size:1.6rem;font-weight:800;}" +
    ".simple-btn{display:block;width:100%;padding:20px;font-size:1.5rem;font-weight:800;border-radius:18px;" +
    "border:none;margin-bottom:12px;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(0,0,0,.08);}" +
    ".simple-btn:active{transform:scale(.97);}" +
    ".simple-btn-primary{background:linear-gradient(135deg,var(--primary,#0d9488),var(--primary-dark,#0f766e));color:#fff;}" +
    ".simple-btn-outline{background:var(--card,#fff);color:var(--primary,#0d9488);border:2px solid var(--primary,#0d9488);}" +
    ".setup-step-title{font-size:1.4rem;font-weight:900;margin:16px 0;text-align:center;color:var(--text,#134e4a);}" +
    ".setup-input{width:100%;padding:16px;font-size:1.2rem;border:2px solid var(--border,#e2f3f0);border-radius:14px;" +
    "text-align:center;font-family:inherit;background:var(--bg,#f0fdfa);color:var(--text,#134e4a);box-sizing:border-box;}" +
    ".setup-time-btn{display:block;width:100%;padding:18px;font-size:1.2rem;font-weight:800;border-radius:14px;" +
    "border:2px solid var(--border,#e2f3f0);background:var(--card,#fff);color:var(--text,#134e4a);margin-bottom:10px;" +
    "cursor:pointer;font-family:inherit;}" +
    ".setup-time-btn.selected{background:var(--primary,#0d9488);color:#fff;border-color:var(--primary,#0d9488);}" +
    ".setup-custom{display:flex;gap:8px;margin-top:12px;}" +
    ".setup-nav{display:flex;gap:10px;margin-top:20px;}";
  document.head.appendChild(style);
}

/* ضمان وجود حاوية #homeTab (تنشئها إن لم يضفها القائد) */
function _simpleEnsureHomeTab() {
  var el = document.getElementById("homeTab");
  if (el) return el;
  el = document.createElement("div");
  el.id = "homeTab";
  var main = document.querySelector("main");
  if (main) main.insertBefore(el, main.firstChild);
  else document.body.appendChild(el);
  return el;
}

/* الجرعة القادمة (غير المأخوذة) — ترجع كائن الجرعة أو null */
function _simpleGetNextDose() {
  if (typeof getTodayDoses !== "function") return null;
  var doses = getTodayDoses();
  if (!doses || doses.length === 0) return null;
  var now = _simpleTimeToMin(_simpleNowTime());
  var next = null;
  var i;
  for (i = 0; i < doses.length; i++) {
    if (!doses[i].taken && _simpleTimeToMin(doses[i].time) >= now) {
      next = doses[i];
      break;
    }
  }
  if (!next) {
    for (i = 0; i < doses.length; i++) {
      if (!doses[i].taken) { next = doses[i]; break; }
    }
  }
  return next;
}

/* ============================================================
   وضع كبار السن المبسّط
   ============================================================ */

function isSimpleMode() {
  try {
    return localStorage.getItem(_simpleKey("_simpleMode")) === "1";
  } catch (e) {
    return false;
  }
}

function setSimpleMode(on) {
  try {
    localStorage.setItem(_simpleKey("_simpleMode"), on ? "1" : "0");
    _simpleInjectStyles();
    if (on) {
      document.body.classList.add("simple-mode");
      _simpleEnsureHomeTab();
      renderSimpleHome();
      _simpleToast("🧓 وضع كبار السن مفعّل", "success");
    } else {
      document.body.classList.remove("simple-mode");
      var homeTab = document.getElementById("homeTab");
      if (homeTab) homeTab.innerHTML = "";
      _simpleToast("تم إيقاف وضع كبار السن", "success");
    }
    if (typeof renderAll === "function") renderAll();
    if (typeof renderSimpleModeToggle === "function") renderSimpleModeToggle();
  } catch (e) {
    console.error("خطأ في setSimpleMode:", e);
  }
}

function toggleSimpleMode() {
  setSimpleMode(!isSimpleMode());
}

/* تسجيل الجرعة القادمة كمأخوذة */
function _simpleTakeNextDose() {
  try {
    var dose = _simpleGetNextDose();
    if (!dose) {
      _simpleToast("لا توجد جرعة لتسجيلها الآن", "error");
      return;
    }
    if (typeof markDose === "function") {
      markDose(dose.medId, dose.time, _simpleTodayStr(), true);
    }
    _simpleToast("✅ تم تسجيل " + dose.medName, "success");
    renderSimpleHome();
  } catch (e) {
    console.error("خطأ في _simpleTakeNextDose:", e);
  }
}

/* تأجيل التنبيه 10 دقائق */
function _simpleSnooze() {
  try {
    if (typeof snoozeDose === "function") snoozeDose();
    else _simpleToast("⏰ سأذكرك بعد 10 دقائق", "success");
  } catch (e) {
    console.error("خطأ في _simpleSnooze:", e);
  }
}

/* نطق معلومات الجرعة القادمة */
function _simpleSpeak() {
  try {
    var dose = _simpleGetNextDose();
    var text = dose
      ? "حان موعد " + dose.medName + " الساعة " + dose.time
      : "لا توجد جرعات الآن";
    if (typeof speakText === "function") {
      speakText(text);
    } else if ("speechSynthesis" in window) {
      var msg = new SpeechSynthesisUtterance(text);
      msg.lang = "ar-SA";
      msg.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(msg);
    }
  } catch (e) {
    console.error("خطأ في _simpleSpeak:", e);
  }
}

/* فتح نافذة إضافة دواء */
function _simpleAddMed() {
  try {
    if (typeof openMedModal === "function") openMedModal();
  } catch (e) {
    console.error("خطأ في _simpleAddMed:", e);
  }
}

/* رسم الشاشة المبسّطة في #homeTab */
function renderSimpleHome() {
  try {
    _simpleInjectStyles();
    var el = _simpleEnsureHomeTab();
    if (!el) return;
    var meds = appData.medications || [];
    var html = "";
    if (meds.length === 0) {
      html =
        '<div class="simple-home">' +
        '<h1 class="simple-title">💊 جرعتك القادمة</h1>' +
        '<div class="simple-empty">' +
        '<div class="simple-empty-emoji">🎉</div>' +
        '<div class="simple-empty-text">لا توجد أدوية اليوم 🎉</div>' +
        '</div>' +
        '<button class="simple-btn simple-btn-primary" onclick="_simpleAddMed()">➕ إضافة دواء</button>' +
        '</div>';
    } else {
      var dose = _simpleGetNextDose();
      if (!dose) {
        html =
          '<div class="simple-home">' +
          '<h1 class="simple-title">💊 جرعتك القادمة</h1>' +
          '<div class="simple-empty">' +
          '<div class="simple-empty-emoji">🎉</div>' +
          '<div class="simple-empty-text">أخذت كل جرعاتك اليوم!</div>' +
          '</div>' +
          '<button class="simple-btn simple-btn-outline" onclick="_simpleAddMed()">➕ إضافة دواء</button>' +
          '</div>';
      } else {
        html =
          '<div class="simple-home">' +
          '<h1 class="simple-title">💊 جرعتك القادمة</h1>' +
          '<div class="simple-dose-card">' +
          '<div class="simple-med-name">' + _simpleEsc(dose.medName) + '</div>' +
          '<div class="simple-med-time">' + _simpleEsc(dose.time) + '</div>' +
          '<div class="simple-med-dosage">' + _simpleEsc(dose.dosage || "حسب الوصفة") + '</div>' +
          '</div>' +
          '<button class="simple-btn simple-btn-primary" onclick="_simpleTakeNextDose()">✅ أخذتها</button>' +
          '<button class="simple-btn simple-btn-outline" onclick="_simpleSnooze()">⏰ تأجيل 10 دقائق</button>' +
          '<button class="simple-btn simple-btn-outline" onclick="_simpleSpeak()">🔊 أعد القراءة</button>' +
          '</div>';
        /* قراءة صوتية تلقائية إذا كان النطق مفعّلاً */
        if (appData.tts) {
          setTimeout(function () { _simpleSpeak(); }, 400);
        }
      }
    }
    el.innerHTML = html;
  } catch (e) {
    console.error("خطأ في renderSimpleHome:", e);
  }
}

/* مفتاح وضع كبار السن في الإعدادات */
function renderSimpleModeToggle() {
  try {
    var section = document.getElementById("settingsSection");
    if (!section) return;
    var container = document.getElementById("simpleModeToggle");
    if (!container) {
      container = document.createElement("div");
      container.id = "simpleModeToggle";
      section.appendChild(container);
    }
    var on = isSimpleMode();
    container.innerHTML =
      '<div class="report-card" style="padding:16px;margin:12px 0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">' +
      '<div style="flex:1;min-width:160px;">' +
      '<div style="font-weight:800;font-size:1rem;">🧓 وضع كبار السن</div>' +
      '<div style="font-size:.8rem;color:var(--text-light,#64748b);margin-top:4px;">شاشة واحدة بسيطة بأزرار كبيرة</div>' +
      '</div>' +
      '<button class="btn ' + (on ? "btn-primary" : "btn-outline") + '" onclick="toggleSimpleMode()" ' +
      'style="padding:10px 18px;font-size:.9rem;flex-shrink:0;">' +
      (on ? "✅ مفعّل" : "تفعيل") + '</button>' +
      '</div>' +
      '</div>';
  } catch (e) {
    console.error("خطأ في renderSimpleModeToggle:", e);
  }
}

/* ============================================================
   معالج الإعداد السريع
   ============================================================ */

function shouldShowQuickSetup() {
  try {
    var meds = appData.medications || [];
    if (meds.length > 0) return false;
    return localStorage.getItem(_simpleKey("_setupDone")) === null;
  } catch (e) {
    return false;
  }
}

function markSetupDone() {
  try {
    localStorage.setItem(_simpleKey("_setupDone"), "1");
  } catch (e) {
    console.error("خطأ في markSetupDone:", e);
  }
}

/* حالة المعالج */
var _simpleSetupState = { step: 1, name: "", times: [], customTime: "" };

/* ضمان وجود نافذة المعالج */
function _simpleEnsureSetupOverlay() {
  var overlay = document.getElementById("quickSetupOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "quickSetupOverlay";
    overlay.className = "modal-overlay";
    overlay.innerHTML = '<div class="modal" id="quickSetupCard" style="max-width:420px;"></div>';
    document.body.appendChild(overlay);
  }
  overlay.classList.add("open");
  return overlay;
}

/* إغلاق نافذة المعالج */
function _simpleCloseSetup() {
  try {
    var overlay = document.getElementById("quickSetupOverlay");
    if (overlay) overlay.classList.remove("open");
  } catch (e) {
    console.error("خطأ في _simpleCloseSetup:", e);
  }
}

/* رسم خطوة المعالج الحالية */
function _simpleRenderSetupStep() {
  try {
    var card = document.getElementById("quickSetupCard");
    if (!card) return;
    var step = _simpleSetupState.step;
    var header =
      '<div class="modal-header">' +
      '<h3>🚀 الإعداد السريع</h3>' +
      '<button class="modal-close" onclick="_simpleCloseSetup()">✕</button>' +
      '</div>';
    var html = header;
    if (step === 1) {
      html +=
        '<div class="setup-step-title">💊 ما اسم الدواء؟</div>' +
        '<input type="text" id="setupMedName" class="setup-input" placeholder="مثال: جلوكوفاج 500" value="' +
        _simpleEscAttr(_simpleSetupState.name) + '">' +
        '<div class="setup-nav">' +
        '<button class="btn btn-outline" onclick="_simpleSetupSkip()" style="flex:1;">تخطي</button>' +
        '<button class="btn btn-primary" onclick="_simpleSetupNext()" style="flex:2;">التالي ←</button>' +
        '</div>';
    } else if (step === 2) {
      var sel1 = _simpleSetupState.times.indexOf("08:00") >= 0 ? " selected" : "";
      var sel2 = _simpleSetupState.times.indexOf("13:00") >= 0 ? " selected" : "";
      var sel3 = _simpleSetupState.times.indexOf("20:00") >= 0 ? " selected" : "";
      html +=
        '<div class="setup-step-title">🕐 متى تأخذه؟</div>' +
        '<button class="setup-time-btn' + sel1 + '" onclick="_simpleSetupToggleTime(\'08:00\')">صباحاً ☀️ (8:00)</button>' +
        '<button class="setup-time-btn' + sel2 + '" onclick="_simpleSetupToggleTime(\'13:00\')">ظهراً 🌤 (13:00)</button>' +
        '<button class="setup-time-btn' + sel3 + '" onclick="_simpleSetupToggleTime(\'20:00\')">مساءً 🌙 (20:00)</button>' +
        '<div class="setup-custom">' +
        '<input type="time" id="setupCustomTime" class="setup-input" value="09:00" style="flex:1;">' +
        '<button class="btn btn-outline" onclick="_simpleSetupAddCustomTime()" style="flex-shrink:0;">➕ تخصيص</button>' +
        '</div>' +
        '<div class="setup-nav">' +
        '<button class="btn btn-outline" onclick="_simpleSetupSkip()" style="flex:1;">تخطي</button>' +
        '<button class="btn btn-primary" onclick="_simpleSetupNext()" style="flex:2;">التالي ←</button>' +
        '</div>';
    } else if (step === 3) {
      html +=
        '<div class="setup-step-title">🔁 كم مرة في اليوم؟</div>' +
        '<button class="setup-time-btn" onclick="_simpleSetupChooseCount(1)">مرة واحدة</button>' +
        '<button class="setup-time-btn" onclick="_simpleSetupChooseCount(2)">مرتين</button>' +
        '<button class="setup-time-btn" onclick="_simpleSetupChooseCount(3)">3 مرات</button>' +
        '<div class="setup-nav">' +
        '<button class="btn btn-outline" onclick="_simpleSetupSkip()" style="flex:1;">تخطي</button>' +
        '</div>';
    }
    card.innerHTML = html;
  } catch (e) {
    console.error("خطأ في _simpleRenderSetupStep:", e);
  }
}

/* الانتقال للخطوة التالية */
function _simpleSetupNext() {
  try {
    if (_simpleSetupState.step === 1) {
      var input = document.getElementById("setupMedName");
      var name = input ? input.value.trim() : "";
      if (!name) {
        _simpleToast("اكتب اسم الدواء أولاً", "error");
        return;
      }
      _simpleSetupState.name = name;
      _simpleSetupState.step = 2;
    } else if (_simpleSetupState.step === 2) {
      if (_simpleSetupState.times.length === 0) {
        _simpleToast("اختر وقتاً واحداً على الأقل", "error");
        return;
      }
      _simpleSetupState.step = 3;
    }
    _simpleRenderSetupStep();
  } catch (e) {
    console.error("خطأ في _simpleSetupNext:", e);
  }
}

/* تبديل اختيار وقت جاهز */
function _simpleSetupToggleTime(t) {
  try {
    var idx = _simpleSetupState.times.indexOf(t);
    if (idx >= 0) _simpleSetupState.times.splice(idx, 1);
    else _simpleSetupState.times.push(t);
    _simpleRenderSetupStep();
  } catch (e) {
    console.error("خطأ في _simpleSetupToggleTime:", e);
  }
}

/* إضافة وقت مخصص */
function _simpleSetupAddCustomTime() {
  try {
    var input = document.getElementById("setupCustomTime");
    if (!input || !input.value) return;
    var t = input.value;
    if (_simpleSetupState.times.indexOf(t) < 0) _simpleSetupState.times.push(t);
    _simpleRenderSetupStep();
  } catch (e) {
    console.error("خطأ في _simpleSetupAddCustomTime:", e);
  }
}

/* تخطي المعالج */
function _simpleSetupSkip() {
  try {
    markSetupDone();
    _simpleCloseSetup();
    _simpleToast("يمكنك إضافة الأدوية لاحقاً من زر +", "success");
  } catch (e) {
    console.error("خطأ في _simpleSetupSkip:", e);
  }
}

/* إنهاء المعالج وإنشاء الدواء */
function _simpleSetupChooseCount(n) {
  try {
    var times = _simpleSetupState.times.slice().sort();
    if (times.length === 0) {
      if (n === 1) times = ["08:00"];
      else if (n === 2) times = ["08:00", "20:00"];
      else times = ["08:00", "13:00", "20:00"];
    } else if (times.length > n) {
      times = times.slice(0, n);
    }
    var name = (_simpleSetupState.name || "").trim();
    if (!name) {
      _simpleToast("أدخل اسم الدواء أولاً", "error");
      return;
    }
    var med = {
      id: (typeof uid === "function") ? uid() : String(Date.now()),
      name: name,
      dosage: "حسب الوصفة",
      form: "أقراص",
      times: times,
      days: [0, 1, 2, 3, 4, 5, 6],
      quantity: 30,
      refill: 5,
      active: true,
      log: {}
    };
    appData.medications.push(med);
    if (typeof saveData === "function") saveData();
    markSetupDone();
    _simpleCloseSetup();
    if (typeof renderAll === "function") renderAll();
    if (isSimpleMode() && typeof renderSimpleHome === "function") renderSimpleHome();
    _simpleToast("🎉 تمت إضافة دوائك الأول!");
  } catch (e) {
    console.error("خطأ في _simpleSetupChooseCount:", e);
  }
}

/* فتح معالج الإعداد السريع */
function startQuickSetup() {
  try {
    _simpleInjectStyles();
    _simpleSetupState = { step: 1, name: "", times: [], customTime: "" };
    _simpleEnsureSetupOverlay();
    _simpleRenderSetupStep();
  } catch (e) {
    console.error("خطأ في startQuickSetup:", e);
  }
}

/* واجهة القائد — تعادل startQuickSetup */
function renderQuickSetupModal() {
  startQuickSetup();
}

/* ============================================================
   علم الجاهزية
   ============================================================ */
window.FEATURES_SIMPLE_READY = true;