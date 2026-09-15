/* ===== الصحة والتحليل — الإصدار 1.9 ===== */

/* ==========================================================
   1. تتبع ضغط الدم 🩺
   ========================================================== */

function classifyBp(sys, dia) {
  if (typeof sys !== "number" || typeof dia !== "number") {
    return { label: "غير صالح", color: "#9ca3af", advice: "أدخل قراءة صحيحة" };
  }
  if (sys < 90 && dia < 60) {
    return { label: "منخفض", color: "#3b82f6", advice: "الضغط منخفض — اشرب ماءً وتقدم ببطء، وإذا استمر تواصل مع طبيبك" };
  }
  if (sys >= 180 || dia >= 120) {
    return { label: "أزمة", color: "#dc2626", advice: "أزمة ضغط — اتصل بالطوارئ فوراً ولا تنتظر" };
  }
  if (sys >= 140 || dia >= 90) {
    return { label: "مرتفع", color: "#ef4444", advice: "الضغط مرتفع — تناول دواءك وقلل الملح، وتابع طبيبك" };
  }
  if (sys >= 130 || dia >= 80) {
    return { label: "مرتفع قليلاً", color: "#f59e0b", advice: "الضغط مرتفع قليلاً — انتبه لنمط حياتك وقلل الملح والكافيين" };
  }
  if (sys >= 120 && dia < 80) {
    return { label: "مرتفع قليلاً", color: "#f59e0b", advice: "الضغط مرتفع قليلاً — حافظ على نشاطك وقلل الملح" };
  }
  return { label: "طبيعي", color: "#22c55e", advice: "ممتاز — ضغطك طبيعي، استمر على هذا النهج" };
}

function addBpReading() {
  try {
    var sysEl = document.getElementById("bpSys");
    var diaEl = document.getElementById("bpDia");
    var pulseEl = document.getElementById("bpPulse");
    if (!sysEl || !diaEl) return;

    var sys = parseInt(sysEl.value, 10);
    var dia = parseInt(diaEl.value, 10);
    var pulse = pulseEl ? parseInt(pulseEl.value, 10) : 0;

    if (isNaN(sys) || isNaN(dia)) {
      showToast("أدخل قيم صحيحة للضغط", "error");
      return;
    }
    if (sys < 50 || sys > 250) {
      showToast("الضغط الانقباضي يجب أن بين 50 و 250", "error");
      return;
    }
    if (dia < 30 || dia > 150) {
      showToast("الضغط الانبساطي يجب أن بين 30 و 150", "error");
      return;
    }
    if (sys <= dia) {
      showToast("الضغط الانقباضي يجب أن يكون أكبر من الانبساطي", "error");
      return;
    }

    if (!appData.bpReadings) appData.bpReadings = [];
    appData.bpReadings.push({
      date: todayStr(),
      sys: sys,
      dia: dia,
      pulse: isNaN(pulse) ? 0 : pulse
    });
    saveData();

    sysEl.value = "";
    diaEl.value = "";
    if (pulseEl) pulseEl.value = "";

    showToast("تم حفظ قراءة الضغط", "success");
    renderBpTracker();
  } catch (e) {
    console.error("خطأ في إضافة قراءة الضغط:", e);
    showToast("حدث خطأ غير متوقع", "error");
  }
}

