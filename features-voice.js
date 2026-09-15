/* ============================================================
   تذكير الدواء — تحسين التحكم الصوتي (features-voice.js)
   الوحدة 4: أوامر صوتية كاملة — إضافة دواء، تسجيل جرعة،
   عرض الجرعة القادمة، فحص الأعراض، المساعدة الصوتية
   ES5 خالص — بدون let/const/arrow/async/template literals
   ============================================================ */

"use strict";

/* ---------- الأوامر الصوتية المدعومة ---------- */
var VOICE_COMMANDS = [
  { cmd: "أضف دواء", example: "أضف دواء باراسيتامول", desc: "يفتح نافذة الإضافة بالاسم" },
  { cmd: "خذ دوائي", example: "خذ دوائي", desc: "يسجل الجرعة القادمة كأنك أخذتها" },
  { cmd: "أخذت", example: "أخذت دوائي", desc: "يسجل الجرعة القادمة كأنك أخذتها" },
  { cmd: "أين دوائي", example: "أين دوائي؟", desc: "يعرض الجرعة القادمة" },
  { cmd: "الجرعة القادمة", example: "ما هي الجرعة القادمة؟", desc: "يعرض الجرعة القادمة" },
  { cmd: "أشعر بـ", example: "أشعر بصداع", desc: "يفحص الأعراض ويعطي نصيحة" },
  { cmd: "مساعدة", example: "مساعدة", desc: "يعرض قائمة الأوامر" }
];

/* ---------- حالة الاستماع ---------- */
var _voiceRecognition = null;
var _voiceIndicator = null;
var _voiceListening = false;

/* ---------- تهيئة الأصوات (تحميل مسبق للأصوات العربية) ---------- */
if (window.speechSynthesis) {
  var _voiceLoadVoices = function () {
    try { window.speechSynthesis.getVoices(); } catch (e) {}
  };
  _voiceLoadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = _voiceLoadVoices;
  }
}

