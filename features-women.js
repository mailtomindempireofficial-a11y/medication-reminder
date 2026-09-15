/* ============================================================
   وضع المرأة — تتبع الدورة الشهرية + تذكير حبوب منع الحمل
   الإصدار 2.1 — ES5 خالص (بدون let/const/arrow/async/template literals)
   ============================================================ */

var WOMEN_STORAGE_KEY = (typeof STORAGE_KEY !== "undefined") ? STORAGE_KEY : "medReminder_v1";
var WOMEN_DATA_KEY = WOMEN_STORAGE_KEY + "_womenData";

/* ---------- أدوات مساعدة داخلية ---------- */

function _womenEsc(str) {
  if (typeof escapeHtml === "function") return escapeHtml(str);
  return String(str === null || str === undefined ? "" : str);
}

function _womenFmtDate(dateStr) {
  if (typeof formatDateArabic === "function") return formatDateArabic(dateStr);
  return String(dateStr || "");
}

function _womenPad2(n) {
  return (n < 10 ? "0" : "") + n;
}

function _womenParseDate(dateStr) {
  if (!dateStr) return null;
  var parts = String(dateStr).split("-");
  if (parts.length !== 3) return null;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

function _womenDateToStr(d) {
  if (!d || isNaN(d.getTime())) return "";
  return d.getFullYear() + "-" + _womenPad2(d.getMonth() + 1) + "-" + _womenPad2(d.getDate());
}

/* تحميل بيانات المرأة من المفتاح الخاص (لأن loadData في app.js
   لا يستعيد appData.periods / appData.pillReminder) */
function _womenLoadData() {
  try {
    if (!appData.periods) appData.periods = [];
    if (!appData.pillReminder) appData.pillReminder = null;
    var raw = localStorage.getItem(WOMEN_DATA_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.periods)) appData.periods = parsed.periods;
      if (parsed && parsed.pillReminder) appData.pillReminder = parsed.pillReminder;
    }
  } catch (e) {
    console.error("خطأ في تحميل بيانات وضع المرأة:", e);
  }
}