function renderBpChart() {
  try {
    var el = document.getElementById("bpChartArea");
    if (!el) return;

    var readings = (appData.bpReadings || []).slice(-14);
    if (readings.length === 0) {
      el.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:20px;">لا توجد قراءات بعد</p>';
      return;
    }

    var w = 560, h = 220, padL = 40, padR = 20, padT = 20, padB = 40;
    var chartW = w - padL - padR;
    var chartH = h - padT - padB;

    var minVal = 40, maxVal = 200;
    for (var i = 0; i < readings.length; i++) {
      if (readings[i].sys > maxVal) maxVal = readings[i].sys;
      if (readings[i].dia > maxVal) maxVal = readings[i].dia;
      if (readings[i].sys < minVal) minVal = readings[i].sys;
      if (readings[i].dia < minVal) minVal = readings[i].dia;
    }
    minVal = Math.floor(minVal / 10) * 10 - 10;
    maxVal = Math.ceil(maxVal / 10) * 10 + 10;
    if (minVal < 0) minVal = 0;

    var range = maxVal - minVal;
    function xPos(idx) { return padL + (idx / Math.max(readings.length - 1, 1)) * chartW; }
    function yPos(val) { return padT + chartH - ((val - minVal) / range) * chartH; }

    var svg = '<svg viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:560px;display:block;margin:0 auto;">';

    /* خطوط الشبكة */
    var gridSteps = [60, 80, 100, 120, 140, 160, 180];
    for (var g = 0; g < gridSteps.length; g++) {
      var gv = gridSteps[g];
      if (gv >= minVal && gv <= maxVal) {
        var gy = yPos(gv);
        svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="#e5e7eb" stroke-width="0.5"/>';
        svg += '<text x="' + (padL - 5) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="9" fill="#9ca3af">' + gv + "</text>";
      }
    }

    /* خط الانقباضي (أحمر) */
    var pathSys = "";
    var pathDia = "";
    for (var j = 0; j < readings.length; j++) {
      var x = xPos(j);
      var yS = yPos(readings[j].sys);
      var yD = yPos(readings[j].dia);
      pathSys += (j === 0 ? "M" : "L") + x.toFixed(1) + "," + yS.toFixed(1) + " ";
      pathDia += (j === 0 ? "M" : "L") + x.toFixed(1) + "," + yD.toFixed(1) + " ";
    }
    svg += '<path d="' + pathSys + '" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>';
    svg += '<path d="' + pathDia + '" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>';

    /* النقاط والتسميات */
    for (var k = 0; k < readings.length; k++) {
      var cx = xPos(k);
      var cyS = yPos(readings[k].sys);
      var cyD = yPos(readings[k].dia);
      svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + cyS.toFixed(1) + '" r="3.5" fill="#ef4444"/>';
      svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + cyD.toFixed(1) + '" r="3.5" fill="#3b82f6"/>';

      /* تسمية التاريخ */
      var dateParts = readings[k].date.split("-");
      var shortDate = dateParts[2] + "/" + dateParts[1];
      svg += '<text x="' + cx.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="7" fill="#6b7280">' + shortDate + "</text>";
    }

    /* المفتاح */
    svg += '<circle cx="' + (padL + 10) + '" cy="' + (h - 2) + '" r="4" fill="#ef4444"/>';
    svg += '<text x="' + (padL + 20) + '" y="' + (h + 2) + '" font-size="9" fill="#374151">انقباضي</text>';
    svg += '<circle cx="' + (padL + 90) + '" cy="' + (h - 2) + '" r="4" fill="#3b82f6"/>';
    svg += '<text x="' + (padL + 100) + '" y="' + (h + 2) + '" font-size="9" fill="#374151">انبساطي</text>';

    svg += "</svg>";
    el.innerHTML = svg;
  } catch (e) {
    console.error("خطأ في رسم بياني للضغط:", e);
  }
}

