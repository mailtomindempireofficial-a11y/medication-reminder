/* ============================================================
   features-tour.js — الجولة التعليمية المبسطة
   تشرح كل تبويب خطوة بخطوة لأي مستخدم
   ============================================================ */

"use strict";

/* ---------- خطوات الجولة ---------- */
var TOUR_STEPS = [
  {
    target: null,
    title: "أهلاً بك في تذكير الدواء 👋",
    desc: "تطبيقك العربي لإدارة الأدوية — تذكيرات، تفاعلات، تقارير، وأكثر. سننطلق في جولة سريعة لشرح كل ميزة.",
    icon: "💊"
  },
  {
    target: '[data-tab="home"]',
    title: "🏠 الرئيسية",
    desc: "أدويتك اليوم + جرعاتك + حالة الالتزام. هنا تبدأ يومك وترى كل ما تحتاجه دفعة واحدة.",
    icon: "🏠"
  },
  {
    target: '[data-tab="vitals"]',
    title: "💓 الحيوية",
    desc: "سجل وزنك وضغطك ودرجة حرارتك. تتبع تغيّرات صحتك مع الوقت.",
    icon: "💓"
  },
  {
    target: '[data-tab="symptoms"]',
    title: "🩺 الأعراض",
    desc: "سجل أي عرض تشعر به — صداع، حرارة، ألماً. ربطه بالأدوية لفهم أفضل.",
    icon: "🩺"
  },
  {
    target: '[data-tab="report"]',
    title: "📊 التقارير",
    desc: "التزامك بالجرعات + تقرير الطبيب + تحليلات شاملة. شاركها مع طبيبك.",
    icon: "📊"
  },
  {
    target: '[data-tab="family"]',
    title: "👨‍👩‍👧‍👦 العائلة",
    desc: "أدوية كل فرد من عائلتك. أضف أبناءك وأتبع جرعاتهم بشكل منفصل.",
    icon: "👨‍👩‍👧‍👦"
  },
  {
    target: '[data-tab="encyclopedia"]',
    title: "📚 الدليل",
    desc: "ابحث عن أي دواء + اعرف التفاعلات والجرعات + المساعد الذكي جاهز للإجابة.",
    icon: "📚"
  },
  {
    target: '[data-tab="vaccines"]',
    title: "💉 التطعيمات",
    desc: "جدول تطعيمات الأطفال — تتبّع ما تمّ وما تبقّى مع تنبيهات التوقيت.",
    icon: "💉"
  },
  {
    target: '[data-tab="safety"]',
    title: "🛡️ السلامة",
    desc: "بطاقة الطوارئ + حاسبة جرعات الأطفال + تنبيهات انتهاء الصلاحية. سلامتك أولاً!",
    icon: "🛡️"
  },
  {
    target: '[data-tab="settings"]',
    title: "⚙️ الإعدادات",
    desc: "إشعارات + نسخ احتياطي + مزامنة + تخصيص التطبيق حسب احتياجاتك.",
    icon: "⚙️"
  },
  {
    target: ".fab",
    title: "➕ زر الإضافة",
    desc: "أضف دواءً جديداً بضغطة واحدة. املأ البيانات وحدد الأوقات — وسجّل!",
    icon: "➕"
  },
  {
    target: "#assistantFab",
    title: "💬 المساعد",
    desc: "اسأل عن أي شيء — كم دواء عندك؟ متى الجرعة القادمة؟ هل هناك تفاعلات؟ المساعد يعرف بياناتك!",
    icon: "💬"
  }
];

/* ---------- الثوابت ---------- */
var _tourCurrentStep = 0;
var _tourOverlay = null;
var _tourHighlight = null;
var _tourBubble = null;

/* ---------- التحقق: هل نعرض الجولة؟ ---------- */
function shouldShowTour() {
  try {
    var storageBase = (typeof STORAGE_KEY !== "undefined") ? STORAGE_KEY : "medReminder_v1";
    return !localStorage.getItem(storageBase + "_tourDone");
  } catch (e) {
    return true;
  }
}

/* ---------- حفظ انتهاء الجولة ---------- */
function markTourDone() {
  try {
    var storageBase = (typeof STORAGE_KEY !== "undefined") ? STORAGE_KEY : "medReminder_v1";
    localStorage.setItem(storageBase + "_tourDone", "1");
  } catch (e) {
    console.error("تعذر حفظ حالة الجولة:", e);
  }
}