/* ---------- أدوات مساعدة داخلية ---------- */
function _voiceNormalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function _voiceEsc(str) {
  if (typeof escapeHtml === "function") {
    try { return escapeHtml(str); } catch (e) {}
  }
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _voiceTimeToMinutes(t) {
  if (typeof timeToMinutes === "function") {
    try { return timeToMinutes(t); } catch (e) {}
  }
  var parts = String(t).split(":");
  var h = parseInt(parts[0], 10) || 0;
  var m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function _voiceNowMinutes() {
  var d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function _voiceTodayStr() {
  if (typeof todayStr === "function") {
    try { return todayStr(); } catch (e) {}
  }
  return new Date().toISOString().slice(0, 10);
}

function _voiceNextDose() {
  var doses = [];
  if (typeof getTodayDoses === "function") {
    try { doses = getTodayDoses(); } catch (e) { doses = []; }
  }
  if (!doses || !doses.length) return null;
  var now = _voiceNowMinutes();
  var next = null;
  var i;
  for (i = 0; i < doses.length; i++) {
    if (!doses[i].taken && _voiceTimeToMinutes(doses[i].time) >= now) {
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

function _voiceEnsurePulse() {
  if (document.getElementById("voicePulseStyle")) return;
  var st = document.createElement("style");
  st.id = "voicePulseStyle";
  st.textContent = "@keyframes voicePulse{0%,100%{opacity:1}50%{opacity:.55}}";
  document.head.appendChild(st);
}

function _voiceShowIndicator() {
  _voiceHideIndicator();
  try {
    _voiceEnsurePulse();
    var el = document.createElement("div");
    el.id = "voiceListeningIndicator";
    el.textContent = "🎤 جارٍ الاستماع...";
    el.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0d9488;color:#fff;padding:10px 18px;border-radius:30px;font-weight:700;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,.25);animation:voicePulse 1.2s infinite;";
    document.body.appendChild(el);
    _voiceIndicator = el;
  } catch (e) {
    console.error("voice indicator error:", e);
  }
}

function _voiceHideIndicator() {
  if (_voiceIndicator) {
    try { document.body.removeChild(_voiceIndicator); } catch (e) {}
    _voiceIndicator = null;
  }
}

/* ---------- معالجات الأوامر ---------- */
function _voiceHandleAdd(norm) {
  var name = "";
  var idx = norm.indexOf("اضف دواء");
  if (idx === -1) idx = norm.indexOf("أضف دواء");
  if (idx !== -1) {
    name = norm.substring(idx + 8).trim();
  } else {
    idx = norm.indexOf("اضف");
    if (idx === -1) idx = norm.indexOf("أضف");
    if (idx !== -1) name = norm.substring(idx + 4).trim();
  }
  name = name.replace(/^(دواء|الدواء)\s+/, "");
  if (!name) {
    showToast("قل: أضف دواء (اسم الدواء)", "info");
    speakText("قل اسم الدواء بعد كلمة أضف دواء");
    return;
  }
  if (typeof openMedModal === "function") {
    openMedModal("");
    var nameEl = document.getElementById("medName");
    if (nameEl) nameEl.value = name;
    showToast("✅ فتحت نافذة الإضافة: " + name, "success");
    speakText("تم فتح نافذة إضافة دواء " + name);
  } else {
    showToast("نافذة الإضافة غير متاحة حالياً", "error");
  }
}

function _voiceHandleTake() {
  var next = _voiceNextDose();
  if (!next) {
    showToast("لا توجد جرعات قادمة اليوم 🎉", "info");
    speakText("لا توجد جرعات قادمة اليوم");
    return;
  }
  if (typeof markDose === "function") {
    markDose(next.medId, next.time, _voiceTodayStr(), true);
    showToast("✅ تم تسجيل الجرعة: " + next.medName, "success");
    speakText("أحسنت! تم تسجيل جرعتك");
    if (typeof renderToday === "function") { try { renderToday(); } catch (e) {} }
    if (typeof updateSummary === "function") { try { updateSummary(); } catch (e) {} }
  } else {
    showToast("تعذر تسجيل الجرعة", "error");
  }
}

function _voiceHandleNext() {
  var next = _voiceNextDose();
  if (!next) {
    showToast("لا توجد جرعات قادمة اليوم 🎉", "info");
    speakText("لا توجد جرعات قادمة اليوم");
    return;
  }
  var msg = "الجرعة القادمة: " + next.medName + " الساعة " + next.time;
  showToast(msg, "info");
  speakText(msg);
}

function _voiceHandleSymptom(norm) {
  var symptom = "";
  var idx = norm.indexOf("أشعر");
  if (idx === -1) idx = norm.indexOf("اشعر");
  if (idx !== -1) {
    symptom = norm.substring(idx + 5).trim();
  }
  symptom = symptom.replace(/^[ب\s]+/, "");
  if (!symptom) {
    showToast("قل: أشعر بـ (العرض الذي تعاني منه)", "info");
    speakText("قل العرض الذي تشعر به بعد كلمة أشعر");
    return;
  }
  if (typeof symptomChecker === "function") {
    var result = symptomChecker(symptom);
    if (result) {
      var plain = result.replace(/<[^>]+>/g, " ");
      showToast(plain, "info");
      speakText(plain);
    } else {
      showToast("لم أجد معلومات عن هذا العرض — استشر طبيبك", "info");
      speakText("لم أجد معلومات عن هذا العرض، استشر طبيبك");
    }
  } else {
    showToast("فحص الأعراض غير متاح حالياً", "error");
  }
}

function _voiceHandleHelp() {
  var lines = [];
  for (var i = 0; i < VOICE_COMMANDS.length; i++) {
    lines.push(VOICE_COMMANDS[i].cmd + " — " + VOICE_COMMANDS[i].desc);
  }
  var msg = "الأوامر الصوتية المتاحة: " + lines.join("، ");
  showToast(msg, "info");
  speakText("الأوامر المتاحة: " + lines.join("، "));
}

/* ---------- الواجهات العامة ---------- */
function startVoiceCommand() {
  try {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      showToast("المتصفح لا يدعم التعرف الصوتي", "error");
      return;
    }
    if (_voiceListening) return;
    var rec = new SR();
    rec.lang = "ar-SA";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = true;
    _voiceRecognition = rec;
    _voiceListening = true;
    _voiceShowIndicator();
    rec.onresult = function (e) {
      try {
        var text = "";
        var i;
        for (i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            text += e.results[i][0].transcript;
          }
        }
        if (text) processVoiceCommand(text);
      } catch (err) {
        console.error("voice onresult error:", err);
      }
    };
    rec.onerror = function (e) {
      try {
        var msg = "تعذر التعرف على الصوت";
        if (e && e.error === "not-allowed") msg = "تم رفض إذن الميكروفون";
        else if (e && e.error === "no-speech") msg = "لم أسمع صوتاً — حاول مجدداً";
        else if (e && e.error === "network") msg = "خطأ في الشبكة — التعرف الصوتي يحتاج إنترنت";
        showToast(msg, "error");
      } catch (err) {
        console.error("voice onerror:", err);
      }
    };
    rec.onend = function () {
      if (_voiceListening) {
        setTimeout(function () {
          if (_voiceListening && _voiceRecognition) {
            try { _voiceRecognition.start(); } catch (err) {
              _voiceListening = false;
              _voiceHideIndicator();
            }
          }
        }, 300);
      }
    };
    rec.start();
  } catch (err) {
    console.error("startVoiceCommand error:", err);
    _voiceListening = false;
    _voiceHideIndicator();
    showToast("تعذر بدء الاستماع الصوتي", "error");
  }
}

function stopVoiceCommand() {
  _voiceListening = false;
  if (_voiceRecognition) {
    try { _voiceRecognition.stop(); } catch (e) {}
    _voiceRecognition = null;
  }
  _voiceHideIndicator();
  showToast("⏹ تم إيقاف الاستماع", "info");
}

function processVoiceCommand(text) {
  try {
    var norm = _voiceNormalize(text);
    if (!norm) return;
    if (norm.indexOf("اضف دواء") !== -1 || norm.indexOf("أضف دواء") !== -1 ||
        norm.indexOf("اضف") !== -1 || norm.indexOf("أضف") !== -1) {
      _voiceHandleAdd(norm);
      return;
    }
    if (norm.indexOf("أخذت") !== -1 || norm.indexOf("خذ") !== -1) {
      _voiceHandleTake();
      return;
    }
    if (norm.indexOf("أين") !== -1 || norm.indexOf("الجرعة القادمة") !== -1 || norm.indexOf("متى") !== -1) {
      _voiceHandleNext();
      return;
    }
    if (norm.indexOf("أشعر") !== -1 || norm.indexOf("اشعر") !== -1) {
      _voiceHandleSymptom(norm);
      return;
    }
    if (norm.indexOf("مساعدة") !== -1 || norm.indexOf("ساعدني") !== -1) {
      _voiceHandleHelp();
      return;
    }
    speakText("لم أفهم الأمر. قل: مساعدة لمعرفة الأوامر");
    showToast("لم أفهم الأمر — قل: مساعدة لمعرفة الأوامر", "error");
  } catch (e) {
    console.error("processVoiceCommand error:", e);
    showToast("حدث خطأ أثناء معالجة الأمر", "error");
  }
}

function speakText(text) {
  try {
    if (!window.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(String(text));
    u.lang = "ar-SA";
    u.rate = 0.95;
    var voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.indexOf("ar") === 0) {
          u.voice = voices[i];
          break;
        }
      }
    }
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.error("speakText error:", e);
  }
}

function renderVoiceHelp() {
  try {
    var container = document.getElementById("homeTab");
    if (!container) container = document.getElementById("settingsSection");
    if (!container) return;
    if (document.getElementById("voiceHelpCard")) return;
    var html = '<div class="report-card" id="voiceHelpCard" style="margin:12px 0;">' +
      '<div class="section-title">🎤 الأوامر الصوتية</div>' +
      '<p style="font-size:.85rem;color:var(--text-muted);margin:0 0 10px;">قل أحد الأوامر التالية بصوت واضح:</p>' +
      '<ul style="margin:0 0 12px;padding-right:18px;line-height:1.9;">';
    for (var i = 0; i < VOICE_COMMANDS.length; i++) {
      var c = VOICE_COMMANDS[i];
      html += '<li><strong>' + _voiceEsc(c.cmd) + '</strong> — ' + _voiceEsc(c.desc) +
        '<br><span style="font-size:.78rem;color:var(--text-muted);">مثال: ' + _voiceEsc(c.example) + '</span></li>';
    }
    html += '</ul>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button class="btn btn-primary" onclick="startVoiceCommand()">🎤 ابدأ الاستماع</button>' +
      '<button class="btn btn-outline" onclick="stopVoiceCommand()">⏹ إيقاف</button>' +
      '</div></div>';
    container.insertAdjacentHTML("beforeend", html);
  } catch (e) {
    console.error("renderVoiceHelp error:", e);
  }
}

/* ---------- علم الجاهزية ---------- */
window.FEATURES_VOICE_READY = true;