function renderBpTracker() {
  try {
    var el = document.getElementById("bpTracker");
    if (!el) return;

    var readings = appData.bpReadings || [];
    var lastReading = readings.length > 0 ? readings[readings.length - 1] : null;
    var last10 = readings.slice(-10).reverse();

    var html = "";

    /* نموذج الإدخال */
    html += '<div class="report-card">';
    html += '<h3 class="section-title">تسجيل ضغط الدم</h3>';
    html += '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">';
    html += '<div><label style="display:block;font-size:0.8em;color:#6b7280;">انقباضي</label>';
    html += '<input id="bpSys" type="number" min="50" max="250" placeholder="120" style="width:80px;padding:8px;border:1px solid #d1d5db;border-radius:8px;text-align:center;"/></div>';
    html += '<div><label style="display:block;font-size:0.8em;color:#6b7280;">انبساطي</label>';
    html += '<input id="bpDia" type="number" min="30" max="150" placeholder="80" style="width:80px;padding:8px;border:1px solid #d1d5db;border-radius:8px;text-align:center;"/></div>';
    html += '<div><label style="display:block;font-size:0.8em;color:#6b7280;">النبض (اختياري)</label>';
    html += '<input id="bpPulse" type="number" min="30" max="200" placeholder="72" style="width:80px;padding:8px;border:1px solid #d1d5db;border-radius:8px;text-align:center;"/></div>';
    html += '<button class="btn btn-primary" onclick="addBpReading()">حفظ</button>';
    html += "</div></div>";

    /* آخر قراءة مع التصنيف */
    if (lastReading) {
      var cls = classifyBp(lastReading.sys, lastReading.dia);
      html += '<div class="report-card" style="border-right:4px solid ' + cls.color + ';">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<div>';
      html += '<div style="font-size:1.1em;font-weight:bold;">' + lastReading.sys + "/" + lastReading.dia + " mmHg";
      if (lastReading.pulse > 0) html += '  —  النبض: ' + lastReading.pulse;
      html += "</div>";
      html += '<div style="font-size:0.85em;color:#6b7280;">' + lastReading.date + "</div>";
      html += "</div>";
      html += '<span class="badge" style="background:' + cls.color + ";color:#fff;padding:4px 12px;border-radius:20px;\">" + escapeHtml(cls.label) + "</span>";
      html += "</div>";
      html += '<p style="margin:8px 0 0;font-size:0.85em;color:#374151;">' + escapeHtml(cls.advice) + "</p>";
      html += "</div>";
    }

    /* الرسم البياني */
    html += '<div class="report-card">';
    html += '<h3 class="section-title">الرسم البياني</h3>';
    html += '<div id="bpChartArea"></div>';
    html += "</div>";

    /* قائمة آخر 10 قراءات */
    if (last10.length > 0) {
      html += '<div class="report-card">';
      html += '<h3 class="section-title">آخر 10 قراءات</h3>';
      html += '<div style="overflow-x:auto;">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:0.9em;">';
      html += "<thead><tr>";
      html += '<th style="padding:8px;border-bottom:2px solid #e5e7eb;text-align:right;">التاريخ</th>';
      html += '<th style="padding:8px;border-bottom:2px solid #e5e7eb;text-align:right;">الضغط</th>';
      html += '<th style="padding:8px;border-bottom:2px solid #e5e7eb;text-align:right;">النبض</th>';
      html += '<th style="padding:8px;border-bottom:2px solid #e5e7eb;text-align:right;">التصنيف</th>';
      html += "</tr></thead><tbody>";
      for (var i = 0; i < last10.length; i++) {
        var r = last10[i];
        var c = classifyBp(r.sys, r.dia);
        html += "<tr>";
        html += '<td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;">' + escapeHtml(r.date) + "</td>";
        html += '<td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-weight:bold;">' + r.sys + "/" + r.dia + "</td>";
        html += '<td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;">' + (r.pulse > 0 ? r.pulse : "—") + "</td>";
        html += '<td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;"><span class="badge" style="background:' + c.color + ";color:#fff;padding:2px 8px;border-radius:12px;font-size:0.85em;\">" + escapeHtml(c.label) + "</span></td>";
        html += "</tr>";
      }
      html += "</tbody></table></div></div>";
    }

    el.innerHTML = html;

    /* رسم الرسم البياني بعد إدخال HTML */
    renderBpChart();
  } catch (e) {
    console.error("خطأ في رسم مُتتبع الضغط:", e);
  }
}


/* ==========================================================
   2. ربط الأعراض بالأدوية 🔗
   ========================================================== */

function renderSymptomMedLink() {
  try {
    var el = document.getElementById("symptomMedLink");
    if (!el) return;

    var entries = appData.symptomMeds || [];
    var activeMeds = (appData.medications || []).filter(function (m) { return m.active; });

    var html = "";

    /* نموذج الإدخال */
    html += '<div class="report-card">';
    html += '<h3 class="section-title">ربط العرض بالدواء</h3>';
    html += '<div style="margin-bottom:12px;">';
    html += '<label style="display:block;font-size:0.85em;color:#6b7280;margin-bottom:4px;">وصف العرض</label>';
    html += '<input id="symDesc" type="text" placeholder="مثال: صداع، غثيان، دوخة..." style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;"/>';
    html += "</div>";

    if (activeMeds.length === 0) {
      html += '<p style="color:#9ca3af;font-size:0.9em;">لا توجد أدوية نشطة — أضف أدوية أولاً</p>';
    } else {
      html += '<label style="display:block;font-size:0.85em;color:#6b7280;margin-bottom:6px;">اختر الأدوية المرتبطة:</label>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">';
      for (var i = 0; i < activeMeds.length; i++) {
        html += '<label style="display:flex;align-items:center;gap:4px;padding:6px 12px;border:1px solid #d1d5db;border-radius:8px;cursor:pointer;font-size:0.9em;background:#fff;">';
        html += '<input type="checkbox" name="symMed_' + escapeHtml(activeMeds[i].id) + '" value="' + escapeHtml(activeMeds[i].name) + '">';
        html += escapeHtml(activeMeds[i].name) + " " + escapeHtml(activeMeds[i].dosage);
        html += "</label>";
      }
      html += "</div>";
      html += '<button class="btn btn-primary" onclick="addSymptomMedEntry()">حفظ الربط</button>';
    }
    html += "</div>";

    /* سجل الإدخالات السابقة */
    if (entries.length > 0) {
      html += '<div class="report-card">';
      html += '<h3 class="section-title">سجل الأعراض والربط</h3>';
      var displayEntries = entries.slice(-20).reverse();
      for (var j = 0; j < displayEntries.length; j++) {
        var entry = displayEntries[j];
        html += '<div style="padding:10px;border-bottom:1px solid #f3f4f6;">';
        html += '<div style="font-weight:bold;color:#1f2937;">' + escapeHtml(entry.symptom) + '</div>';
        html += '<div style="font-size:0.8em;color:#6b7280;margin-top:2px;">' + escapeHtml(entry.date) + "</div>";
        html += '<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">';
        if (entry.meds && entry.meds.length > 0) {
          for (var k = 0; k < entry.meds.length; k++) {
            html += '<span class="badge" style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:10px;font-size:0.8em;">' + escapeHtml(entry.meds[k]) + "</span>";
          }
        } else {
          html += '<span style="color:#9ca3af;font-size:0.8em;">بدون أدوية محددة</span>';
        }
        html += "</div></div>";
      }
      html += "</div>";
    }

    el.innerHTML = html;
  } catch (e) {
    console.error("خطأ في رسم ربط الأعراض:", e);
  }
}

