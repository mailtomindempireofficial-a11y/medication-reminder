/* ============================================================
   features-encyclopedia.js — البحث المرتب في دليل الأدوية 📚
   يمنع القائمة الطويلة: شاشة ترحيب عند حقل فارغ + نتائج مرتبة
   بالصلة فور الكتابة + تتبع الأدوية الأكثر مشاهدة
   ES5 خالص — بدون let/const/arrow/async/template literals
   ============================================================ */

"use strict";

/* ---------- مفتاح تتبع المشاهدات ---------- */
var ENCY_RECENT_KEY = "medReminder_v1_encyRecent";

/* ---------- الأدوية الأكثر شيوعاً (تُعرض عند حقل فارغ) ---------- */
var ENCY_POPULAR_NAMES = [
  "باراسيتامول",
  "إيبوبروفين",
  "أموكسيسيلين",
  "ميتفورمين",
  "أملوديبين",
  "أوميبرازول"
];

/* ---------- تعقيم النصوص ---------- */
function _encyEsc(s) {
  if (typeof escapeHtml === "function") return escapeHtml(s);
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- تعقيم قيمة داخل onclick ---------- */
function _encyEscAttr(s) {
  return String(s == null ? "" : s).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

/* ---------- قراءة الأدوية الأكثر مشاهدة من localStorage ---------- */
function _encyGetRecent() {
  try {
    var raw = localStorage.getItem(ENCY_RECENT_KEY);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

/* ---------- حفظ الأدوية الأكثر مشاهدة ---------- */
function _encySaveRecent(list) {
  try {
    localStorage.setItem(ENCY_RECENT_KEY, JSON.stringify(list));
  } catch (e) {}
}

/* ---------- تسجيل مشاهدة دواء (تُستدعى عند النقر) ---------- */
function _encyTrackClick(arName) {
  try {
    var list = _encyGetRecent();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] === arName) { idx = i; break; }
    }
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(arName);
    if (list.length > 8) list = list.slice(0, 8);
    _encySaveRecent(list);
  } catch (e) {}
}

/* ---------- فتح تفاصيل الدواء مع تتبع المشاهدة ---------- */
function _encyOpenDetails(arName) {
  _encyTrackClick(arName);
  if (typeof showDrugDetails === "function") showDrugDetails(arName);
}

/* ---------- تطبيع اسم للمقارنة (يستخدم normalizeName العامة إن وُجدت) ---------- */
function _encyNorm(s) {
  if (typeof normalizeName === "function") return normalizeName(s);
  return String(s || "").toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim();
}

/* ---------- حساب درجة الصلة للبحث ---------- */
function _encyScore(d, nq) {
  var ar = _encyNorm(d.ar);
  var en = _encyNorm(d.en);
  if (ar.indexOf(nq) === 0) return 0;          /* الاسم العربي يبدأ بالمطابقة */
  if (en.indexOf(nq) === 0) return 1;          /* الاسم الإنجليزي يبدأ بالمطابقة */
  if (ar.indexOf(nq) !== -1) return 2;         /* الاسم العربي يحتوي */
  if (en.indexOf(nq) !== -1) return 3;         /* الاسم الإنجليزي يحتوي */
  if (Array.isArray(d.brands)) {
    for (var i = 0; i < d.brands.length; i++) {
      if (_encyNorm(d.brands[i]).indexOf(nq) !== -1) return 4; /* علامة تجارية */
    }
  }
  if (d.cat && _encyNorm(d.cat).indexOf(nq) !== -1) return 5;  /* التصنيف */
  return -1;
}

/* ---------- البحث المرتب بالصلة ---------- */
function _encySearch(drugs, q, cat) {
  var nq = _encyNorm(q);
  var scored = [];
  for (var i = 0; i < drugs.length; i++) {
    var d = drugs[i];
    if (!d) continue;
    if (cat && (typeof broadCategory === "function" ? broadCategory(d.cat) : d.cat) !== cat) continue;
    var score = nq ? _encyScore(d, nq) : 0;
    if (nq && score === -1) continue;
    scored.push({ d: d, score: score });
  }
  scored.sort(function (a, b) { return a.score - b.score; });
  var out = [];
  for (var j = 0; j < scored.length; j++) out.push(scored[j].d);
  return out;
}

/* ---------- بطاقة نتيجة دواء ---------- */
function _encyCard(d) {
  return '<div class="vitals-card" style="padding:12px 14px;cursor:pointer;" ' +
    'onclick="_encyOpenDetails(\'' + _encyEscAttr(d.ar) + '\')">' +
    '<div class="vitals-header">' +
    '<div>' +
    '<strong>' + _encyEsc(d.ar) + '</strong>' +
    '<span style="font-size:0.75rem;color:var(--text-muted);"> ' + _encyEsc(d.en) + ' · ' + _encyEsc(d.cat) + '</span>' +
    '</div>' +
    '<span style="font-size:0.8rem;color:var(--primary);">التفاصيل ←</span>' +
    '</div>' +
    '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">' + _encyEsc(d.uses) + '</div>' +
    '</div>';
}

/* ---------- شاشة الترحيب (حقل فارغ) ---------- */
function _encyWelcome(drugs) {
  var html = '';
  html += '<div class="empty-state" style="margin-bottom:14px;">';
  html += '<div class="emoji">🔍</div>';
  html += '<h3>اكتب اسم الدواء للبحث...</h3>';
  html += '<p>ابحث بالعربية أو الإنجليزية أو اسم العلامة التجارية — ستحصل على النتائج مرتبة حسب الأقرب</p>';
  html += '</div>';

  /* التصنيفات كأزرار */
  var cats = {};
  for (var i = 0; i < drugs.length; i++) {
    var c = (typeof broadCategory === "function") ? broadCategory(drugs[i].cat) : (drugs[i].cat || "أخرى");
    cats[c] = true;
  }
  var catNames = Object.keys(cats).sort(function (a, b) { return a.localeCompare(b, "ar"); });
  if (catNames.length) {
    html += '<div style="font-size:.85rem;font-weight:800;color:var(--text,#134e4a);margin-bottom:8px;">🗂️ تصفح حسب التصنيف</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">';
    for (var j = 0; j < catNames.length; j++) {
      html += '<button class="btn btn-outline" style="padding:8px 14px;font-size:.8rem;" ' +
        'onclick="_encyPickCategory(\'' + _encyEscAttr(catNames[j]) + '\')">' + _encyEsc(catNames[j]) + '</button>';
    }
    html += '</div>';
  }

  /* الأكثر شيوعاً */
  var popular = [];
  for (var k = 0; k < ENCY_POPULAR_NAMES.length; k++) {
    var pn = _encyNorm(ENCY_POPULAR_NAMES[k]);
    for (var m = 0; m < drugs.length; m++) {
      if (_encyNorm(drugs[m].ar) === pn) { popular.push(drugs[m]); break; }
    }
  }
  if (popular.length) {
    html += '<div style="font-size:.85rem;font-weight:800;color:var(--text,#134e4a);margin-bottom:8px;">⭐ الأكثر شيوعاً</div>';
    for (var n = 0; n < popular.length; n++) html += _encyCard(popular[n]);
  }

  /* الأكثر مشاهدة مؤخراً */
  var recent = _encyGetRecent();
  var recentDrugs = [];
  for (var r = 0; r < recent.length; r++) {
    for (var s = 0; s < drugs.length; s++) {
      if (drugs[s].ar === recent[r]) { recentDrugs.push(drugs[s]); break; }
    }
  }
  if (recentDrugs.length) {
    html += '<div style="font-size:.85rem;font-weight:800;color:var(--text,#134e4a);margin:16px 0 8px;">🕘 الأكثر مشاهدة مؤخراً</div>';
    for (var t = 0; t < recentDrugs.length; t++) html += _encyCard(recentDrugs[t]);
  }

  return html;
}

/* ---------- اختيار تصنيف من أزرار الترحيب ---------- */
function _encyPickCategory(catName) {
  var sel = document.getElementById("encyCategory");
  if (!sel) return;
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === catName) {
      sel.value = catName;
      break;
    }
  }
  renderEncyclopedia();
}

