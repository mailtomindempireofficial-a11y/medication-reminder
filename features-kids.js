/* ============================================================
   features-kids.js — وضع الأطفال (Gamification)
   نجوم + شخصية كرتونية + سلسلة أيام
   ES5 خالص — بدون let/const/arrow/async/template literals
   ============================================================ */

"use strict";

/* ---------- الثوابت ---------- */
var KIDS_MASCOTS = ["\uD83D\uDC3B", "\uD83D\uDC31", "\uD83E\uDD8A", "\uD83D\uDC30", "\uD83D\uDC3C", "\uD83E\uDD81"];
var KIDS_COLORS   = ["#dbeafe", "#dcfce7", "#fef9c3", "#fce7f3", "#ede9fe", "#ffedd5"];

var _kidsMascotSession = null;

/* ========================================
   1. isKidsMode
   ======================================== */
function isKidsMode() {
  try {
    return localStorage.getItem(STORAGE_KEY + "_kidsMode") === "1";
  } catch (e) {
    return false;
  }
}

/* ========================================
   2. toggleKidsMode
   ======================================== */
function toggleKidsMode() {
  try {
    if (isKidsMode()) {
      localStorage.setItem(STORAGE_KEY + "_kidsMode", "0");
    } else {
      localStorage.setItem(STORAGE_KEY + "_kidsMode", "1");
      _kidsMascotSession = KIDS_MASCOTS[Math.floor(Math.random() * KIDS_MASCOTS.length)];
    }
    renderAll();
    if (typeof showToast === "function") {
      showToast(isKidsMode() ? "\uD83C\uDFAE تم تفعيل وضع الأطفال!" : "\u2705 تم إيقاف وضع الأطفال", "success");
    }
  } catch (e) {
    console.error("toggleKidsMode error:", e);
  }
}

/* ========================================
   3. getStarsForToday
   ======================================== */
function getStarsForToday() {
  var stars = 0;
  try {
    if (typeof appData === "undefined" || !appData.medications) return 0;
    var today = typeof todayStr === "function" ? todayStr() : "";
    if (!today) return 0;

    var meds = appData.medications;
    for (var i = 0; i < meds.length; i++) {
      var med = meds[i];
      if (!med || !med.times || !med.active && med.active !== false) continue;
      if (med.active === false) continue;

      for (var t = 0; t < med.times.length; t++) {
        var time = med.times[t];
        if (typeof isDoseTaken === "function" && isDoseTaken(med.id, time, today)) {
          stars = stars + 1;
        }
      }
    }
  } catch (e) {
    console.error("getStarsForToday error:", e);
  }
  return stars;
}

/* ========================================
   4. getStreak
   ======================================== */
function getStreak() {
  var streak = 0;
  try {
    if (typeof appData === "undefined" || !appData.medications) return 0;

    var d = new Date();
    var dateStr = typeof todayStr === "function" ? todayStr() : "";
    if (!dateStr) return 0;

    var meds = [];
    for (var i = 0; i < appData.medications.length; i++) {
      var m = appData.medications[i];
      if (m && m.active !== false && m.times && m.times.length > 0) {
        meds.push(m);
      }
    }
    if (meds.length === 0) return 0;

    /* فحص اليوم الحالي أولاً */
    for (var day = 0; day < 365; day++) {
      var checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
      var dateKey = checkDate.getFullYear() + "-" +
        String(checkDate.getMonth() + 1).padStart(2, "0") + "-" +
        String(checkDate.getDate()).padStart(2, "0");

      var allTaken = true;
      for (var m2 = 0; m2 < meds.length; m2++) {
        var med = meds[m2];
        if (typeof isDoseTaken === "function") {
          for (var t = 0; t < med.times.length; t++) {
            if (!isDoseTaken(med.id, med.times[t], dateKey)) {
              allTaken = false;
              break;
            }
          }
        } else {
          allTaken = false;
        }
        if (!allTaken) break;
      }

      if (allTaken) {
        streak = streak + 1;
      } else {
        break;
      }
    }
  } catch (e) {
    console.error("getStreak error:", e);
  }
  return streak;
}

/* ========================================
   5. getKidsMessage
   ======================================== */