function addSymptomMedEntry() {
  try {
    var descEl = document.getElementById("symDesc");
    if (!descEl) return;

    var symptom = (descEl.value || "").trim();
    if (!symptom) {
      showToast("اكتب وصف العرض أولاً", "error");
      return;
    }

    var checkboxes = document.querySelectorAll('input[name^="symMed_"]');
    var selectedMeds = [];
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        selectedMeds.push(checkboxes[i].value);
      }
    }

    if (!appData.symptomMeds) appData.symptomMeds = [];
    appData.symptomMeds.push({
      date: todayStr(),
      symptom: symptom,
      meds: selectedMeds
    });
    saveData();

    showToast("تم حفظ ربط العرض بالدواء", "success");
    renderSymptomMedLink();
  } catch (e) {
    console.error("خطأ في إضافة ربط العرض:", e);
    showToast("حدث خطأ غير متوقع", "error");
  }
}


/* ==========================================================
   3. خطط علاجية جاهزة 📋
   ========================================================== */

var TREATMENT_PLANS = [
  {
    id: "plan_diabetes2",
    title: "السكري النوع الثاني",
    icon: "\u{1F4A7}",
    desc: "إدارة السكري النوع الثاني بميتفورمين مع متابعة يومية للسكر والحمية المناسبة.",
    meds: [
      { name: "ميتفورمين", dosage: "500mg", times: ["08:00", "20:00"], days: [0, 1, 2, 3, 4, 5, 6], quantity: 60, refill: 10, notes: "تناول مع الطعام — فحص سكر صائم يومياً — حافظ على نظام غذائي صحي — قلل السكريات والمتحoverrides" }
    ]
  },
  {
    id: "plan_hypertension",
    title: "ارتفاع الضغط",
    icon: "\u{1FA7A}",
    desc: "إدارة ارتفاع ضغط الدم بلوسارتان مع قياس يومي وتقليل الملح.",
    meds: [
      { name: "لوسارتان", dosage: "50mg", times: ["08:00"], days: [0, 1, 2, 3, 4, 5, 6], quantity: 30, refill: 5, notes: "قياس الضغط صباحاً — قلل الملح والمقالي — مارس المشي 30 دقيقة يومياً" }
    ]
  },
  {
    id: "plan_cholesterol",
    title: "الكوليسترول المرتفع",
    icon: "\u{1F9C0}",
    desc: "إدارة الكوليسترول بأتورفاستاتين مع متابعة الدهون كل 6 أشهر.",
    meds: [
      { name: "أتورفاستاتين", dosage: "10mg", times: ["21:00"], days: [0, 1, 2, 3, 4, 5, 6], quantity: 30, refill: 5, notes: "تناول في المساء — تجنب عصير الجريب فروت — فحص دهون كل 6 أشهر" }
    ]
  },
  {
    id: "plan_asthma",
    title: "الربو",
    icon: "\u{1FAC1}",
    desc: "إدارة الربو ببخاخ وقائي صباحاً ومساء مع بخاخ عند الحاجة.",
    meds: [
      { name: "سالبيوتامول بخاخ", dosage: "100mcg/جرعة", times: ["عند الحاجة"], days: [0, 1, 2, 3, 4, 5, 6], quantity: 200, refill: 20, notes: "استخدم عند الشعور بضيق التنفس — اغسل فمك بعد البخاخ الوقائي" },
      { name: "بديسونيد بخاخ", dosage: "200mcg", times: ["08:00", "21:00"], days: [0, 1, 2, 3, 4, 5, 6], quantity: 120, refill: 15, notes: "بخاخ وقائي — استخدم بانتظام حتى لو تحسنت الحالة" }
    ]
  },
  {
    id: "plan_thyroid",
    title: "قصور الغدة الدرقية",
    icon: "\u{26A1}",
    desc: "تعويض هرمون الدرقية بليفوثيروكسين صباحاً على معدة فارغة.",
    meds: [
      { name: "ليفوثيروكسين", dosage: "50mcg", times: ["07:00"], days: [0, 1, 2, 3, 4, 5, 6], quantity: 30, refill: 5, notes: "تناول صباحاً على معدة فارغة — انتظر 30-60 دقيقة قبل الأكل — تجنب الكالسيوم والحديد لمدة 4 ساعات" }
    ]
  }
];