/* ============================================================
   renderEncyclopedia — إعادة تعريف (تُحمَّل بعد app.js)
   ============================================================ */
function renderEncyclopedia() {
  var container = document.getElementById("encyList");
  if (!container) return;
  try {
    var q = (document.getElementById("encySearch").value || "").trim();
    var cat = document.getElementById("encyCategory").value;
    var drugs = (typeof getFullEncyclopedia === "function") ? getFullEncyclopedia() : [];
    var countEl = document.getElementById("encyCount");

    /* حقل فارغ + لا تصنيف → شاشة ترحيب (بدون قائمة طويلة) */
    if (!q && !cat) {
      if (countEl) countEl.textContent = "";
      container.innerHTML = _encyWelcome(drugs);
      return;
    }

    /* بحث أو تصنيف → نتائج مرتبة بالصلة */
    var results = _encySearch(drugs, q, cat);
    if (countEl) countEl.textContent = results.length + " دواء";

    if (!results.length) {
      container.innerHTML = '<div class="interaction-safe">لا توجد نتائج مطابقة — جرّب كلمة أخرى أو ابحث عبر الإنترنت بالأسفل 🌐</div>';
      return;
    }

    var html = '';
    if (q) html += '<div style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px;">🔎 نتائج البحث عن "' + _encyEsc(q) + '" — مرتبة حسب الأقرب</div>';
    var limit = results.length > 60 ? 60 : results.length;
    for (var i = 0; i < limit; i++) html += _encyCard(results[i]);
    if (results.length > limit) {
      html += '<div style="text-align:center;font-size:.8rem;color:var(--text-muted);padding:8px;">عرض أول ' + limit + ' من ' + results.length + ' نتيجة — حسّن كلمة البحث</div>';
    }
    container.innerHTML = html;
  } catch (err) {
    console.error("خطأ في دليل الأدوية:", err);
  }
}