function getKidsMessage(stars) {
  try {
    if (stars <= 0) {
      return "\u0627\u0628\u062F\u0623 \u064A\u0648\u0645\u0643\u061B \u0623\u0646\u062A \u0628\u0637\u0644 \uD83D\uDCAA";
    } else if (stars <= 2) {
      var msgs2 = [
        "\u0623\u062D\u0633\u0646\u062A\u061B \u0627\u0633\u062A\u0645\u0631\u061B \uD83C\uDF89",
        "\u0631\u0627\u0626\u0639\u061B \u0643\u0645\u0644 \u0639\u0644\u0649 \u062E\u064A\u0631 \uD83D\uDCAA",
        "\u0628\u0631\u0627\u0641\u0642\u064B\u0627\u064B \u0645\u0645\u062A\u0646\u062D\u064B\u0627 \uD83C\uDF1F",
        "\u0623\u0633\u062A\u0645\u0631\u061B \u0627\u0644\u0646\u062C\u0645\u0647 \u064A\u0643\u0628\u0631\u064B\u0627 \uD83D\uDE0A"
      ];
      return msgs2[Math.floor(Math.random() * msgs2.length)];
    } else {
      var msgs3 = [
        "\u0645\u0645\u062A\u0627\u0632\u061B \u0623\u0646\u062A \u0646\u062C\u0645 \u0627\u0644\u0646\u062C\u0645 \u2B50\u2B50\u2B50",
        "\u0628\u0637\u0644 \u0627\u0644\u0646\u062C\u0645\u064A\u0627\u062A\u061B \u0645\u0645\u062A\u0627\u0632\u064B\u0627 \uD83C\uDFC6",
        "\u0645\u0645\u062A\u0627\u0632 \u062C\u062F\u0627\u064B\u0639\u064B\u0627 \u2B50\u2B50\u2B50 \uD83D\uDE80",
        "\u0631\u0627\u0626\u0639\u061B \u0645\u0645\u062A\u0627\u0632 \u062C\u062F\u0627\u064B\u0639\u0627\u064B \uD83E\uDD29"
      ];
      return msgs3[Math.floor(Math.random() * msgs3.length)];
    }
  } catch (e) {
    return "\u0627\u0628\u062F\u0623 \u064A\u0648\u0645\u0643\u061B \u0623\u0646\u062A \u0628\u0637\u0644 \uD83D\uDCAA";
  }
}

/* ========================================
   6. _kidMedColor(index) — دالة مساعدة
   ======================================== */
function _kidMedColor(index) {
  return KIDS_COLORS[index % KIDS_COLORS.length];
}

/* ========================================
   7. _kidEsc(str) — تعقيم داخلي
   ======================================== */