/* ---------- نافذة الترحيب ---------- */
function renderWelcomeModal() {
  try {
    if (!shouldShowTour()) return;

    var existing = document.getElementById("tour-welcome-modal");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "tour-welcome-modal";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;animation:tourFadeIn 0.3s ease";

    var card = document.createElement("div");
    card.style.cssText = "background:#fff;border-radius:20px;padding:40px 32px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;direction:rtl;font-family:sans-serif";

    var icon = document.createElement("div");
    icon.style.cssText = "font-size:64px;margin-bottom:16px";
    icon.textContent = "💊";

    var title = document.createElement("h2");
    title.style.cssText = "margin:0 0 12px;color:#0d9488;font-size:22px";
    title.textContent = "أهلاً بك في تذكير الدواء 👋";

    var desc = document.createElement("p");
    desc.style.cssText = "margin:0 0 28px;color:#666;font-size:15px;line-height:1.7";
    desc.textContent = "تطبيقك العربي لإدارة الأدوية — تذكيرات، تفاعلات، تقارير، وأكثر";

    var startBtn = document.createElement("button");
    startBtn.textContent = "🎓 ابدأ الجولة التعليمية";
    startBtn.style.cssText = "display:block;width:100%;padding:14px;margin-bottom:12px;background:#0d9488;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;transition:background 0.2s";
    startBtn.onmouseover = function () { startBtn.style.background = "#0f766e"; };
    startBtn.onmouseout = function () { startBtn.style.background = "#0d9488"; };
    startBtn.onclick = function () {
      overlay.remove();
      startTour();
    };

    var skipBtn = document.createElement("button");
    skipBtn.textContent = "تخطي";
    skipBtn.style.cssText = "display:block;width:100%;padding:14px;background:transparent;color:#999;border:1px solid #ddd;border-radius:12px;font-size:14px;cursor:pointer;transition:all 0.2s";
    skipBtn.onmouseover = function () { skipBtn.style.background = "#f5f5f5"; };
    skipBtn.onmouseout = function () { skipBtn.style.background = "transparent"; };
    skipBtn.onclick = function () {
      overlay.remove();
      markTourDone();
    };

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(startBtn);
    card.appendChild(skipBtn);
    overlay.appendChild(card);

    overlay.onclick = function (e) {
      if (e.target === overlay) {
        overlay.remove();
        markTourDone();
      }
    };

    document.body.appendChild(overlay);
  } catch (e) {
    console.error("خطأ في رسم نافذة الترحيب:", e);
  }
}

/* ---------- بدء الجولة ---------- */
function startTour() {
  try {
    _tourCurrentStep = 0;
    _cleanTourElements();
    _showTourStep();
  } catch (e) {
    console.error("خطأ في بدء الجولة:", e);
    _cleanTourElements();
  }
}

/* ---------- إظهار خطوة الجولة ---------- */
function _showTourStep() {
  try {
    if (_tourCurrentStep >= TOUR_STEPS.length) {
      _endTour();
      return;
    }

    var step = TOUR_STEPS[_tourCurrentStep];
    var targetEl = step.target ? document.querySelector(step.target) : null;

    /* إنشاء طبقة التغطية */
    if (!_tourOverlay) {
      _tourOverlay = document.createElement("div");
      _tourOverlay.id = "tour-overlay";
      _tourOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.65);z-index:999;transition:opacity 0.3s;direction:rtl;font-family:sans-serif";
      _tourOverlay.onclick = function (e) {
        if (e.target === _tourOverlay) {
          _endTour();
        }
      };
      document.body.appendChild(_tourOverlay);
    }

    /* إزالة الإبراز السابق */
    _removeHighlight();

    /* إبراز العنصر المستهدف */
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      _tourHighlight = document.createElement("div");
      _tourHighlight.style.cssText = "position:absolute;border:3px solid #0d9488;border-radius:12px;box-shadow:0 0 0 4px rgba(13,148,136,0.3),0 0 20px rgba(13,148,136,0.2);pointer-events:none;z-index:1001;transition:all 0.3s";
      document.body.appendChild(_tourHighlight);
      _positionHighlight(targetEl);
    }

    /* إزالة فقاعة سابقة */
    if (_tourBubble) {
      _tourBubble.remove();
      _tourBubble = null;
    }

    /* إنشاء فقاعة الشرح */
    _tourBubble = document.createElement("div");
    _tourBubble.id = "tour-bubble";
    _tourBubble.style.cssText = "position:fixed;z-index:1002;background:#fff;border-radius:16px;padding:28px 24px;max-width:360px;width:88%;box-shadow:0 12px 40px rgba(0,0,0,0.25);direction:rtl;text-align:center";

    /* أيقونة */
    var iconDiv = document.createElement("div");
    iconDiv.style.cssText = "font-size:40px;margin-bottom:10px";
    iconDiv.textContent = step.icon;

    /* عنوان */
    var titleEl = document.createElement("h3");
    titleEl.style.cssText = "margin:0 0 10px;color:#0d9488;font-size:18px;font-weight:bold";
    titleEl.textContent = step.title;

    /* وصف */
    var descEl = document.createElement("p");
    descEl.style.cssText = "margin:0 0 6px;color:#555;font-size:14px;line-height:1.8";
    descEl.textContent = step.desc;

    /* عداد الخطوات */
    var counterEl = document.createElement("div");
    counterEl.style.cssText = "margin:12px 0;font-size:12px;color:#aaa";
    counterEl.textContent = (_tourCurrentStep + 1) + " / " + TOUR_STEPS.length;

    /* صف الأزرار */
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;margin-top:16px";

    var isLast = (_tourCurrentStep === TOUR_STEPS.length - 1);

    /* زر التالي / إنهاء */
    var nextBtn = document.createElement("button");
    nextBtn.textContent = isLast ? "إنهاء ✓" : "التالي ←";
    nextBtn.style.cssText = "flex:1;padding:12px;background:#0d9488;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:bold;cursor:pointer;transition:background 0.2s";
    nextBtn.onmouseover = function () { nextBtn.style.background = "#0f766e"; };
    nextBtn.onmouseout = function () { nextBtn.style.background = "#0d9488"; };
    nextBtn.onclick = function () {
      _tourCurrentStep++;
      if (_tourCurrentStep >= TOUR_STEPS.length) {
        _endTour();
      } else {
        _showTourStep();
      }
    };

    /* زر تخطي الجولة */
    var skipBtn = document.createElement("button");
    skipBtn.textContent = "تخطي الجولة";
    skipBtn.style.cssText = "flex:1;padding:12px;background:transparent;color:#888;border:1px solid #ddd;border-radius:10px;font-size:14px;cursor:pointer;transition:all 0.2s";
    skipBtn.onmouseover = function () { skipBtn.style.background = "#f5f5f5"; };
    skipBtn.onmouseout = function () { skipBtn.style.background = "transparent"; };
    skipBtn.onclick = function () {
      _endTour();
    };

    btnRow.appendChild(nextBtn);
    btnRow.appendChild(skipBtn);

    _tourBubble.appendChild(iconDiv);
    _tourBubble.appendChild(titleEl);
    _tourBubble.appendChild(descEl);
    _tourBubble.appendChild(counterEl);
    _tourBubble.appendChild(btnRow);

    document.body.appendChild(_tourBubble);

    /* positioning */
    _positionBubble(targetEl);

  } catch (e) {
    console.error("خطأ في عرض خطوة الجولة:", e);
  }
}

