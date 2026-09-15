/* ============================================================
   features-senior.js — وضع جودة المشاهدة لكبار السن 🧓
   خط أكبر + أزرار أكبر + تباين أقوى — طبقة إضافية على body
   لا تكسر الوضع الليلي أو وضع القراءة الكبير القائمين
   يُحفظ في localStorage ويُطبَّق فوراً على كامل الواجهة
   ES5 خالص — بدون let/const/arrow/async/template literals
   ============================================================ */

"use strict";

var SENIOR_MODE_KEY = "medReminder_v1_seniorMode";

/* هل وضع كبار السن مفعّل؟ */
function isSeniorMode() {
  try {
    return localStorage.getItem(SENIOR_MODE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

/* تطبيق الحالة على body + مزامنة المفتاح في الإعدادات */
function applySeniorMode() {
  var on = isSeniorMode();
  if (on) document.body.classList.add("senior-mode");
  else document.body.classList.remove("senior-mode");
  var sw = document.getElementById("seniorModeSwitch");
  if (sw) sw.classList.toggle("on", on);
}

/* تبديل وضع كبار السن */
function toggleSeniorMode() {
  var on = !isSeniorMode();
  try {
    localStorage.setItem(SENIOR_MODE_KEY, on ? "1" : "0");
  } catch (e) {}
  if (on) document.body.classList.add("senior-mode");
  else document.body.classList.remove("senior-mode");
  var sw = document.getElementById("seniorModeSwitch");
  if (sw) sw.classList.toggle("on", on);
  if (typeof showToast === "function") {
    showToast(on ? "🧓 وضع كبار السن مفعّل — خط أكبر وتباين أقوى" : "تم إيقاف وضع كبار السن", "success");
  }
}

/* رسم مفتاح وضع كبار السن داخل #seniorModeToggle في الإعدادات */
function renderSeniorModeToggle() {
  var host = document.getElementById("seniorModeToggle");
  if (!host || host.children.length) return;
  var on = isSeniorMode();
  host.innerHTML =
    '<div class="switch-row">' +
      '<span>🧓 وضع جودة المشاهدة لكبار السن<br>' +
      '<small style="font-size:.72rem;color:var(--text-muted);">خط أكبر · أزرار أكبر · تباين أقوى</small></span>' +
      '<button class="switch' + (on ? " on" : "") + '" id="seniorModeSwitch" onclick="toggleSeniorMode()"></button>' +
    '</div>';
}

/* التهيئة — تطبيق فوري عند التحميل + رسم المفتاح */
if (typeof document !== "undefined") {
  if (document.body) {
    applySeniorMode();
  } else {
    document.addEventListener("DOMContentLoaded", applySeniorMode);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderSeniorModeToggle);
  } else {
    renderSeniorModeToggle();
  }
}

/* ---------- علم الجاهزية ---------- */
window.FEATURES_SENIOR_READY = true;