function _kidEsc(str) {
  if (typeof escapeHtml === "function") {
    return escapeHtml(str);
  }
  if (str === null || str === undefined) return "";
  var s = String(str);
  s = s.replace(/&/g, "&amp;");
  s = s.replace(/</g, "&lt;");
  s = s.replace(/>/g, "&gt;");
  s = s.replace(/"/g, "&quot;");
  s = s.replace(/'/g, "&#039;");
  return s;
}

/* ========================================
   8. renderKidsHome
   ======================================== */
function renderKidsHome() {
  try {
    var el = document.getElementById("homeTab");
    if (!el) return;

    el.innerHTML = "";

    /* Personality mascot */
    if (!_kidsMascotSession) {
      _kidsMascotSession = KIDS_MASCOTS[Math.floor(Math.random() * KIDS_MASCOTS.length)];
    }

    var todayStars = getStarsForToday();
    var streak = getStreak();
    var message = getKidsMessage(todayStars);

    /* CSS styles */
    var style = document.createElement("style");
    style.textContent =
      ".kids-wrap{direction:rtl;text-align:center;padding:12px 10px;font-family:'Segoe UI',Tahoma,sans-serif}" +
      ".kids-mascot{font-size:5rem;line-height:1.2;margin:8px 0;animation:kidsBounce 1.5s ease-in-out infinite}" +
      "@keyframes kidsBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}" +
      ".kids-msg{font-size:1.25rem;font-weight:700;color:#1e293b;margin:6px 0 12px}" +
      ".kids-stats{display:flex;justify-content:center;gap:16px;margin:12px 0}" +
      ".kids-stat{background:#fff;border-radius:16px;padding:10px 18px;box-shadow:0 2px 10px rgba(0,0,0,.1);font-size:1.1rem;font-weight:700}" +
      ".kids-dose-card{border-radius:16px;padding:16px 14px;margin:10px 0;display:flex;align-items:center;justify-content:space-between}" +
      ".kids-dose-name{font-size:1.2rem;font-weight:700;color:#1e293b;flex:1;text-align:right}" +
      ".kids-dose-time{font-size:1rem;color:#64748b;margin-right:10px;white-space:nowrap}" +
      ".kids-btn-taken{background:#22c55e;color:#fff;border:none;border-radius:14px;padding:14px 24px;font-size:1.3rem;font-weight:700;cursor:pointer;transition:transform .2s}" +
      ".kids-btn-taken:active{transform:scale(.95)}" +
      ".kids-btn-done{background:#d1d5db;color:#6b7280;border:none;border-radius:14px;padding:14px 24px;font-size:1.3rem;font-weight:700}" +
      ".kids-section-title{font-size:1.1rem;color:#475569;margin:16px 0 6px;font-weight:600}" +
      ".kids-toggle-wrap{background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:18px;padding:20px;margin:10px 0;color:#fff;text-align:center}" +
      ".kids-toggle-inner{display:flex;align-items:center;justify-content:space-between}" +
      ".kids-toggle-title{font-size:1.15rem;font-weight:700}" +
      ".kids-toggle-desc{font-size:.85rem;opacity:.9;margin-top:4px}" +
      ".kids-toggle-btn{position:relative;width:64px;height:34px;border-radius:17px;cursor:pointer;border:none;transition:background .3s}" +
      ".kids-toggle-btn-on{background:#22c55e}" +
      ".kids-toggle-btn-off{background:rgba(255,255,255,.3)}" +
      ".kids-toggle-btn span{position:absolute;top:3px;width:28px;height:28px;border-radius:50%;background:#fff;transition:left .3s;box-shadow:0 1px 4px rgba(0,0,0,.2)}" +
      ".kids-toggle-btn-on span{left:33px}" +
      ".kids-toggle-btn-off span{left:3px}";
    el.appendChild(style);

    var wrap = document.createElement("div");
    wrap.className = "kids-wrap";

    /* Mascot */
    var mascot = document.createElement("div");
    mascot.className = "kids-mascot";
    mascot.textContent = _kidsMascotSession;
    wrap.appendChild(mascot);

    /* Message */
    var msg = document.createElement("div");
    msg.className = "kids-msg";
    msg.textContent = message;
    wrap.appendChild(msg);

    /* Stats */
    var stats = document.createElement("div");
    stats.className = "kids-stats";

    var starStat = document.createElement("div");
    starStat.className = "kids-stat";
    starStat.textContent = "\u2B50 x " + todayStars;
    stats.appendChild(starStat);

    var streakStat = document.createElement("div");
    streakStat.className = "kids-stat";
    streakStat.textContent = "\uD83D\uDD25 " + streak + " \u0623\u064A\u0627\u0645 \u0645\u062A\u062A\u0627\u0644\u064A\u0629";
    stats.appendChild(streakStat);

    wrap.appendChild(stats);

    /* Today's doses */
    var totalDoses = 0;
    var takenDoses = 0;

    if (typeof appData !== "undefined" && appData.medications) {
      var today = typeof todayStr === "function" ? todayStr() : "";

      var allDue = [];

      for (var i = 0; i < appData.medications.length; i++) {
        var med = appData.medications[i];
        if (!med || !med.times || med.active === false) continue;

        for (var t = 0; t < med.times.length; t++) {
          var time = med.times[t];
          var taken = typeof isDoseTaken === "function" && isDoseTaken(med.id, time, today);
          totalDoses = totalDoses + 1;
          if (taken) takenDoses = takenDoses + 1;

          allDue.push({
            medId: med.id,
            medName: med.name || "\u062F\u0648\u0627\u0621",
            time: time,
            color: _kidMedColor(allDue.length),
            taken: taken
          });
        }
      }

      if (allDue.length > 0) {
        var title = document.createElement("div");
        title.className = "kids-section-title";
        title.textContent = "\uD83D\uDCCB \u062C\u0631\u0639\u0627\u062A \u0627\u0644\u064A\u0648\u0645 (" + takenDoses + "/" + totalDoses + ")";
        wrap.appendChild(title);

        for (var d = 0; d < allDue.length; d++) {
          var due = allDue[d];
          var card = document.createElement("div");
          card.className = "kids-dose-card";
          card.style.background = due.color;

          var nameSpan = document.createElement("span");
          nameSpan.className = "kids-dose-name";
          nameSpan.textContent = due.medName;
          card.appendChild(nameSpan);

          var timeSpan = document.createElement("span");
          timeSpan.className = "kids-dose-time";
          timeSpan.textContent = due.time;
          card.appendChild(timeSpan);

          if (due.taken) {
            var btnDone = document.createElement("button");
            btnDone.className = "kids-btn-done";
            btnDone.textContent = "\u2714 \u062A\u0645";
            card.appendChild(btnDone);
          } else {
            var btnTake = document.createElement("button");
            btnTake.className = "kids-btn-taken";
            btnTake.textContent = "\u2705 \u0623\u062E\u0630\u062A\u0647\u0627";
            btnTake.setAttribute("data-mid", due.medId);
            btnTake.setAttribute("data-time", due.time);
            btnTake.onclick = (function (mId, t) {
              return function () {
                try {
                  var d2 = typeof todayStr === "function" ? todayStr() : "";
                  if (typeof markDose === "function") {
                    markDose(mId, t, d2, true);
                  }
                  if (typeof renderAll === "function") {
                    renderAll();
                  }
                  if (typeof showToast === "function") {
                    showToast("\u2B50 \u0623\u062D\u0633\u0646\u062A\u061B \u0646\u062C\u0645\u0629 \u062C\u062F\u064A\u062F\u0629 \u0644\u0643\u061B", "success");
                  }
                } catch (err) {
                  console.error("kids dose click error:", err);
                }
              };
            })(due.medId, due.time);
            card.appendChild(btnTake);
          }

          wrap.appendChild(card);
        }
      } else {
        var noDoses = document.createElement("div");
        noDoses.className = "kids-section-title";
        noDoses.textContent = "\uD83C\uDF1F \u0644\u0645 \u062A\u0633\u062C\u0644 \u0623\u062F\u0648\u064A\u0629 \u0628\u0639\u062F";
        wrap.appendChild(noDoses);
      }
    }

    el.appendChild(wrap);

    /* Toggle card at bottom */
    renderKidsModeToggleIn(wrap);

  } catch (e) {
    console.error("renderKidsHome error:", e);
  }
}

/* ========================================
   9. renderKidsModeToggle
   (ينتشر في #settingsSection)
   ======================================== */
function renderKidsModeToggle() {
  try {
    if (document.querySelector("#settingsSection .kids-toggle-wrap")) return;
    var section = document.getElementById("settingsSection");
    if (!section) return;
    renderKidsModeToggleIn(section);
  } catch (e) {
    console.error("renderKidsModeToggle error:", e);
  }
}

/* ========================================
   10. renderKidsModeToggleIn(container)
   — دالة مساعدة لإعادة الاستخدام
   ======================================== */
function renderKidsModeToggleIn(container) {
  if (!container) return;
  try {
    var on = isKidsMode();

    var wrap = document.createElement("div");
    wrap.className = "kids-toggle-wrap";

    var inner = document.createElement("div");
    inner.className = "kids-toggle-inner";

    var left = document.createElement("div");
    left.style.textAlign = "right";
    left.style.flex = "1";

    var title = document.createElement("div");
    title.className = "kids-toggle-title";
    title.textContent = "\uD83C\uDFAE \u0648\u0636\u0639 \u0627\u0644\u0623\u0637\u0641\u0627\u0644";
    left.appendChild(title);

    var desc = document.createElement("div");
    desc.className = "kids-toggle-desc";
    desc.textContent = "\u0646\u062C\u0648\u0645 \u0648\u0634\u062E\u0635\u064A\u0627\u062A \u062A\u0634\u062C\u0639 \u0637\u0641\u0644\u0643";
    left.appendChild(desc);

    inner.appendChild(left);

    var btn = document.createElement("button");
    btn.className = "kids-toggle-btn " + (on ? "kids-toggle-btn-on" : "kids-toggle-btn-off");
    btn.setAttribute("aria-label", "\u062A\u0628\u062F\u064A\u0644 \u0648\u0636\u0639 \u0627\u0644\u0623\u0637\u0641\u0627\u0644");
    var knob = document.createElement("span");
    btn.appendChild(knob);
    btn.onclick = function () {
      toggleKidsMode();
    };
    inner.appendChild(btn);

    wrap.appendChild(inner);
    container.appendChild(wrap);
  } catch (e) {
    console.error("renderKidsModeToggleIn error:", e);
  }
}

/* ---------- علم الجاهزية ---------- */
window.FEATURES_KIDS_READY = true;