function renderTreatmentPlans() {
  try {
    var el = document.getElementById("treatmentPlans");
    if (!el) return;

    var html = '<div style="display:grid;gap:12px;">';

    for (var i = 0; i < TREATMENT_PLANS.length; i++) {
      var plan = TREATMENT_PLANS[i];
      html += '<div class="report-card">';
      html += '<div style="display:flex;align-items:flex-start;gap:12px;">';
      html += '<span style="font-size:2em;">' + plan.icon + "</span>";
      html += '<div style="flex:1;">';
      html += '<h3 style="margin:0 0 4px;font-size:1.1em;color:#1f2937;">' + escapeHtml(plan.title) + "</h3>";
      html += '<p style="margin:0 0 8px;font-size:0.9em;color:#6b7280;">' + escapeHtml(plan.desc) + "</p>";

      /* عرض ملخص الأدوية */
      html += '<div style="margin-bottom:8px;">';
      for (var j = 0; j < plan.meds.length; j++) {
        var m = plan.meds[j];
        html += '<div style="font-size:0.85em;padding:4px 0;color:#374151;">• <strong>' + escapeHtml(m.name) + "</strong> " + escapeHtml(m.dosage) + " — " + escapeHtml(m.notes.split("—")[0]) + "</div>";
      }
      html += "</div>";

      html += '<button class="btn btn-outline" onclick="loadTreatmentPlan(\'' + escapeHtml(plan.id) + "')\">تحميل الخطة</button>";
      html += "</div>";
      html += "</div></div>";
    }

    html += "</div>";
    el.innerHTML = html;
  } catch (e) {
    console.error("خطأ في رسم الخطط العلاجية:", e);
  }
}

function loadTreatmentPlan(planId) {
  try {
    var plan = null;
    for (var i = 0; i < TREATMENT_PLANS.length; i++) {
      if (TREATMENT_PLANS[i].id === planId) {
        plan = TREATMENT_PLANS[i];
        break;
      }
    }
    if (!plan) {
      showToast("الخطة غير موجودة", "error");
      return;
    }

    if (!appData.medications) appData.medications = [];

    for (var j = 0; j < plan.meds.length; j++) {
      var src = plan.meds[j];
      var med = {
        id: uid(),
        name: src.name,
        dosage: src.dosage,
        form: "",
        times: src.times.slice(),
        days: src.days.slice(),
        quantity: src.quantity,
        refill: src.refill,
        notes: src.notes,
        expiry: "",
        missedInstr: "",
        photo: "",
        category: "\u{1F4CB} خطة علاجية",
        courseTotal: 0,
        memberId: "member_self",
        active: true,
        log: {}
      };
      appData.medications.push(med);
    }

    saveData();
    renderAll();
    showToast("\u2713 تم تحميل خطة " + plan.title, "success");
  } catch (e) {
    console.error("خطأ في تحميل الخطة العلاجية:", e);
    showToast("حدث خطأ أثناء تحميل الخطة", "error");
  }
}


/* ==========================================================
   4. علم الجاهزية
   ========================================================== */

window.FEATURES_HEALTH_READY = true;