/* ---------- positioning helpers ---------- */
function _positionHighlight(el) {
  try {
    if (!_tourHighlight || !el) return;
    var rect = el.getBoundingClientRect();
    _tourHighlight.style.top = (rect.top - 4) + "px";
    _tourHighlight.style.left = (rect.left - 4) + "px";
    _tourHighlight.style.width = (rect.width + 8) + "px";
    _tourHighlight.style.height = (rect.height + 8) + "px";
  } catch (e) { /* silent */ }
}

function _positionBubble(targetEl) {
  try {
    if (!_tourBubble) return;
    var bw = _tourBubble.offsetWidth || 340;
    var bh = _tourBubble.offsetHeight || 280;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var top, left;

    if (targetEl) {
      var rect = targetEl.getBoundingClientRect();
      var targetCenterX = rect.left + rect.width / 2;
      var targetTop = rect.top;

      /* حساب '.'bubble position */
      top = targetTop - bh - 16;
      left = targetCenterX - bw / 2;

      /* فوق النافذة؟ حاول أسفل */
      if (top < 10) {
        top = rect.bottom + 16;
      }

      /* تجاوز اليسار/اليمين */
      if (left < 10) left = 10;
      if (left + bw > vw - 10) left = vw - bw - 10;

      /* تجاوز الأسفل */
      if (top + bh > vh - 10) {
        top = (vh - bh) / 2;
        left = (vw - bw) / 2;
      }
    } else {
      /* في المنتصف */
      top = (vh - bh) / 2;
      left = (vw - bw) / 2;
    }

    _tourBubble.style.top = top + "px";
    _tourBubble.style.left = left + "px";
  } catch (e) { /* silent */ }
}

/* ---------- إنهاء الجولة ---------- */
function _endTour() {
  try {
    _cleanTourElements();
    markTourDone();
    if (typeof showToast === "function") {
      showToast("🎓 انتهت الجولة — يمكنك إعادة تشغيلها من زر المساعدة", "success");
    }
  } catch (e) {
    console.error("خطأ في إنهاء الجولة:", e);
    _cleanTourElements();
  }
}

/* ---------- تنظيف عناصر الجولة ---------- */
function _cleanTourElements() {
  try {
    if (_tourOverlay) { _tourOverlay.remove(); _tourOverlay = null; }
    _removeHighlight();
    if (_tourBubble) { _tourBubble.remove(); _tourBubble = null; }
  } catch (e) { /* silent */ }
}

function _removeHighlight() {
  try {
    if (_tourHighlight) { _tourHighlight.remove(); _tourHighlight = null; }
  } catch (e) { /* silent */ }
}

/* ---------- إعادة بدء الجولة (لزر المساعدة) ---------- */
function restartTour() {
  try {
    startTour();
  } catch (e) {
    console.error("خطأ في إعادة بدء الجولة:", e);
  }
}

/* ---------- علم الجاهزية ---------- */
window.FEATURES_TOUR_READY = true;
