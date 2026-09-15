/* ============================================================
   features-assistant.js — المساعد الشخصي الذكي + فقاعة الدردشة
   مربوط بكل بيانات المستخدم الفعلية (appData)
   ES5 خالص — بدون let/const/arrow/async/template literals
   ============================================================ */

"use strict";

/* ---------- الأسئلة السريعة الجاهزة (الخمسة الأهم أولاً لكبار السن) ---------- */
var ASSISTANT_QUICK_QUESTIONS = [
  "جرعتي القادمة؟",
  "كم دواءً عندي؟",
  "التزامي اليوم؟",
  "تقريري اليومي؟",
  "التزامي الشهري؟",
  "آخر ضغط/سكر؟",
  "أدويتي تتعارض؟",
  "أعراضي؟",
  "مواعيدي؟",
  "أقرب موعد طبيب؟",
  "عائلتي؟",
  "تطعيماتي؟",
  "أدوية تنتهي قريباً؟",
  "أحتاج تعبئة؟",
  "جرعاتي المتبقية اليوم؟",
  "نصيحة صحية؟"
];

/* ---------- نصائح ختامية ---------- */
var _ASSISTANT_TIPS = [
  "💡 نصيحة: خذ أدويتك في مواعيد ثابتة يومياً لضمان أفضل فاعلية.",
  "💡 نصيحة: لا توقف أي دواء أو تعدّل جرعته دون استشارة طبيبك.",
  "💡 نصيحة: اشرب كوب ماء مع كل جرعة دواء ما لم يمنعك طبيبك.",
  "💡 نصيحة: راجع تواريخ انتهاء أدويتك شهرياً وتخلص من المنتهي.",
  "💡 نصيحة: أخبر طبيبك بكل الأدوية والمكملات التي تتناولها.",
  "💡 نصيحة: خزّن أدويتك في مكان بارد وجاف بعيداً عن متناول الأطفال.",
  "💡 نصيحة: إذا ظهر عرض جديد أو تفاقم، راجع طبيبك دون تأخير.",
  "💡 نصيحة: حافظ على مواعيد فحص الضغط الدورية ووثّق قراءاتك."
];

/* ============================================================
   أدوات مساعدة داخلية (خاصة بالوحدة)
   ============================================================ */

