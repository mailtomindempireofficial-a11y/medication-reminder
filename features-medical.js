/* ===== وحدة السلامة الطبية — الإصدار 1.9 ===== */
/* بطاقة الطوارئ + حاسبة جرعات الأطفال + تنبيهات انتهاء الصلاحية + تنبيهات إعادة التعبئة */

"use strict";

/* ---------- تهيئة آمنة لبيانات الطوارئ ---------- */
function ensureEmergencyData() {
  if (!appData.emergency) {
    appData.emergency = {
      allergies: "",
      chronic: "",
      bloodType: "",
      emergencyContact: "",
      insurance: "",
      notes: ""
    };
  }
}

/* ---------- 1) بطاقة الطوارئ الطبية ---------- */
function renderEmergencyCard() {
  var el = document.getElementById("emergencyCard");
  if (!el) return;
  try {
    ensureEmergencyData();
    var e = appData.emergency;
    el.innerHTML =
      '<div class="report-card">' +
        '<div class="section-title">🆘 بطاقة الطوارئ الطبية</div>' +
        '<div class="vitals-card">' +
          '<label>الحساسية</label>' +
          '<input type="text" id="emAllergies" placeholder="مثال: بنسلين، فول سوداني" value="' + escapeHtml(e.allergies || "") + '">' +
          '<label>الأمراض المزمنة</label>' +
          '<input type="text" id="emChronic" placeholder="مثال: سكري، ضغط" value="' + escapeHtml(e.chronic || "") + '">' +
          '<label>فصيلة الدم</label>' +
          '<select id="emBlood">' +
            '<option value="">— اختر —</option>' +
            '<option value="A+"' + (e.bloodType === "A+" ? " selected" : "") + '>A+</option>' +
            '<option value="A-"' + (e.bloodType === "A-" ? " selected" : "") + '>A-</option>' +
            '<option value="B+"' + (e.bloodType === "B+" ? " selected" : "") + '>B+</option>' +
            '<option value="B-"' + (e.bloodType === "B-" ? " selected" : "") + '>B-</option>' +
            '<option value="AB+"' + (e.bloodType === "AB+" ? " selected" : "") + '>AB+</option>' +
            '<option value="AB-"' + (e.bloodType === "AB-" ? " selected" : "") + '>AB-</option>' +
            '<option value="O+"' + (e.bloodType === "O+" ? " selected" : "") + '>O+</option>' +
            '<option value="O-"' + (e.bloodType === "O-" ? " selected" : "") + '>O-</option>' +
          '</select>' +
          '<label>جهة اتصال الطوارئ (الاسم والهاتف)</label>' +
          '<input type="text" id="emContact" placeholder="مثال: أحمد 0551234567" value="' + escapeHtml(e.emergencyContact || "") + '">' +
          '<label>رقم التأمين</label>' +
          '<input type="text" id="emInsurance" placeholder="رقم وثيقة التأمين" value="' + escapeHtml(e.insurance || "") + '">' +
          '<label>ملاحظات</label>' +
          '<textarea id="emNotes" rows="3" placeholder="أي معلومات إضافية مهمة">' + escapeHtml(e.notes || "") + '</textarea>' +
          '<div class="filter-row">' +
            '<button class="btn btn-primary" onclick="saveEmergencyInfo()">💾 حفظ البطاقة</button>' +
            '<button class="btn btn-outline" onclick="shareEmergencyCard()">📤 مشاركة واتساب</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  } catch (err) {
    console.error("خطأ في رسم بطاقة الطوارئ:", err);
    el.innerHTML = '<div class="report-card">تعذر عرض بطاقة الطوارئ</div>';
  }
}

function saveEmergencyInfo() {
  try {
    ensureEmergencyData();
    var fAllergies = document.getElementById("emAllergies");
    var fChronic = document.getElementById("emChronic");
    var fBlood = document.getElementById("emBlood");
    var fContact = document.getElementById("emContact");
    var fInsurance = document.getElementById("emInsurance");
    var fNotes = document.getElementById("emNotes");
    if (!fAllergies || !fChronic || !fBlood || !fContact || !fInsurance || !fNotes) return;
    appData.emergency.allergies = fAllergies.value;
    appData.emergency.chronic = fChronic.value;
    appData.emergency.bloodType = fBlood.value;
    appData.emergency.emergencyContact = fContact.value;
    appData.emergency.insurance = fInsurance.value;
    appData.emergency.notes = fNotes.value;
    saveData();
    showToast("✓ تم حفظ بطاقة الطوارئ", "success");
  } catch (err) {
    console.error("خطأ في حفظ بطاقة الطوارئ:", err);
    showToast("تعذر حفظ بطاقة الطوارئ", "error");
  }
}