/* حفظ مزدوج: saveData() (عقد الواجهة) + المفتاح الخاص (بقاء البيانات) */
function _womenPersist() {
  try {
    if (typeof saveData === "function") saveData();
    var payload = {
      periods: appData.periods || [],
      pillReminder: appData.pillReminder || null
    };
    localStorage.setItem(WOMEN_DATA_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("خطأ في حفظ بيانات وضع المرأة:", e);
    if (typeof showToast === "function") showToast("تعذر حفظ بيانات وضع المرأة", "error");
  }
}

/* يجد حاوية فرعية داخل #womenSection أو ينشئها */
function _womenContainer(id) {
  var el = document.getElementById(id);
  if (el) return el;
  var section = document.getElementById("womenSection");
  if (!section) return null;
  el = document.createElement("div");
  el.id = id;
  section.appendChild(el);
  return el;
}

/* ---------- وضع المرأة (التبديل) ---------- */

function isWomenMode() {
  try {
    return localStorage.getItem(WOMEN_STORAGE_KEY + "_womenMode") === "1";
  } catch (e) {
    return false;
  }
}

function toggleWomenMode() {
  try {
    var on = !isWomenMode();
    localStorage.setItem(WOMEN_STORAGE_KEY + "_womenMode", on ? "1" : "0");
    if (typeof renderAll === "function") renderAll();
    renderWomenModeToggle();
    renderWomenSection();
    if (typeof showToast === "function") {
      showToast(on ? "🌸 وضع المرأة مفعّل" : "تم إيقاف وضع المرأة", "success");
    }
  } catch (e) {
    console.error("خطأ في تبديل وضع المرأة:", e);
    if (typeof showToast === "function") showToast("حدث خطأ غير متوقع", "error");
  }
}

/* ---------- تتبع الدورة الشهرية ---------- */

function addPeriodEntry(date) {
  try {
    if (!date) date = todayStr();
    if (!appData.periods) appData.periods = [];
    for (var i = 0; i < appData.periods.length; i++) {
      if (appData.periods[i].date === date) {
        if (typeof showToast === "function") showToast("هذا اليوم مسجل مسبقاً", "error");
        return;
      }
    }
    appData.periods.push({ date: date, flow: "متوسط" });
    _womenPersist();
    if (typeof showToast === "function") showToast("تم تسجيل اليوم 🩸", "success");
    renderPeriodTracker();
  } catch (e) {
    console.error("خطأ في تسجيل الدورة:", e);
    if (typeof showToast === "function") showToast("حدث خطأ غير متوقع", "error");
  }
}

function deletePeriodEntry(date) {
  try {
    if (!appData.periods) return;
    var filtered = [];
    for (var i = 0; i < appData.periods.length; i++) {
      if (appData.periods[i].date !== date) filtered.push(appData.periods[i]);
    }
    appData.periods = filtered;
    _womenPersist();
    if (typeof showToast === "function") showToast("تم حذف اليوم", "success");
    renderPeriodTracker();
  } catch (e) {
    console.error("خطأ في حذف الدورة:", e);
    if (typeof showToast === "function") showToast("حدث خطأ غير متوقع", "error");
  }
}

function predictNextPeriod() {
  try {
    if (!appData.periods || appData.periods.length < 2) return null;
    var dates = [];
    for (var i = 0; i < appData.periods.length; i++) {
      var d = _womenParseDate(appData.periods[i].date);
      if (d) dates.push(d);
    }
    if (dates.length < 2) return null;
    dates.sort(function (a, b) { return a.getTime() - b.getTime(); });
    var last = dates.slice(-3);
    var total = 0;
    var count = 0;
    for (var j = 1; j < last.length; j++) {
      total += Math.round((last[j].getTime() - last[j - 1].getTime()) / 86400000);
      count++;
    }
    var avg = Math.round(total / count);
    if (avg < 1) avg = 1;
    var next = new Date(last[last.length - 1].getTime());
    next.setDate(next.getDate() + avg);
    return next;
  } catch (e) {
    console.error("خطأ في توقع الدورة:", e);
    return null;
  }
}

function renderPeriodTracker() {
  try {
    var el = _womenContainer("periodTrackerCard");
    if (!el) return;
    var html = "";
    html += '<div class="report-card" style="margin-bottom:12px;">';
    html += '<h3 style="margin:0 0 8px;">🩸 تتبع الدورة الشهرية</h3>';
    html += '<button class="btn btn-primary btn-block" onclick="addPeriodEntry(todayStr())">➕ تسجيل اليوم</button>';
    var periods = appData.periods || [];
    var sorted = periods.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });
    var last5 = sorted.slice(0, 5);
    if (last5.length > 0) {
      html += '<div style="margin-top:10px;">';
      for (var i = 0; i < last5.length; i++) {
        var p = last5[i];
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.9rem;">';
        html += '<span>' + _womenEsc(_womenFmtDate(p.date)) + ' — ' + _womenEsc(p.flow || "متوسط") + '</span>';
        html += '<button class="icon-btn" onclick="deletePeriodEntry(\'' + _womenEsc(p.date) + '\')" title="حذف">🗑️</button>';
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px;">لا توجد دورات مسجلة بعد — اضغطي "تسجيل اليوم" في أول يوم من الدورة.</p>';
    }
    var next = predictNextPeriod();
    if (next) {
      var nextStr = _womenDateToStr(next);
      var now = new Date();
      var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var daysLeft = Math.round((next.getTime() - todayMid.getTime()) / 86400000);
      html += '<div style="margin-top:10px;padding:10px;background:var(--card-bg);border:1px dashed var(--border);border-radius:10px;font-size:0.9rem;">';
      html += '<strong>🔮 الدورة القادمة المتوقعة:</strong> ' + _womenEsc(_womenFmtDate(nextStr));
      if (daysLeft < 0) {
        html += '<br><span style="color:#dc2626;">⏰ مضى عليها ' + Math.abs(daysLeft) + ' يوم — سجلي يومك الجديد</span>';
      } else if (daysLeft === 0) {
        html += '<br><span style="color:#d97706;">📅 متوقعة اليوم</span>';
      } else {
        html += '<br><span>عدد الأيام المتبقية: <strong>' + daysLeft + ' يوم</strong></span>';
      }
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  } catch (e) {
    console.error("خطأ في رسم تتبع الدورة:", e);
  }
}

/* ---------- تذكير حبوب منع الحمل ---------- */

function addPillReminder(time) {
  try {
    if (!time) {
      if (typeof showToast === "function") showToast("أدخلي وقت التذكير", "error");
      return;
    }
    appData.pillReminder = { time: String(time), lastTaken: "", streak: 0 };
    _womenPersist();
    if (typeof showToast === "function") showToast("تم إعداد تذكير الحبوب 💊", "success");
    renderPillReminder();
  } catch (e) {
    console.error("خطأ في إعداد تذكير الحبوب:", e);
    if (typeof showToast === "function") showToast("حدث خطأ غير متوقع", "error");
  }
}

function promptPillReminder() {
  try {
    var time = window.prompt("أدخلي وقت تناول الحبة يومياً (مثال: 21:00)", "21:00");
    if (time === null || time === undefined) return;
    time = String(time).trim();
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      if (typeof showToast === "function") showToast("أدخلي وقتاً صحيحاً بصيغة HH:MM", "error");
      return;
    }
    var parts = time.split(":");
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      if (typeof showToast === "function") showToast("أدخلي وقتاً صحيحاً بصيغة HH:MM", "error");
      return;
    }
    addPillReminder(_womenPad2(h) + ":" + _womenPad2(m));
  } catch (e) {
    console.error("خطأ في إعداد التذكير:", e);
  }
}

function markPillTaken() {
  try {
    if (!appData.pillReminder || !appData.pillReminder.time) {
      if (typeof showToast === "function") showToast("أعدّي تذكير حبوب منع الحمل أولاً", "error");
      return;
    }
    var today = todayStr();
    if (appData.pillReminder.lastTaken === today) {
      if (typeof showToast === "function") showToast("سجلتِ حبوبك اليوم مسبقاً ✅", "success");
      return;
    }
    appData.pillReminder.lastTaken = today;
    appData.pillReminder.streak = (parseInt(appData.pillReminder.streak, 10) || 0) + 1;
    _womenPersist();
    if (typeof showToast === "function") showToast("تم تسجيل الحبة ✅", "success");
    renderPillReminder();
  } catch (e) {
    console.error("خطأ في تسجيل الحبة:", e);
    if (typeof showToast === "function") showToast("حدث خطأ غير متوقع", "error");
  }
}