/* تعقيم النصوص — تستخدم escapeHtml العامة إن وُجدت */
function _assistantEsc(s) {
  if (typeof escapeHtml === "function") return escapeHtml(s);
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* تعقيم قيمة داخل onclick (علامات اقتباس مفردة) */
function _assistantEscAttr(s) {
  return String(s == null ? "" : s).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

/* تطبيع النص العربي: إزالة التشكيل + توحيد الهمزات + التاء المربوطة */
function _assistantNormalize(s) {
  var t = String(s || "").toLowerCase();
  t = t.replace(/[\u064B-\u0652]/g, "");
  t = t.replace(/[أإآ]/g, "ا");
  t = t.replace(/ى/g, "ي");
  t = t.replace(/ة/g, "ه");
  t = t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/* تحية مناسبة حسب وقت اليوم */
function _assistantGreeting() {
  var h = new Date().getHours();
  if (h < 12) return "صباح الخير ☀️";
  if (h < 18) return "مساء الخير 🌤️";
  return "مساء الخير 🌙";
}

/* نصيحة عشوائية */
function _assistantTip() {
  return _ASSISTANT_TIPS[Math.floor(Math.random() * _ASSISTANT_TIPS.length)];
}

/* الأدوية النشطة (active !== false) */
function _assistantActiveMeds() {
  var meds = appData.medications || [];
  var out = [];
  for (var i = 0; i < meds.length; i++) {
    if (meds[i] && meds[i].active !== false) out.push(meds[i]);
  }
  return out;
}

/* مطابقة اسم دواء مع مفتاح تفاعل */
function _assistantNameMatch(name, key) {
  if (!name || !key) return false;
  return name.indexOf(key) !== -1 || key.indexOf(name) !== -1;
}

/* ============================================================
   أنماط الإجابة — كل إجابة تبدأ بتحية وتنتهي بنصيحة
   ============================================================ */

/* 1) عدد وقائمة الأدوية النشطة مع الجرعات */
function _assistantCountMeds(greeting) {
  var meds = _assistantActiveMeds();
  if (!meds.length) {
    return greeting + "<br>لا توجد أدوية نشطة حالياً. أضف دواءك الأول من زر ➕ في الرئيسية.<br><br>" + _assistantTip();
  }
  var html = greeting + "<br>لديك <strong>" + meds.length + "</strong> دواء نشط:";
  html += "<ul>";
  for (var i = 0; i < meds.length; i++) {
    var m = meds[i];
    var form = m.form ? " (" + _assistantEsc(m.form) + ")" : "";
    var dose = m.dosage ? " — " + _assistantEsc(m.dosage) : "";
    var times = (m.times && m.times.length) ? " · " + m.times.length + " جرعة/يوم" : "";
    html += "<li><strong>" + _assistantEsc(m.name || "دواء") + "</strong>" + form + dose + times + "</li>";
  }
  html += "</ul>";
  html += _assistantTip();
  return html;
}

/* 2) أقرب جرعة قادمة اليوم */
function _assistantNextDose(greeting) {
  var meds = _assistantActiveMeds();
  if (!meds.length) {
    return greeting + "<br>لا توجد أدوية نشطة — أضف دواءً أولاً لتتبع جرعاتك.<br><br>" + _assistantTip();
  }
  var now = new Date();
  var nowMin = now.getHours() * 60 + now.getMinutes();
  var best = null;
  for (var i = 0; i < meds.length; i++) {
    var m = meds[i];
    var times = m.times || [];
    for (var j = 0; j < times.length; j++) {
      var parts = String(times[j]).split(":");
      var min = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      if (isNaN(min)) continue;
      if (min >= nowMin && (!best || min < best.min)) {
        best = { med: m, time: times[j], min: min };
      }
    }
  }
  if (!best) {
    return greeting + "<br>لا توجد جرعات متبقية اليوم — أنهيت كل جرعاتك! 🎉<br>غداً يوم جديد، حافظ على التزامك.<br><br>" + _assistantTip();
  }
  var timeText = (typeof formatTimeArabic === "function") ? formatTimeArabic(best.time) : best.time;
  var html = greeting + "<br>أقرب جرعة قادمة اليوم:";
  html += "<ul><li><strong>" + _assistantEsc(best.med.name || "دواء") + "</strong> — " + _assistantEsc(timeText) + "</li></ul>";
  html += _assistantTip();
  return html;
}

/* 3) الالتزام اليومي من سجل الجرعات (log) */
function _assistantAdherence(greeting) {
  var meds = _assistantActiveMeds();
  if (!meds.length) {
    return greeting + "<br>لا توجد أدوية نشطة لتتبع الالتزام.<br><br>" + _assistantTip();
  }
  var dateStr = (typeof todayStr === "function") ? todayStr() : new Date().toISOString().slice(0, 10);
  var total = 0;
  var taken = 0;
  var details = [];
  for (var i = 0; i < meds.length; i++) {
    var m = meds[i];
    var times = m.times || [];
    var tTaken = 0;
    for (var j = 0; j < times.length; j++) {
      total++;
      if (m.log && m.log[dateStr + "_" + times[j]]) tTaken++;
    }
    taken += tTaken;
    if (times.length) details.push({ name: m.name, taken: tTaken, total: times.length });
  }
  var pct = total ? Math.round((taken / total) * 100) : 0;
  var html = greeting + "<br>التزامك اليوم: <strong>" + taken + " من " + total + "</strong> جرعة (" + pct + "%)";
  if (details.length) {
    html += "<ul>";
    for (var k = 0; k < details.length; k++) {
      html += "<li>" + _assistantEsc(details[k].name) + ": " + details[k].taken + "/" + details[k].total + "</li>";
    }
    html += "</ul>";
  }
  if (pct === 100) html += "التزام كامل — أحسنت! 🎉";
  else if (pct >= 50) html += "أداء جيد — أكمل باقي جرعاتك اليوم.";
  else html += "لا تنسَ جرعاتك المتبقية اليوم.";
  html += "<br><br>" + _assistantTip();
  return html;
}

/* 4) تفاعلات أدوية المستخدم */
function _assistantInteractions(greeting) {
  var meds = _assistantActiveMeds();
  if (meds.length < 2) {
    return greeting + "<br>لديك " + meds.length + " دواء نشط فقط — فحص التفاعلات يحتاج دواءين على الأقل.<br><br>" + _assistantTip();
  }
  var found = [];
  if (typeof DRUG_INTERACTIONS_DB !== "undefined" && DRUG_INTERACTIONS_DB && DRUG_INTERACTIONS_DB.length) {
    for (var i = 0; i < meds.length; i++) {
      for (var j = i + 1; j < meds.length; j++) {
        var a = meds[i].name || "";
        var b = meds[j].name || "";
        for (var k = 0; k < DRUG_INTERACTIONS_DB.length; k++) {
          var inter = DRUG_INTERACTIONS_DB[k];
          if (!inter) continue;
          var ab = _assistantNameMatch(a, inter.a) && _assistantNameMatch(b, inter.b);
          var ba = _assistantNameMatch(a, inter.b) && _assistantNameMatch(b, inter.a);
          if (ab || ba) found.push({ medA: a, medB: b, inter: inter });
        }
      }
    }
  } else if (typeof checkDrugInteractions === "function") {
    for (var m = 0; m < meds.length; m++) checkDrugInteractions(meds[m].name || "");
    return greeting + "<br>تم فحص التفاعلات — راجع التنبيهات الظاهرة على الشاشة. 🔔<br><br>" + _assistantTip();
  }
  if (!found.length) {
    return greeting + "<br>لا توجد تفاعلات معروفة بين أدويتك النشطة ✅<br>استمر على جرعاتك كما وصفها الطبيب.<br><br>" + _assistantTip();
  }
  var html = greeting + "<br>⚠️ وجدت <strong>" + found.length + "</strong> تفاعل(ات) محتملة بين أدويتك:";
  html += "<ul>";
  for (var n = 0; n < found.length; n++) {
    var f = found[n];
    var sev = f.inter.severity === "high" ? "🔴 خطير" : "🟡 متوسط";
    html += "<li><strong>" + _assistantEsc(f.medA) + " + " + _assistantEsc(f.medB) + "</strong> [" + sev + "]<br>" +
      _assistantEsc(f.inter.effect || "") + "<br>💡 " + _assistantEsc(f.inter.advice || "") + "</li>";
  }
  html += "</ul>";
  html += "⚠️ استشر طبيبك قبل تعديل أي دواء.<br><br>" + _assistantTip();
  return html;
}

/* 5) آخر قراءة ضغط + تصنيفها */
function _assistantBp(greeting) {
  var readings = appData.bpReadings || [];
  if (!readings.length) {
    return greeting + "<br>لا توجد قراءات ضغط مسجلة بعد. سجّل قراءتك من تبويب 💓 الحيوية.<br><br>" + _assistantTip();
  }
  var last = readings[readings.length - 1];
  var sys = parseInt(last.sys, 10);
  var dia = parseInt(last.dia, 10);
  var html = greeting + "<br>آخر قراءة ضغط لك: <strong>" + (isNaN(sys) ? "—" : sys) + "/" + (isNaN(dia) ? "—" : dia) + "</strong>";
  if (last.pulse) html += " · النبض: " + _assistantEsc(String(last.pulse));
  if (last.date) html += "<br>📅 " + _assistantEsc(String(last.date));
  if (typeof classifyBp === "function" && !isNaN(sys) && !isNaN(dia)) {
    var cls = classifyBp(sys, dia);
    html += "<br>التصنيف: <strong style='color:" + (cls.color || "#333") + "'>" + _assistantEsc(cls.label || "") + "</strong>";
    if (cls.advice) html += "<br>💡 " + _assistantEsc(cls.advice);
  }
  html += "<br><br>" + _assistantTip();
  return html;
}

/* 6) آخر 3 أعراض مسجلة */
function _assistantSymptoms(greeting) {
  var syms = appData.symptoms || [];
  if (!syms.length) {
    return greeting + "<br>لا توجد أعراض مسجلة — صحتك بخير حتى الآن ✅<br>سجّل أي عرض من تبويب 🩺 الأعراض.<br><br>" + _assistantTip();
  }
  var last3 = syms.slice(-3).reverse();
  var html = greeting + "<br>آخر " + last3.length + " أعراض مسجلة:";
  html += "<ul>";
  for (var i = 0; i < last3.length; i++) {
    var s = last3[i];
    var sev = s.severity ? " · " + _assistantEsc(String(s.severity)) : "";
    html += "<li>" + (s.date ? _assistantEsc(String(s.date)) + " — " : "") + "<strong>" + _assistantEsc(s.desc || "عرض") + "</strong>" + sev + "</li>";
  }
  html += "</ul>";
  html += _assistantTip();
  return html;
}

/* 7) أقرب موعد طبيب قادم */
function _assistantAppointments(greeting) {
  var apps = appData.appointments || [];
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var best = null;
  for (var i = 0; i < apps.length; i++) {
    var a = apps[i];
    if (!a || !a.date) continue;
    var parts = String(a.date).split("-");
    if (parts.length !== 3) continue;
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= today.getTime() && (!best || d.getTime() < best.date.getTime())) {
      best = { app: a, date: d };
    }
  }
  if (!best) {
    return greeting + "<br>لا توجد مواعيد طبيب قادمة مسجلة. أضف موعدك من تبويب 📊 التقارير.<br><br>" + _assistantTip();
  }
  var dateText = (typeof formatDateArabic === "function") ? formatDateArabic(best.app.date) : best.app.date;
  var html = greeting + "<br>أقرب موعد طبيب:";
  html += "<ul><li><strong>" + _assistantEsc(best.app.title || "موعد") + "</strong><br>📅 " + _assistantEsc(dateText);
  if (best.app.time) html += " · 🕐 " + _assistantEsc(best.app.time);
  if (best.app.note) html += "<br>📝 " + _assistantEsc(best.app.note);
  html += "</li></ul>";
  html += _assistantTip();
  return html;
}

/* 8) أفراد العائلة وحساسياتهم */
function _assistantFamily(greeting) {
  var fam = appData.family || [];
  if (!fam.length) {
    return greeting + "<br>لا يوجد أفراد عائلة مسجلون.<br><br>" + _assistantTip();
  }
  var html = greeting + "<br>أفراد عائلتك (" + fam.length + "):";
  html += "<ul>";
  for (var i = 0; i < fam.length; i++) {
    var f = fam[i];
    html += "<li><strong>" + _assistantEsc(f.name || "فرد") + "</strong>";
    if (f.bloodType) html += " · فصيلة الدم: " + _assistantEsc(f.bloodType);
    if (f.allergies) html += "<br>⚠️ حساسية: " + _assistantEsc(f.allergies);
    if (f.chronic) html += "<br>🩺 أمراض مزمنة: " + _assistantEsc(f.chronic);
    if (!f.allergies && !f.chronic) html += " — لا حساسيات مسجلة ✅";
    html += "</li>";
  }
  html += "</ul>";
  html += _assistantTip();
  return html;
}

/* 9) التطعيمات المنجزة والمتبقية (من الجدول الفعلي VACCINE_SCHEDULE) */
function _assistantVaccinations(greeting) {
  var taken = appData.vaccinations || [];
  var takenNames = [];
  for (var i = 0; i < taken.length; i++) {
    if (taken[i] && taken[i].name) takenNames.push(taken[i].name);
  }
  var schedule = (typeof VACCINE_SCHEDULE !== "undefined" && VACCINE_SCHEDULE) ? VACCINE_SCHEDULE : [];
  var remaining = [];
  for (var j = 0; j < schedule.length; j++) {
    if (schedule[j] && takenNames.indexOf(schedule[j].name) === -1) remaining.push(schedule[j]);
  }
  if (!schedule.length && !takenNames.length) {
    return greeting + "<br>لا يوجد جدول تطعيمات مسجل. أضف تطعيماتك من تبويب 💉 التطعيمات.<br><br>" + _assistantTip();
  }
  var html = greeting + "<br>التطعيمات: <strong>" + takenNames.length + " منجز</strong> · <strong>" + remaining.length + " متبقٍ</strong>";
  if (remaining.length) {
    html += "<ul>";
    for (var k = 0; k < remaining.length; k++) {
      html += "<li>" + _assistantEsc(remaining[k].name || "تطعيم");
      if (remaining[k].when) html += " — 🕐 " + _assistantEsc(String(remaining[k].when));
      html += "</li>";
    }
    html += "</ul>";
  }
  if (takenNames.length) {
    html += "✅ المنجز: " + _assistantEsc(takenNames.join("، "));
  }
  html += "<br>راجع تبويب 💉 التطعيمات للتفاصيل.<br><br>" + _assistantTip();
  return html;
}

/* 10) أدوية تنتهي قريباً (خلال 30 يوماً) */
function _assistantExpiring(greeting) {
  if (typeof getExpiringMeds !== "function") {
    return greeting + "<br>وحدة تنبيهات الصلاحية غير متاحة حالياً.<br><br>" + _assistantTip();
  }
  var expiring = getExpiringMeds();
  if (!expiring.length) {
    return greeting + "<br>لا توجد أدوية تنتهي خلال 30 يوماً ✅<br><br>" + _assistantTip();
  }
  var html = greeting + "<br>أدوية تنتهي قريباً (" + expiring.length + "):";
  html += "<ul>";
  for (var i = 0; i < expiring.length; i++) {
    var item = expiring[i];
    var daysText = item.daysLeft === 0 ? "تنتهي اليوم!" : "متبقي " + item.daysLeft + " يوم";
    html += "<li><strong>" + _assistantEsc(item.med.name || "دواء") + "</strong> — " + _assistantEsc(daysText) + "</li>";
  }
  html += "</ul>";
  html += "راجع تبويب 🛡️ السلامة للتفاصيل.<br><br>" + _assistantTip();
  return html;
}

/* 11) أدوية تحتاج إعادة تعبئة (quantity <= refill) */
function _assistantRefill(greeting) {
  var meds = _assistantActiveMeds();
  var need = [];
  for (var i = 0; i < meds.length; i++) {
    var m = meds[i];
    if (typeof m.quantity === "number" && typeof m.refill === "number" && m.quantity <= m.refill) {
      need.push(m);
    }
  }
  if (!need.length) {
    return greeting + "<br>لا توجد أدوية تحتاج إعادة تعبئة حالياً ✅<br><br>" + _assistantTip();
  }
  var html = greeting + "<br>أدوية تحتاج إعادة تعبئة (" + need.length + "):";
  html += "<ul>";
  for (var j = 0; j < need.length; j++) {
    html += "<li><strong>" + _assistantEsc(need[j].name || "دواء") + "</strong> — الكمية المتبقية: " + _assistantEsc(String(need[j].quantity)) + "</li>";
  }
  html += "</ul>";
  html += "أعد التعبئة من تبويب 🛡️ السلامة.<br><br>" + _assistantTip();
  return html;
}

/* 11b) آخر قراءات شاملة (ضغط + سكر + وزن) من appData.vitals */
function _assistantAllVitals(greeting) {
  var vitals = appData.vitals || [];
  if (!vitals.length) {
    return greeting + "<br>لا توجد قراءات مسجلة بعد. سجّل قياسك من تبويب 💓 الحيوية.<br><br>" + _assistantTip();
  }
  var lastByType = {};
  for (var i = 0; i < vitals.length; i++) {
    var v = vitals[i];
    if (!v || !v.type) continue;
    if (!lastByType[v.type]) lastByType[v.type] = v;
  }
  var html = greeting + "<br>آخر قراءاتك المسجلة:";
  html += "<ul>";
  for (var type in lastByType) {
    var v = lastByType[type];
    var cfg = (typeof VITALS_TYPES !== "undefined" && VITALS_TYPES[type]) ? VITALS_TYPES[type] : { label: type, unit: "", icon: "📊" };
    var val = (type === "bp") ? (v.value1 + "/" + v.value2) : (v.value1 + (cfg.unit ? " " + cfg.unit : ""));
    html += "<li>" + (cfg.icon || "📊") + " " + _assistantEsc(cfg.label || type) + ": <strong>" + _assistantEsc(String(val)) + "</strong>";
    if (v.date) html += " <span style='color:var(--text-muted);font-size:.75rem'>(" + _assistantEsc(String(v.date)) + ")</span>";
    html += "</li>";
  }
  html += "</ul>";
  if (typeof classifyBp === "function" && lastByType.bp) {
    var sys = parseInt(lastByType.bp.value1, 10);
    var dia = parseInt(lastByType.bp.value2, 10);
    if (!isNaN(sys) && !isNaN(dia)) {
      var cls = classifyBp(sys, dia);
      html += "تصنيف الضغط: <strong style='color:" + (cls.color || "#333") + "'>" + _assistantEsc(cls.label || "") + "</strong>";
    }
  }
  html += "<br><br>" + _assistantTip();
  return html;
}

/* 11c) الالتزام الشهري — نسبة من سجل الجرعات الفعلي + سلسلة الأيام */
function _assistantMonthlyAdherence(greeting) {
  var meds = _assistantActiveMeds();
  if (!meds.length) {
    return greeting + "<br>لا توجد أدوية نشطة لحساب الالتزام الشهري.<br><br>" + _assistantTip();
  }
  var days = {};
  var now = new Date();
  for (var i = 29; i >= 0; i--) {
    var d = new Date(now);
    d.setDate(now.getDate() - i);
    var ds = d.toISOString().slice(0, 10);
    days[ds] = { total: 0, taken: 0 };
  }
  for (var j = 0; j < meds.length; j++) {
    var m = meds[j];
    var times = m.times || [];
    var log = m.log || {};
    for (var ds in days) {
      for (var k = 0; k < times.length; k++) {
        days[ds].total++;
        if (log[ds + "_" + times[k]]) days[ds].taken++;
      }
    }
  }
  var total = 0, taken = 0, fullDays = 0, partialDays = 0, emptyDays = 0;
  for (var ds in days) {
    total += days[ds].total;
    taken += days[ds].taken;
    if (days[ds].total === 0) continue;
    if (days[ds].taken === days[ds].total) fullDays++;
    else if (days[ds].taken > 0) partialDays++;
    else emptyDays++;
  }
  var pct = total ? Math.round((taken / total) * 100) : 0;
  var html = greeting + "<br>التزامك خلال آخر 30 يوماً: <strong>" + pct + "%</strong> (" + taken + " من " + total + " جرعة)";
  html += "<ul>";
  html += "<li>✅ أيام كاملة الالتزام: " + fullDays + "</li>";
  html += "<li>🟡 أيام ناقصة: " + partialDays + "</li>";
  html += "<li>🔴 أيام فائتة: " + emptyDays + "</li>";
  html += "</ul>";
  if (pct >= 90) html += "التزام ممتاز — حافظ عليه! 🏆";
  else if (pct >= 70) html += "التزام جيد — يمكنك التحسن أكثر.";
  else if (pct >= 50) html += "التزام متوسط — حاول تنظيم مواعيدك.";
  else html += "التزام ضعيف — لا تتردد في طلب المساعدة لتنظيم أدويتك.";
  html += "<br><br>" + _assistantTip();
  return html;
}

/* 12) معلومات عن دواء من الموسوعة */
function _assistantDrugInfo(greeting, raw, text) {
  var query = raw;
  var idx = text.indexOf("ابحث لي عن");
  if (idx !== -1) query = raw.substring(idx + "ابحث لي عن".length).trim();
  else {
    idx = text.indexOf("ابحث عن");
    if (idx !== -1) query = raw.substring(idx + "ابحث عن".length).trim();
    else {
      idx = text.indexOf("معلومات عن");
      if (idx !== -1) query = raw.substring(idx + "معلومات عن".length).trim();
      else {
        idx = text.indexOf("اخبرني عن");
        if (idx !== -1) query = raw.substring(idx + "اخبرني عن".length).trim();
        else {
          idx = text.indexOf("ما هو");
          if (idx !== -1) query = raw.substring(idx + "ما هو".length).trim();
          else {
            idx = text.indexOf("ما هي");
            if (idx !== -1) query = raw.substring(idx + "ما هي".length).trim();
          }
        }
      }
    }
  }
  if (!query) {
    return greeting + "<br>اكتب اسم الدواء بعد \"معلومات عن\" أو \"ابحث عن\" — مثال: معلومات عن باراسيتامول.<br><br>" + _assistantTip();
  }
  var enc = (typeof getFullEncyclopedia === "function") ? getFullEncyclopedia() : [];
  var qn = _assistantNormalize(query);
  var found = null;
  for (var i = 0; i < enc.length; i++) {
    var d = enc[i];
    if (!d) continue;
    var names = [d.ar, d.en].concat(d.brands || []);
    for (var j = 0; j < names.length; j++) {
      var n = _assistantNormalize(names[j] || "");
      if (n && (qn.indexOf(n) !== -1 || n.indexOf(qn) !== -1)) {
        found = d;
        break;
      }
    }
    if (found) break;
  }
  if (!found) {
    return greeting + "<br>لم أجد دواءً باسم \"" + _assistantEsc(query) + "\" في الدليل. جرّب اسماً آخر أو ابحث في تبويب 📚 الدليل.<br><br>" + _assistantTip();
  }
  var html = greeting + "<br><strong>💊 " + _assistantEsc(found.ar || "دواء") + "</strong>";
  if (found.en) html += " <span style='color:var(--text-muted);font-size:.8rem'>(" + _assistantEsc(found.en) + ")</span>";
  html += "<br>📂 التصنيف: " + _assistantEsc(found.cat || "غير محدد");
  html += "<br>🩺 الاستخدامات: " + _assistantEsc(found.uses || "غير محدد");
  html += "<br>💊 الجرعة: " + _assistantEsc(found.dosage || "غير محدد");
  html += "<br>⚠️ الآثار الجانبية: " + _assistantEsc(found.side || "غير محدد");
  if (found.interactions) html += "<br>⚡ التفاعلات: " + _assistantEsc(found.interactions);
  html += "<br><br>" + _assistantTip();
  return html;
}

/* ============================================================
   personalAssistant — المحلل الرئيسي للأسئلة
   ============================================================ */
function personalAssistant(q) {
  try {
    var raw = String(q || "").trim();
    if (!raw) {
      return "اكتب سؤالك وسأجيبك من بياناتك الفعلية 💬";
    }
    var text = _assistantNormalize(raw);
    var greeting = _assistantGreeting();

    /* 4) تفاعلات الأدوية — قبل "أدويتي" حتى لا يلتقطها نمط العدد */
    if (text.indexOf("تفاعل") !== -1 || text.indexOf("تتعارض") !== -1 || text.indexOf("تعارض") !== -1) {
      return _assistantInteractions(greeting);
    }

    /* 1) عدد الأدوية */
    if (text.indexOf("كم دواء") !== -1 || text.indexOf("عدد الادويه") !== -1 ||
        text.indexOf("ادويتي") !== -1 || text.indexOf("ادويتك") !== -1 ||
        text.indexOf("الادويه عندي") !== -1) {
      return _assistantCountMeds(greeting);
    }

    /* 2) أقرب جرعة قادمة */
    if (text.indexOf("الجرعه القادمه") !== -1 || text.indexOf("الجرعه التاليه") !== -1 ||
        text.indexOf("موعد دوائي القادم") !== -1 || text.indexOf("الدواء القادم") !== -1 ||
        text.indexOf("اقرب جرعه") !== -1 || text.indexOf("متى موعد دوائي") !== -1 ||
        text.indexOf("جرعتي القادمه") !== -1 || text.indexOf("جرعتي التاليه") !== -1 ||
        text.indexOf("متى جرعتي") !== -1 || text.indexOf("جرعتي") !== -1) {
      return _assistantNextDose(greeting);
    }

    /* 3b) الالتزام الشهري (30 يوماً) — قبل الالتزام اليومي */
    if (text.indexOf("الالتزام الشهري") !== -1 || text.indexOf("التزام الشهر") !== -1 ||
        text.indexOf("التزام الشهور") !== -1 || text.indexOf("الشهر") !== -1) {
      return _assistantMonthlyAdherence(greeting);
    }

    /* 3) الالتزام اليومي */
    if (text.indexOf("التزامي") !== -1 || text.indexOf("كم اخذت") !== -1 ||
        text.indexOf("التزام") !== -1 || text.indexOf("اخذت اليوم") !== -1 ||
        text.indexOf("جرعاتي اليوم") !== -1 || text.indexOf("تقريري") !== -1 ||
        text.indexOf("جرعاتي") !== -1) {
      return _assistantAdherence(greeting);
    }

    /* 5b) آخر قراءات شاملة (ضغط + سكر + وزن) — قبل نمط الضغط حتى لا يلتقطه */
    if (text.indexOf("قراءاتي") !== -1 || text.indexOf("اخر قراءات") !== -1 ||
        text.indexOf("قراءاتي الاخيره") !== -1 || text.indexOf("قياساتي") !== -1 ||
        text.indexOf("اخر قياس") !== -1 || text.indexOf("سكري") !== -1 ||
        text.indexOf("وزني") !== -1 || text.indexOf("السكر") !== -1 ||
        text.indexOf("الوزن") !== -1 || text.indexOf("اخر ضغط") !== -1 ||
        text.indexOf("اخر سكر") !== -1) {
      return _assistantAllVitals(greeting);
    }

    /* 5) ضغط الدم */
    if (text.indexOf("ضغطي") !== -1 || text.indexOf("ضغط الدم") !== -1 ||
        text.indexOf("الضغط") !== -1 || text.indexOf("قراءه ضغط") !== -1 ||
        text.indexOf("قراءات الضغط") !== -1) {
      return _assistantBp(greeting);
    }

    /* 6) الأعراض المسجلة */
    if (text.indexOf("اعراضي") !== -1 || text.indexOf("اخر الاعراض") !== -1 ||
        text.indexOf("الاعراض") !== -1) {
      return _assistantSymptoms(greeting);
    }

    /* 7) المواعيد */
    if (text.indexOf("مواعيدي") !== -1 || text.indexOf("موعد الطبيب") !== -1 ||
        text.indexOf("موعد طبيب") !== -1 || text.indexOf("المواعيد") !== -1 ||
        text.indexOf("اقرب موعد") !== -1) {
      return _assistantAppointments(greeting);
    }

    /* 8) العائلة */
    if (text.indexOf("عائلتي") !== -1 || text.indexOf("افراد العائله") !== -1 ||
        text.indexOf("العائله") !== -1 || text.indexOf("اهلي") !== -1) {
      return _assistantFamily(greeting);
    }

    /* 9) التطعيمات — قبل "ما هي" حتى لا يلتقطها نمط معلومات الدواء */
    if (text.indexOf("تطعيماتي") !== -1 || text.indexOf("التطعيمات") !== -1 ||
        text.indexOf("تطعيم") !== -1) {
      return _assistantVaccinations(greeting);
    }

    /* 10) انتهاء الصلاحية */
    if (text.indexOf("انتهاء") !== -1 || text.indexOf("صلاحيه") !== -1 ||
        text.indexOf("تنتهي") !== -1 || text.indexOf("منتهيه") !== -1 ||
        text.indexOf("انتهت") !== -1) {
      return _assistantExpiring(greeting);
    }

    /* 11) إعادة التعبئة */
    if (text.indexOf("اعاده تعبئه") !== -1 || text.indexOf("نفد") !== -1 ||
        text.indexOf("نفذ") !== -1 || text.indexOf("الكميه") !== -1 ||
        text.indexOf("تعبئه") !== -1) {
      return _assistantRefill(greeting);
    }

    /* 12) معلومات عن دواء أو بحث — "ابحث" قبل "معلومات" */
    if (text.indexOf("ابحث لي عن") !== -1 || text.indexOf("ابحث عن") !== -1 ||
        text.indexOf("ابحث") !== -1 || text.indexOf("معلومات عن") !== -1 ||
        text.indexOf("ما هو") !== -1 || text.indexOf("ما هي") !== -1 ||
        text.indexOf("اخبرني عن") !== -1 || text.indexOf("عرفني على") !== -1) {
      return _assistantDrugInfo(greeting, raw, text);
    }

    /* 13) أشعر بـ / أعاني من عرض */
    var feels = (text.indexOf("اشعر") !== -1 || text.indexOf("احس") !== -1 || text.indexOf("اعاني") !== -1);
    if (feels || text.indexOf("عندي") !== -1) {
      if (typeof symptomChecker === "function") {
        var sc = symptomChecker(raw);
        if (sc) return greeting + "<br>" + sc + "<br><br>" + _assistantTip();
      }
      if (feels) {
        return greeting + "<br>لم أتعرف على العرض بدقة. سجّله في تبويب 🩺 الأعراض، وإذا كان شديداً أو مستمراً راجع طبيبك فوراً.<br><br>" + _assistantTip();
      }
    }

    /* 13b) نصيحة صحية سريعة */
    if (text.indexOf("نصيحه") !== -1 || text.indexOf("نصيحة") !== -1) {
      return greeting + "<br>" + _assistantTip();
    }

    /* 14) أي سؤال آخر — رد ذكي يقترح الأسئلة المتاحة */
    var html = greeting + "<br>يمكنني مساعدتك في:";
    html += "<ul>";
    for (var i = 0; i < ASSISTANT_QUICK_QUESTIONS.length; i++) {
      html += "<li>" + _assistantEsc(ASSISTANT_QUICK_QUESTIONS[i]) + "</li>";
    }
    html += "</ul>";
    html += "اكتب سؤالك أو اضغط على أحد الأسئلة بالأسفل 👇<br><br>" + _assistantTip();
    return html;
  } catch (err) {
    console.error("خطأ في المساعد الشخصي:", err);
    return "عذراً، حدث خطأ غير متوقع. حاول مرة أخرى 🙏";
  }
}

/* ============================================================
   فقاعة الدردشة — اللوحة والرسائل
   ============================================================ */

/* حقن أنماط اللوحة مرة واحدة */
function _assistantInjectStyles() {
  if (window._ASSISTANT_STYLES_INJECTED) return;
  window._ASSISTANT_STYLES_INJECTED = true;
  var style = document.createElement("style");
  style.id = "assistantStyles";
  style.textContent =
    ".assistant-panel{position:fixed;bottom:84px;right:16px;width:340px;max-width:calc(100vw - 32px);" +
    "height:480px;max-height:calc(100vh - 150px);background:var(--card,#fff);border-radius:18px;" +
    "box-shadow:0 10px 40px rgba(13,148,136,.28);display:flex;flex-direction:column;overflow:hidden;" +
    "z-index:200;border:1px solid var(--border,#e2f3f0);font-family:inherit;}" +
    ".assistant-panel.hidden{display:none;}" +
    ".assistant-header{background:linear-gradient(135deg,var(--primary,#0d9488),var(--primary-dark,#0f766e));" +
    "color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:.95rem;}" +
    ".assistant-close{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;" +
    "cursor:pointer;font-size:.85rem;line-height:1;}" +
    ".assistant-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;" +
    "background:var(--bg,#f0fdfa);}" +
    ".assistant-msg{max-width:88%;padding:9px 12px;border-radius:14px;font-size:.84rem;line-height:1.65;" +
    "word-break:break-word;}" +
    ".assistant-msg.bot{background:var(--card,#fff);border:1px solid var(--border,#e2f3f0);" +
    "border-top-right-radius:4px;align-self:flex-start;color:var(--text,#134e4a);}" +
    ".assistant-msg.user{background:linear-gradient(135deg,var(--primary,#0d9488),var(--primary-dark,#0f766e));" +
    "color:#fff;border-top-left-radius:4px;align-self:flex-end;}" +
    ".assistant-msg ul{margin:6px 0 2px;padding-right:18px;}" +
    ".assistant-msg li{margin-bottom:4px;}" +
    ".assistant-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;background:var(--card,#fff);" +
    "border-top:1px solid var(--border,#e2f3f0);max-height:110px;overflow-y:auto;}" +
    ".assistant-chips-title{width:100%;font-size:.72rem;font-weight:800;color:var(--text-muted,#5b7d7a);margin-bottom:2px;}" +
    ".assistant-chip{background:var(--primary-light,#ccfbf1);color:var(--primary-dark,#0f766e);" +
    "border:1px solid var(--primary,#0d9488);border-radius:16px;padding:5px 10px;font-size:.74rem;" +
    "cursor:pointer;font-family:inherit;}" +
    ".assistant-input-row{display:flex;gap:6px;padding:8px 12px;background:var(--card,#fff);" +
    "border-top:1px solid var(--border,#e2f3f0);}" +
    ".assistant-input-row input{flex:1;padding:9px 12px;border:1px solid var(--border,#e2f3f0);" +
    "border-radius:20px;font-size:.85rem;font-family:inherit;background:var(--bg,#f0fdfa);color:var(--text,#134e4a);}" +
    ".assistant-send{width:38px;height:38px;border-radius:50%;background:var(--primary,#0d9488);color:#fff;" +
    "border:none;cursor:pointer;font-size:1rem;flex-shrink:0;}" +
    ".assistant-fab{position:fixed;bottom:90px;right:20px;width:56px;height:56px;border-radius:50%;" +
    "background:linear-gradient(135deg,var(--primary,#0d9488),var(--primary-dark,#0f766e));color:#fff;" +
    "border:none;font-size:1.6rem;box-shadow:0 6px 20px rgba(13,148,136,.4);cursor:pointer;z-index:150;" +
    "display:flex;align-items:center;justify-content:center;transition:transform .2s;}" +
    ".assistant-fab:active{transform:scale(.9);}";
  document.head.appendChild(style);
}

/* ضمان وجود اللوحة (تنشئها إن لم يضفها القائد) */
function _assistantEnsurePanel() {
  var panel = document.getElementById("assistantPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "assistantPanel";
    panel.className = "assistant-panel hidden";
    document.body.appendChild(panel);
  }
  return panel;
}

/* ضمان وجود زر الفقاعة العائم (إن لم يضفه القائد) */
function _assistantEnsureFab() {
  if (document.getElementById("assistantFab")) return;
  var fab = document.createElement("button");
  fab.id = "assistantFab";
  fab.className = "assistant-fab";
  fab.title = "المساعد الشخصي";
  fab.innerHTML = "🤖";
  fab.onclick = function () { openAssistantChat(); };
  document.body.appendChild(fab);
}

/* رسالة ترحيب تعرض إمكانيات المساعد */
function _assistantWelcome() {
  return "أهلاً بك! أنا مساعدك الشخصي الذكي 🤖<br>" +
    "أعرف كل بياناتك وأجيبك فوراً عن:<br>" +
    "• عدد أدويتك وجرعاتها<br>" +
    "• موعد جرعتك القادمة اليوم<br>" +
    "• التزامك اليومي والشهري بالجرعات<br>" +
    "• تفاعلات أدويتك مع بعضها<br>" +
    "• آخر قراءاتك (ضغط · سكر · وزن)<br>" +
    "• أعراضك ومواعيد طبيبك وعائلتك<br>" +
    "• تطعيماتك وأدوية تنتهي قريباً<br>" +
    "• معلومات عن أي دواء في الدليل<br>" +
    "جرّب الأسئلة السريعة بالأسفل 👇";
}

/* إضافة رسالة إلى منطقة الرسائل */
function _assistantAddMessage(text, isUser) {
  var msgs = document.getElementById("assistantMessages");
  if (!msgs) return;
  var div = document.createElement("div");
  div.className = "assistant-msg " + (isUser ? "user" : "bot");
  if (isUser) div.textContent = text;
  else div.innerHTML = text;
  msgs.appendChild(div);
  _assistantScrollDown();
}

/* تمرير منطقة الرسائل للأسفل */
function _assistantScrollDown() {
  var msgs = document.getElementById("assistantMessages");
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

/* رسم أزرار الأسئلة السريعة */
function _assistantRenderChips() {
  var chips = document.getElementById("assistantChips");
  if (!chips) return;
  var html = '<div class="assistant-chips-title">⚡ أسئلة سريعة — اضغط للسؤال</div>';
  for (var i = 0; i < ASSISTANT_QUICK_QUESTIONS.length; i++) {
    html += '<button class="assistant-chip" onclick="askAssistantQuick(\'' +
      _assistantEscAttr(ASSISTANT_QUICK_QUESTIONS[i]) + '\')">' +
      _assistantEsc(ASSISTANT_QUICK_QUESTIONS[i]) + '</button>';
  }
  chips.innerHTML = html;
}

/* ============================================================
   الواجهات العامة للفقاعة
   ============================================================ */

/* رسم لوحة الدردشة كاملة داخل #assistantPanel */
function renderAssistantPanel() {
  var panel = _assistantEnsurePanel();
  if (!panel) return;
  try {
    _assistantInjectStyles();
    panel.innerHTML =
      '<div class="assistant-header">' +
        '<span>🤖 المساعد الشخصي</span>' +
        '<button class="assistant-close" onclick="closeAssistantChat()" title="إغلاق">✕</button>' +
      '</div>' +
      '<div class="assistant-messages" id="assistantMessages"></div>' +
      '<div class="assistant-chips" id="assistantChips"></div>' +
      '<div class="assistant-input-row">' +
        '<input type="text" id="assistantChatInput" placeholder="اسألني عن أدويتك..." ' +
        'onkeydown="if(event.key===\'Enter\')sendAssistantMessage()">' +
        '<button class="assistant-send" onclick="sendAssistantMessage()" title="إرسال">➤</button>' +
      '</div>';
    var msgs = document.getElementById("assistantMessages");
    if (msgs && !msgs.children.length) {
      _assistantAddMessage(_assistantWelcome(), false);
    }
    _assistantRenderChips();
  } catch (err) {
    console.error("خطأ في رسم لوحة المساعد:", err);
  }
}

/* فتح لوحة الدردشة */
function openAssistantChat() {
  var panel = _assistantEnsurePanel();
  if (!panel) return;
  try {
    if (!panel.innerHTML.trim()) renderAssistantPanel();
    panel.classList.remove("hidden");
    _assistantScrollDown();
    var input = document.getElementById("assistantChatInput");
    if (input) input.focus();
  } catch (err) {
    console.error("خطأ في فتح لوحة المساعد:", err);
  }
}

/* إغلاق لوحة الدردشة */
function closeAssistantChat() {
  var panel = document.getElementById("assistantPanel");
  if (panel) panel.classList.add("hidden");
}

/* إرسال رسالة المستخدم وعرض الرد */
function sendAssistantMessage() {
  var input = document.getElementById("assistantChatInput");
  if (!input) return;
  try {
    var q = input.value.trim();
    if (!q) return;
    _assistantAddMessage(q, true);
    input.value = "";
    var reply = personalAssistant(q);
    _assistantAddMessage(reply, false);
    _assistantScrollDown();
  } catch (err) {
    console.error("خطأ في إرسال رسالة المساعد:", err);
  }
}

/* إرسال سؤال سريع (تستدعيها الأزرار) */
function askAssistantQuick(q) {
  var input = document.getElementById("assistantChatInput");
  if (input) input.value = q;
  sendAssistantMessage();
}

/* فتح لوحة المساعد ثم إرسال سؤال سريع (تستدعيها كروت لوحة الأدوات) */
function askAssistantQuickOpen(q) {
  if (typeof openAssistantChat === "function") openAssistantChat();
  askAssistantQuick(q);
}

/* ============================================================
   التهيئة — إنشاء زر الفقاعة عند تحميل الصفحة
   ============================================================ */
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      _assistantEnsureFab();
    });
  } else {
    _assistantEnsureFab();
  }
}

/* ---------- علم الجاهزية ---------- */
window.FEATURES_ASSISTANT_READY = true;