function shareEmergencyCard() {
  try {
    ensureEmergencyData();
    var e = appData.emergency;
    var lines = [];
    lines.push("🆘 بطاقة الطوارئ الطبية");
    lines.push("━━━━━━━━━━━━━━");
    lines.push("الحساسية: " + (e.allergies || "لا توجد"));
    lines.push("الأمراض المزمنة: " + (e.chronic || "لا توجد"));
    lines.push("فصيلة الدم: " + (e.bloodType || "غير محددة"));
    lines.push("جهة اتصال الطوارئ: " + (e.emergencyContact || "غير محددة"));
    lines.push("رقم التأمين: " + (e.insurance || "غير محدد"));
    if (e.notes) lines.push("ملاحظات: " + e.notes);
    lines.push("━━━━━━━━━━━━━━");
    lines.push("الأدوية النشطة:");
    var activeMeds = [];
    if (appData.medications && appData.medications.length) {
      for (var i = 0; i < appData.medications.length; i++) {
        var m = appData.medications[i];
        if (m.active !== false) {
          activeMeds.push("• " + (m.name || "دواء") + (m.dosage ? " (" + m.dosage + ")" : ""));
        }
      }
    }
    if (activeMeds.length) {
      lines = lines.concat(activeMeds);
    } else {
      lines.push("لا توجد أدوية نشطة");
    }
    var text = lines.join("\n");
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  } catch (err) {
    console.error("خطأ في مشاركة بطاقة الطوارئ:", err);
    showToast("تعذر فتح المشاركة", "error");
  }
}

/* ---------- 2) حاسبة جرعات الأطفال بالوزن ---------- */
function calculateChildDose() {
  try {
    var fWeight = document.getElementById("childWeight");
    var fDose = document.getElementById("childDoseMgKg");
    var fConc = document.getElementById("childConcentration");
    var fTimes = document.getElementById("childTimes");
    var out = document.getElementById("childDoseResult");
    if (!fWeight || !fDose || !fConc || !fTimes || !out) return;

    var weight = parseFloat(fWeight.value);
    var doseMgKg = parseFloat(fDose.value);
    var conc = parseFloat(fConc.value);
    var times = parseInt(fTimes.value, 10);

    if (isNaN(weight) || weight <= 0) {
      showToast("أدخل وزن الطفل بالكيلوغرام (رقم موجب)", "error");
      return;
    }
    if (isNaN(doseMgKg) || doseMgKg <= 0) {
      showToast("أدخل الجرعة بالملغ/كغ (رقم موجب)", "error");
      return;
    }
    if (isNaN(conc) || conc <= 0) {
      showToast("أدخل تركيز الدواء بالملغ/مل (رقم موجب)", "error");
      return;
    }
    if (isNaN(times) || times <= 0) {
      showToast("أدخل عدد الجرعات اليومية (رقم موجب)", "error");
      return;
    }

    var singleDose = weight * doseMgKg;
    var volumeMl = singleDose / conc;
    var dailyDose = singleDose * times;

    out.innerHTML =
      '<div class="report-card">' +
        '<div class="section-title">👶 نتيجة الحساب</div>' +
        '<div class="vitals-card">' +
          '<p><strong>الجرعة الواحدة:</strong> ' + singleDose.toFixed(1) + ' ملغ</p>' +
          '<p><strong>الحجم بالمل:</strong> ' + volumeMl.toFixed(1) + ' مل لكل جرعة</p>' +
          '<p><strong>الجرعة اليومية:</strong> ' + dailyDose.toFixed(1) + ' ملغ (في ' + times + ' جرعات)</p>' +
          '<p class="badge" style="margin-top:8px;display:inline-block">⚠️ هذه حاسبة إرشادية — الجرعة النهائية من الطبيب</p>' +
        '</div>' +
      '</div>';
  } catch (err) {
    console.error("خطأ في حساب جرعة الطفل:", err);
    showToast("تعذر إجراء الحساب", "error");
  }
}