function renderPillReminder() {
  try {
    var el = _womenContainer("pillReminderCard");
    if (!el) return;
    var html = "";
    html += '<div class="report-card" style="margin-bottom:12px;">';
    html += '<h3 style="margin:0 0 8px;">💊 حبوب منع الحمل</h3>';
    var pr = appData.pillReminder;
    if (!pr || !pr.time) {
      html += '<p style="color:var(--text-muted);font-size:0.85rem;">لا يوجد تذكير محدد بعد.</p>';
      html += '<button class="btn btn-outline btn-block" onclick="promptPillReminder()">➕ إعداد تذكير حبوب منع الحمل</button>';
    } else {
      html += '<div style="font-size:1.05rem;font-weight:600;">💊 حان وقت حبوبك ' + _womenEsc(pr.time) + '</div>';
      html += '<button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="markPillTaken()">✅ أخذتها</button>';
      html += '<div style="margin-top:8px;font-size:0.9rem;">🔥 سلسلة: <strong>' + (parseInt(pr.streak, 10) || 0) + ' يوم</strong></div>';
      if (pr.lastTaken === todayStr()) {
        html += '<div style="margin-top:6px;color:#16a34a;font-size:0.9rem;">✅ أخذتِ حبوبك اليوم — أحسنت!</div>';
      } else if (!pr.lastTaken) {
        html += '<div style="margin-top:6px;padding:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#b45309;font-size:0.9rem;">⚠️ لم تسجلي حبوبك اليوم بعد</div>';
      } else {
        html += '<div style="margin-top:6px;padding:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#dc2626;font-size:0.9rem;">⚠️ نسيت حبوبك اليوم!</div>';
      }
    }
    html += '</div>';
    el.innerHTML = html;
  } catch (e) {
    console.error("خطأ في رسم تذكير الحبوب:", e);
  }
}

/* ---------- القسم الكامل + مفتاح الإعدادات ---------- */

function renderWomenSection() {
  try {
    var el = document.getElementById("womenSection");
    if (!el) return;
    _womenLoadData();
    var html = "";
    html += '<div class="section-title"><h2>🌸 صحة المرأة</h2></div>';
    html += '<div id="periodTrackerCard"></div>';
    html += '<div id="pillReminderCard"></div>';
    html += '<div class="report-card">';
    html += '<h3 style="margin:0 0 8px;">💡 نصائح سريعة</h3>';
    html += '<ul style="margin:0;padding-right:18px;font-size:0.85rem;color:var(--text-muted);line-height:1.9;">';
    html += '<li>سجلي أول يوم من دورتك للحصول على توقع أدق للدورة القادمة.</li>';
    html += '<li>تناولي حبة منع الحمل في نفس الوقت يومياً للحفاظ على فعاليتها.</li>';
    html += '<li>إذا نسيتِ حبة، راجعي نشرة الدواء أو طبيبك — لا تتناولي حبتين معاً إلا بتعليمات.</li>';
    html += '<li>استشيري طبيبك إذا تأخرت دورتك أكثر من 7 أيام أو لاحظتِ أعراضاً غير معتادة.</li>';
    html += '</ul>';
    html += '</div>';
    el.innerHTML = html;
    renderPeriodTracker();
    renderPillReminder();
  } catch (e) {
    console.error("خطأ في رسم قسم صحة المرأة:", e);
  }
}

function renderWomenModeToggle() {
  try {
    var el = document.getElementById("settingsSection");
    if (!el) return;
    var existing = document.getElementById("womenModeSwitch");
    if (existing) {
      existing.className = "switch" + (isWomenMode() ? " on" : "");
      return;
    }
    var html = "";
    html += '<div class="report-card" style="margin-top:12px;">';
    html += '<div class="settings-group">';
    html += '<h4>🌸 وضع المرأة</h4>';
    html += '<div class="switch-row">';
    html += '<span>دورة شهرية + تذكير حبوب</span>';
    html += '<button class="switch' + (isWomenMode() ? " on" : "") + '" id="womenModeSwitch" onclick="toggleWomenMode()"></button>';
    html += '</div>';
    html += '<p style="font-size:0.75rem;color:var(--text-muted);margin:4px 0 0;">تتبع الدورة الشهرية وتذكير يومي بحبوب منع الحمل.</p>';
    html += '</div>';
    html += '</div>';
    el.insertAdjacentHTML("beforeend", html);
  } catch (e) {
    console.error("خطأ في رسم مفتاح وضع المرأة:", e);
  }
}

/* ---------- التهيئة ---------- */
if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("DOMContentLoaded", function () {
    _womenLoadData();
    renderWomenModeToggle();
  });
}

window.FEATURES_WOMEN_READY = true;