/* ============================================================
   البحث الصوتي بالعربية 🎤 — Web Speech API (ar-SA)
   يملأ حقل البحث فوراً ويشغّل البحث الموجود دون كسره
   ============================================================ */

var _voiceSearchRec = null;
var _voiceSearchBtn = null;

/* هل المتصفح يدعم التعرف الصوتي؟ */
function _voiceSearchSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* حالة زر الميكروفون (استماع / عادي) */
function _voiceSearchSetListening(btn, listening) {
  if (!btn) return;
  if (listening) {
    btn.classList.add("listening");
    btn.textContent = "⏹";
    btn.title = "إيقاف الاستماع";
  } else {
    btn.classList.remove("listening");
    btn.textContent = "🎤";
    btn.title = "ابحث بالصوت";
  }
}

/* إيقاف أي استماع جارٍ */
function _voiceSearchStop() {
  if (_voiceSearchRec) {
    try { _voiceSearchRec.stop(); } catch (e) {}
    _voiceSearchRec = null;
  }
  _voiceSearchSetListening(_voiceSearchBtn, false);
  _voiceSearchBtn = null;
}

/* البحث الصوتي العام — inputId: حقل البحث، onResult: دالة البحث بعد التعرف */
function startVoiceSearch(inputId, onResult) {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (typeof showToast === "function") {
      showToast("المتصفح لا يدعم البحث الصوتي — جرّب Chrome أو Edge", "info");
    }
    return;
  }
  var input = document.getElementById(inputId);
  if (!input) return;
  var btn = document.getElementById("voiceSearchBtn_" + inputId);

  /* ضغطة ثانية أثناء الاستماع = إيقاف */
  if (_voiceSearchRec) {
    _voiceSearchStop();
    return;
  }

  var rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  _voiceSearchRec = rec;
  _voiceSearchBtn = btn;
  _voiceSearchSetListening(btn, true);
  if (typeof showToast === "function") showToast("🎤 تحدث الآن...", "success");

  rec.onresult = function (e) {
    try {
      var text = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text) {
        input.value = text;
        if (typeof onResult === "function") onResult(text);
        if (typeof showToast === "function") showToast("✓ تم التعرف: " + text, "success");
      }
    } catch (err) {
      console.error("خطأ في نتيجة البحث الصوتي:", err);
    }
  };

  rec.onerror = function (e) {
    try {
      var msg = "تعذر التعرف على الصوت";
      if (e && e.error === "not-allowed") msg = "تم رفض إذن الميكروفون";
      else if (e && e.error === "no-speech") msg = "لم أسمع صوتاً — حاول مجدداً";
      else if (e && e.error === "network") msg = "التعرف الصوتي يحتاج اتصالاً بالإنترنت";
      if (typeof showToast === "function") showToast(msg, "error");
    } catch (err) {}
    _voiceSearchStop();
  };

  rec.onend = function () {
    _voiceSearchSetListening(btn, false);
    _voiceSearchRec = null;
    _voiceSearchBtn = null;
  };

  try {
    rec.start();
  } catch (err) {
    console.error("خطأ في بدء البحث الصوتي:", err);
    _voiceSearchStop();
  }
}

/* البحث الصوتي في دليل الأدوية (الموسوعة) */
function startEncyVoiceSearch() {
  startVoiceSearch("encySearch", function () {
    renderEncyclopedia();
  });
}

/* البحث الصوتي في حقل البحث الرئيسي */
function startHomeVoiceSearch() {
  startVoiceSearch("searchInput", function () {
    handleSearch(document.getElementById("searchInput").value);
  });
}

/* إخفاء أزرار الميكروفون إن كان المتصفح لا يدعم التعرف الصوتي */
function _voiceSearchInit() {
  if (_voiceSearchSupported()) return;
  var btns = document.querySelectorAll(".voice-search-btn");
  for (var i = 0; i < btns.length; i++) {
    btns[i].style.display = "none";
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _voiceSearchInit);
  } else {
    _voiceSearchInit();
  }
}

/* ---------- علم الجاهزية ---------- */
window.FEATURES_ENCYCLOPEDIA_READY = true;