/* ---------- 3) تنبيهات انتهاء الصلاحية ---------- */
function getExpiringMeds() {
  var result = [];
  try {
    if (!appData.medications || !appData.medications.length) return result;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayMs = today.getTime();
    var dayMs = 24 * 60 * 60 * 1000;
    for (var i = 0; i < appData.medications.length; i++) {
      var m = appData.medications[i];
      if (!m || !m.expiry) continue;
      var parts = String(m.expiry).split("-");
      if (parts.length !== 3) continue;
      var expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (isNaN(expDate.getTime())) continue;
      expDate.setHours(0, 0, 0, 0);
      var diffDays = Math.round((expDate.getTime() - todayMs) / dayMs);
      if (diffDays >= 0 && diffDays <= 30) {
        result.push({ med: m, daysLeft: diffDays });
      }
    }
    result.sort(function (a, b) { return a.daysLeft - b.daysLeft; });
  } catch (err) {
    console.error("خطأ في جلب الأدوية المنتهية قريباً:", err);
  }
  return result;
}

function renderExpiryAlerts() {
  var el = document.getElementById("expiryAlerts");
  if (!el) return;
  try {
    var expiring = getExpiringMeds();
    if (!expiring.length) {
      el.innerHTML = '<div class="report-card"><div class="section-title">⏰ تنبيهات انتهاء الصلاحية</div><p>لا توجد أدوية قريبة من الانتهاء ✅</p></div>';
      return;
    }
    var html = '<div class="report-card"><div class="section-title">⏰ تنبيهات انتهاء الصلاحية</div>';
    for (var i = 0; i < expiring.length; i++) {
      var item = expiring[i];
      var m = item.med;
      var daysText = item.daysLeft === 0 ? "تنتهي اليوم!" : "متبقي " + item.daysLeft + " يوم";
      html +=
        '<div class="vitals-card">' +
          '<p><strong>' + escapeHtml(m.name || "دواء") + '</strong></p>' +
          '<p>تاريخ الانتهاء: ' + formatDateArabic(m.expiry) + '</p>' +
          '<p class="badge" style="display:inline-block">' + daysText + '</p>' +
        '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  } catch (err) {
    console.error("خطأ في رسم تنبيهات انتهاء الصلاحية:", err);
    el.innerHTML = '<div class="report-card">تعذر عرض تنبيهات انتهاء الصلاحية</div>';
  }
}

/* ---------- 4) تنبيهات إعادة التعبئة ---------- */
function renderRefillAlerts() {
  var el = document.getElementById("refillAlerts");
  if (!el) return;
  try {
    var low = [];
    if (appData.medications && appData.medications.length) {
      for (var i = 0; i < appData.medications.length; i++) {
        var m = appData.medications[i];
        if (m && m.quantity !== null && m.refill !== null && m.quantity <= m.refill) {
          low.push(m);
        }
      }
    }
    if (!low.length) {
      el.innerHTML = '<div class="report-card"><div class="section-title">🔄 تنبيهات إعادة التعبئة</div><p>لا توجد أدوية تحتاج إعادة تعبئة ✅</p></div>';
      return;
    }
    var html = '<div class="report-card"><div class="section-title">🔄 تنبيهات إعادة التعبئة</div>';
    for (var j = 0; j < low.length; j++) {
      var med = low[j];
      html +=
        '<div class="vitals-card">' +
          '<p><strong>' + escapeHtml(med.name || "دواء") + '</strong></p>' +
          '<p>الكمية المتبقية: ' + escapeHtml(String(med.quantity)) + '</p>' +
          '<p>حد إعادة التعبئة: ' + escapeHtml(String(med.refill)) + '</p>' +
          '<button class="btn btn-primary" onclick="markRefilled(\'' + escapeHtml(String(med.id)) + '\')">✅ تم إعادة التعبئة</button>' +
        '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  } catch (err) {
    console.error("خطأ في رسم تنبيهات إعادة التعبئة:", err);
    el.innerHTML = '<div class="report-card">تعذر عرض تنبيهات إعادة التعبئة</div>';
  }
}

function markRefilled(medId) {
  try {
    if (!medId || !appData.medications) return;
    for (var i = 0; i < appData.medications.length; i++) {
      var m = appData.medications[i];
      if (m && String(m.id) === String(medId)) {
        var newQty = (m.refill || 0) * 2;
        m.quantity = newQty;
        saveData();
        showToast("✓ تم تحديث الكمية إلى " + newQty, "success");
        renderRefillAlerts();
        return;
      }
    }
    showToast("الدواء غير موجود", "error");
  } catch (err) {
    console.error("خطأ في تحديث إعادة التعبئة:", err);
    showToast("تعذر تحديث الكمية", "error");
  }
}

/* ---------- علم الجاهزية ---------- */
window.FEATURES_MEDICAL_READY = true;