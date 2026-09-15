/* ============================================================
   تذكير الدواء — تطبيق إدارة الأدوية العربي
   الإصدار 2.0 — يعمل بالكامل على جهاز المستخدم (Offline First)
   ============================================================ */

"use strict";

/* ---------- الثوابت والمتغيرات العامة ---------- */
const STORAGE_KEY = "medReminder_v1";
const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

let appData = {
  medications: [],
  family: [],
  settings: { notifications: false },
  vitals: [],
  symptoms: [],
  appointments: [],
  contacts: { doctor: "", pharmacy: "", emergency: "" },
  vaccinations: [],
  pin: "",
  tts: false,
  alertHistory: [],
  emergency: { allergies: "", chronic: "", bloodType: "", emergencyContact: "", insurance: "", notes: "" },
  bpReadings: [],
  symptomMeds: []
};

let _medPhotoData = "";

let currentTab = "home";
let confirmAction = null;

/* ---------- التهيئة ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  buildDaysGrid();
  populateFamilySelect();
  renderAll();
  updateDateDisplay();
  requestNotificationPermission();
  registerSW();
  loadWebdavSettings();
  renderRamadanBanner();
  renderTravelBanner();
  webdavAutoSync();
  if (typeof shouldShowTour === "function" && shouldShowTour()) {
    setTimeout(function () { renderWelcomeModal(); }, 600);
  }
});

/* ---------- إدارة البيانات (localStorage) ---------- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
appData = {
        medications: parsed.medications || [],
        family: parsed.family || [],
        settings: parsed.settings || { notifications: false },
        vitals: parsed.vitals || [],
        symptoms: parsed.symptoms || [],
        appointments: parsed.appointments || [],
        contacts: parsed.contacts || { doctor: "", pharmacy: "", emergency: "" },
        vaccinations: parsed.vaccinations || [],
        pin: parsed.pin || "",
        tts: parsed.tts || false,
        alertHistory: parsed.alertHistory || [],
        emergency: parsed.emergency || { allergies: "", chronic: "", bloodType: "", emergencyContact: "", insurance: "", notes: "" },
        bpReadings: parsed.bpReadings || [],
        symptomMeds: parsed.symptomMeds || []
      };
    }
  } catch (e) {
    console.error("خطأ في تحميل البيانات:", e);
  }
  // فرد افتراضي إذا لم يوجد أحد
  if (appData.family.length === 0) {
    appData.family.push({
      id: "member_self",
      name: "أنا",
      bloodType: "",
      allergies: "",
      chronic: "",
      color: "#0d9488"
    });
    saveData();
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    showToast("تعذر حفظ البيانات — مساحة التخزين ممتلئة", "error");
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- الأدوات المساعدة ---------- */
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function formatTimeArabic(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "مساءً" : "صباحاً";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function getMember(id) {
  return appData.family.find(m => m.id === id) || appData.family[0] || { name: "أنا", color: "#0d9488" };
}

/* ---------- التاريخ والتحية ---------- */
function updateDateDisplay() {
  const d = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("dateDisplay").textContent = d.toLocaleDateString("ar-EG", options);
}

function updateGreeting() {
  const h = new Date().getHours();
  let greet = "مرحباً 👋";
  if (h < 12) greet = "صباح الخير ☀️";
  else if (h < 17) greet = "مساء الخير 🌤️";
  else greet = "مساء الخير 🌙";
  document.getElementById("greetingText").textContent = greet;

  const missed = getMissedCountToday();
  if (missed > 0) {
    document.getElementById("greetingSub").textContent = `لديك ${missed} جرعة فائتة اليوم — لا تنسَ أدويتك 💪`;
  } else {
    document.getElementById("greetingSub").textContent = "كيف حال التزامك اليوم؟";
  }
}

/* ---------- حساب الجرعات اليوم ---------- */
function getTodayDoses() {
  const today = new Date().getDay();
  const doses = [];
  appData.medications.forEach(med => {
    if (!med.active) return;
    if (!med.days.includes(today)) return;
    med.times.forEach(time => {
      doses.push({
        medId: med.id,
        medName: med.name,
        dosage: med.dosage,
        form: med.form,
        time: time,
        member: getMember(med.memberId),
        taken: isDoseTaken(med.id, time, todayStr())
      });
    });
  });
  doses.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  return doses;
}

function isDoseTaken(medId, time, dateStr) {
  const key = `${dateStr}_${time}`;
  const med = appData.medications.find(m => m.id === medId);
  return !!(med && med.log && med.log[key]);
}

function markDose(medId, time, dateStr, taken) {
  const med = appData.medications.find(m => m.id === medId);
  if (!med) return;
  if (!med.log) med.log = {};
  const key = `${dateStr}_${time}`;
  if (taken) {
    med.log[key] = true;
    // تتبع الكورس: عدّ يوم واحد لكل يوم تم فيه أخذ جرعة واحدة على الأقل
    if (med.courseTotal) {
      if (!med.courseTaken) med.courseTaken = 0;
      const dayKey = `course_${dateStr}`;
      if (!med.log[dayKey]) {
        med.log[dayKey] = true;
        med.courseTaken = Math.min(med.courseTaken + 1, med.courseTotal);
      }
    }
  } else {
    delete med.log[key];
  }
  saveData();
}

function getTakenCountToday() {
  return getTodayDoses().filter(d => d.taken).length;
}

function getMissedCountToday() {
  const now = timeToMinutes(nowTime());
  return getTodayDoses().filter(d => !d.taken && timeToMinutes(d.time) < now).length;
}

/* ---------- العرض الرئيسي ---------- */
function renderAll() {
  renderToday();
  renderAllMeds();
  renderReports();
  renderFamily();
  updateSummary();
  updateGreeting();
  checkDoseAlert();
  checkInteractions();
}

function renderToday() {
  const doses = getTodayDoses();
  const container = document.getElementById("todayList");
  document.getElementById("todayCount").textContent = doses.length;

  if (doses.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🎉</div>
        <h3>لا توجد جرعات اليوم</h3>
        <p>أضف دواءً جديداً أو استمتع بيومك</p>
      </div>`;
    return;
  }

  // تجميع حسب الدواء
  const byMed = {};
  doses.forEach(d => {
    if (!byMed[d.medId]) byMed[d.medId] = { ...d, times: [] };
    byMed[d.medId].times.push(d);
  });

  container.innerHTML = Object.values(byMed).map(med => {
    const now = timeToMinutes(nowTime());
    const chips = med.times.map(d => {
      const tMin = timeToMinutes(d.time);
      let cls = "upcoming";
      if (d.taken) cls = "taken";
      else if (tMin < now) cls = "missed";
      return `
        <button class="time-chip ${cls}" onclick="toggleDose('${d.medId}','${d.time}')" title="اضغط للتسجيل">
          <span class="status-dot"></span>
          ${formatTimeArabic(d.time)}
          ${d.taken ? "✓" : ""}
        </button>`;
    }).join("");

    return `
      <div class="med-card ${med.times.some(t => !t.taken && timeToMinutes(t.time) < now) ? "danger" : ""}">
        <div class="med-header">
          <div>
            <div class="med-name">
              ${escapeHtml(med.medName)}
              <span class="med-form">${escapeHtml(med.form)}</span>
            </div>
            <div class="med-dosage">${escapeHtml(med.dosage || "بدون جرعة")} · ${escapeHtml(med.member.name)}</div>
          </div>
          <div class="med-actions">
            <button class="icon-btn" onclick="openMedModal('${med.medId}')" title="تعديل">✏️</button>
          </div>
        </div>
        <div class="med-times">${chips}</div>
      </div>`;
  }).join("");
}

function renderAllMeds() {
  let meds = [...appData.medications];
  const container = document.getElementById("allList");
  const filterEl = document.getElementById("medFilter");
  const catEl = document.getElementById("medCategoryFilter");
  const sortEl = document.getElementById("medSort");
  const q = filterEl ? filterEl.value.trim() : "";
  const cat = catEl ? catEl.value : "";
  const sort = sortEl ? sortEl.value : "name";

  // فلترة حسب البحث
  if (q) {
    const nq = normalizeName(q);
    meds = meds.filter(m =>
      normalizeName(m.name).includes(nq) ||
      normalizeName(m.dosage || "").includes(nq) ||
      normalizeName(getMember(m.memberId).name).includes(nq));
  }
  // فلترة حسب التصنيف
  if (cat) meds = meds.filter(m => m.category === cat);

  // ترتيب
  if (sort === "name") {
    meds.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  } else if (sort === "quantity") {
    meds.sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
  } else if (sort === "category") {
    meds.sort((a, b) => (a.category || "").localeCompare(b.category || "", "ar"));
  } else if (sort === "nextDose") {
    const now = timeToMinutes(nowTime());
    const nextTime = m => {
      const times = m.times.map(t => timeToMinutes(t)).filter(t => t >= now);
      return times.length ? Math.min(...times) : 24 * 60 + Math.min(...m.times.map(t => timeToMinutes(t)));
    };
    meds.sort((a, b) => nextTime(a) - nextTime(b));
  }

  document.getElementById("allCount").textContent = meds.length;

  if (meds.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">💊</div>
        <h3>لا توجد أدوية</h3>
        <p>${q ? "لا توجد نتائج مطابقة للبحث" : "اضغط زر + لإضافة أول دواء لك"}</p>
      </div>`;
    return;
  }

  container.innerHTML = meds.map(medCardHTML).join("");
}

function updateSummary() {
  const total = getTodayDoses().length;
  const taken = getTakenCountToday();
  const missed = getMissedCountToday();
  document.getElementById("totalToday").textContent = total;
  document.getElementById("takenToday").textContent = taken;
  document.getElementById("missedToday").textContent = missed;
}

/* ---------- تسجيل الجرعة ---------- */
function toggleDose(medId, time) {
  const dateStr = todayStr();
  const taken = isDoseTaken(medId, time, dateStr);
  const med = appData.medications.find(m => m.id === medId);
  if (taken) {
    markDose(medId, time, dateStr, false);
    showToast(`تم التراجع عن جرعة ${med ? med.name : ""} ${formatTimeArabic(time)}`, "error");
  } else {
    // حماية الجرعة الزائدة: تحقق من الحد اليومي الأقصى
    const maxCheck = checkMaxDose(med);
    if (maxCheck) {
      showToast(`⚠️ تحذير: هذه الجرعة ستتجاوز الحد اليومي (${maxCheck.max} ${maxCheck.unit})`, "error");
      return;
    }
    markDose(medId, time, dateStr, true);
    showToastWithAction(`✓ تم تسجيل جرعة ${med ? med.name : ""} ${formatTimeArabic(time)}`, "↩️ تراجع", `undoDose('${medId}','${time}')`);
    // تنبيه صوتي قصير
    try { new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA").play(); } catch (e) {}
  }
  renderAll();
}

function undoDose(medId, time) {
  markDose(medId, time, todayStr(), false);
  showToast("↩️ تم التراجع عن الجرعة", "error");
  renderAll();
}

/* ---------- تنبيه الجرعة الحالية ---------- */
function checkDoseAlert() {
  const alertEl = document.getElementById("doseAlert");
  const now = timeToMinutes(nowTime());
  const doses = getTodayDoses();
  // جرعة حالية: وقتها قبل الآن بـ 30 دقيقة كحد أقصى ولم تؤخذ
  const current = doses.find(d => {
    if (d.taken) return false;
    const diff = now - timeToMinutes(d.time);
    return diff >= 0 && diff <= 30;
  });
  if (current) {
    document.getElementById("alertMedName").textContent = `⏰ حان موعد ${current.medName}`;
    document.getElementById("alertMedDetail").textContent = `${formatTimeArabic(current.time)} — ${current.dosage || ""} ${current.member.name}`;
    alertEl.dataset.medId = current.medId;
    alertEl.dataset.time = current.time;
    alertEl.classList.remove("hidden");
    speakDoseAlert();
  } else {
    alertEl.classList.add("hidden");
  }
}

function takeNowFromAlert() {
  const alertEl = document.getElementById("doseAlert");
  const name = document.getElementById("alertMedName").textContent.replace("⏰ حان موعد ", "");
  const med = appData.medications.find(m => m.name === name);
  if (med) {
    const now = nowTime();
    // ابحث عن أقرب جرعة حالية
    const doses = getTodayDoses().filter(d => d.medId === med.id && !d.taken);
    const nowMin = timeToMinutes(now);
    const closest = doses.reduce((best, d) => {
      const diff = Math.abs(timeToMinutes(d.time) - nowMin);
      return diff < best.diff ? { d, diff } : best;
    }, { d: doses[0], diff: Infinity });
    if (closest.d) {
      markDose(med.id, closest.d.time, todayStr(), true);
      showToast(`✓ تم تسجيل جرعة ${med.name}`, "success");
    }
  }
  renderAll();
}

/* ---------- إدارة الأدوية ---------- */
function openMedModal(id) {
  const modal = document.getElementById("medModal");
  document.getElementById("medForm").reset();
  document.getElementById("medId").value = "";
  document.getElementById("timeInputs").innerHTML = `
    <div class="time-input-row">
      <input type="time" class="time-input" value="08:00">
      <button type="button" class="remove-time" onclick="removeTimeRow(this)">🗑️</button>
    </div>
    <div class="time-input-row">
      <input type="time" class="time-input" value="20:00">
      <button type="button" class="remove-time" onclick="removeTimeRow(this)">🗑️</button>
    </div>`;
  setAllDays(true);
  populateFamilySelect();

  if (id) {
    const med = appData.medications.find(m => m.id === id);
    if (!med) return;
    document.getElementById("medModalTitle").textContent = "✏️ تعديل الدواء";
    document.getElementById("medId").value = med.id;
    document.getElementById("medName").value = med.name;
    document.getElementById("medDosage").value = med.dosage || "";
    document.getElementById("medForm2").value = med.form || "حبوب";
    document.getElementById("medQuantity").value = med.quantity ?? "";
    document.getElementById("medRefill").value = med.refill ?? "";
    document.getElementById("medNotes").value = med.notes || "";
    document.getElementById("medExpiry").value = med.expiry || "";
    document.getElementById("medMissedInstr").value = med.missedInstr || "تناوله فوراً عند التذكر";
    document.getElementById("medCategory").value = med.category || "";
    document.getElementById("medCourseTotal").value = med.courseTotal || "";
    document.getElementById("medMember").value = med.memberId || "";
    // صورة الوصفة
    const preview = document.getElementById("medPhotoPreview");
    const removeBtn = document.getElementById("medPhotoRemove");
    if (med.photo) {
      preview.src = med.photo;
      preview.classList.remove("hidden");
      removeBtn.classList.remove("hidden");
    } else {
      preview.classList.add("hidden");
      removeBtn.classList.add("hidden");
    }
    // المواعيد
    document.getElementById("timeInputs").innerHTML = med.times.map(t => `
      <div class="time-input-row">
        <input type="time" class="time-input" value="${t}">
        <button type="button" class="remove-time" onclick="removeTimeRow(this)">🗑️</button>
      </div>`).join("");
    // الأيام
    document.querySelectorAll(".day-btn").forEach(btn => {
      const day = parseInt(btn.dataset.day);
      btn.classList.toggle("active", med.days.includes(day));
    });
  } else {
    document.getElementById("medModalTitle").textContent = "➕ إضافة دواء جديد";
  }
  modal.classList.add("open");
}

function saveMed(e) {
  e.preventDefault();
  const id = document.getElementById("medId").value;
  const name = document.getElementById("medName").value.trim();
  if (!name) { showToast("أدخل اسم الدواء", "error"); return; }

  const times = Array.from(document.querySelectorAll(".time-input"))
    .map(i => i.value)
    .filter(v => v);
  if (times.length === 0) { showToast("أضف موعداً واحداً على الأقل", "error"); return; }

  const days = Array.from(document.querySelectorAll(".day-btn.active"))
    .map(b => parseInt(b.dataset.day));
  if (days.length === 0) { showToast("اختر يوم واحد على الأقل", "error"); return; }

  const data = {
    name,
    dosage: document.getElementById("medDosage").value.trim(),
    form: document.getElementById("medForm2").value,
    times,
    days,
    quantity: document.getElementById("medQuantity").value === "" ? null : parseInt(document.getElementById("medQuantity").value),
    refill: document.getElementById("medRefill").value === "" ? null : parseInt(document.getElementById("medRefill").value),
    notes: document.getElementById("medNotes").value.trim(),
    expiry: document.getElementById("medExpiry").value || "",
    missedInstr: document.getElementById("medMissedInstr").value,
    photo: _medPhotoData || "",
    category: document.getElementById("medCategory").value,
    courseTotal: document.getElementById("medCourseTotal").value === "" ? null : parseInt(document.getElementById("medCourseTotal").value),
    memberId: document.getElementById("medMember").value,
    active: true
  };

  if (id) {
    const med = appData.medications.find(m => m.id === id);
    if (med) Object.assign(med, data);
    showToast("✓ تم تحديث الدواء", "success");
  } else {
    data.id = uid();
    data.log = {};
    appData.medications.push(data);
    showToast("✓ تمت إضافة الدواء", "success");
  }
  _medPhotoData = "";
  saveData();
  closeModal("medModal");
  renderAll();
  // فحص سلامة فوري بعد الحفظ
  checkSafety();
  // فحص التفاعلات الدوائية
  checkDrugInteractions(name);
}

function askDeleteMed(id) {
  const med = appData.medications.find(m => m.id === id);
  const isChronic = med && (med.notes || "").toLowerCase().includes("مزمن");
  document.getElementById("confirmText").textContent = `هل تريد حذف "${med ? med.name : "الدواء"}" نهائياً؟${isChronic ? "\n⚠️ تنبيه: هذا دواء مزمن — لا توقف تناوله دون استشارة الطبيب." : ""}`;
  confirmAction = () => {
    appData.medications = appData.medications.filter(m => m.id !== id);
    saveData();
    renderAll();
    checkSafety();
    showToast("تم حذف الدواء", "success");
  };
  document.getElementById("confirmModal").classList.add("open");
}

/* ---------- إدارة العائلة ---------- */
function renderFamily() {
  const container = document.getElementById("familyList");
  document.getElementById("familyCount").textContent = appData.family.length;
  container.innerHTML = appData.family.map(m => {
    const medCount = appData.medications.filter(x => x.memberId === m.id).length;
    const initial = m.name.charAt(0);
    return `
      <div class="family-card">
        <div class="avatar" style="background:${m.color};">${escapeHtml(initial)}</div>
        <div class="family-info">
          <div class="name">${escapeHtml(m.name)}</div>
          <div class="details">
            ${medCount} دواء
            ${m.bloodType ? ` · فصيلة ${escapeHtml(m.bloodType)}` : ""}
            ${m.age ? ` · ${m.age} سنة` : ""}
            ${m.pregnant === "yes" ? " · 🤰 حامل" : ""}
            ${m.breastfeeding === "yes" ? " · 🤱 مرضعة" : ""}
            ${m.allergies ? ` · حساسية: ${escapeHtml(m.allergies)}` : ""}
            ${m.chronic ? ` · ${escapeHtml(m.chronic)}` : ""}
          </div>
        </div>
        <div class="med-actions">
          <button class="icon-btn delete" onclick="askDeleteMember('${m.id}')" title="حذف">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

function openFamilyModal() {
  document.getElementById("familyModal").classList.add("open");
  document.getElementById("familyName").value = "";
  document.getElementById("familyBlood").value = "";
  document.getElementById("familyAllergies").value = "";
  document.getElementById("familyChronic").value = "";
  document.getElementById("familyColor").value = "#0d9488";
  document.getElementById("familyAge").value = "";
  document.getElementById("familyGender").value = "";
  document.getElementById("familyPregnant").value = "no";
  document.getElementById("familyBreastfeeding").value = "no";
}

function saveFamily(e) {
  e.preventDefault();
  const name = document.getElementById("familyName").value.trim();
  if (!name) { showToast("أدخل الاسم", "error"); return; }
  appData.family.push({
    id: uid(),
    name,
    bloodType: document.getElementById("familyBlood").value,
    allergies: document.getElementById("familyAllergies").value.trim(),
    chronic: document.getElementById("familyChronic").value.trim(),
    color: document.getElementById("familyColor").value,
    age: document.getElementById("familyAge").value === "" ? null : parseInt(document.getElementById("familyAge").value),
    gender: document.getElementById("familyGender").value,
    pregnant: document.getElementById("familyPregnant").value,
    breastfeeding: document.getElementById("familyBreastfeeding").value
  });
  saveData();
  closeModal("familyModal");
  populateFamilySelect();
  renderFamily();
  checkSafety();
  showToast("✓ تمت إضافة الفرد", "success");
}

function askDeleteMember(id) {
  if (id === "member_self") { showToast("لا يمكن حذف الملف الأساسي", "error"); return; }
  const member = appData.family.find(m => m.id === id);
  document.getElementById("confirmText").textContent = `حذف "${member ? member.name : "الفرد"}"؟ ستبقى أدويته بدون مالك.`;
  confirmAction = () => {
    appData.family = appData.family.filter(m => m.id !== id);
    appData.medications.forEach(m => { if (m.memberId === id) m.memberId = "member_self"; });
    saveData();
    populateFamilySelect();
    renderAll();
    showToast("تم الحذف", "success");
  };
  document.getElementById("confirmModal").classList.add("open");
}

function populateFamilySelect() {
  const sel = document.getElementById("medMember");
  sel.innerHTML = appData.family.map(m =>
    `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("");
}

/* ---------- التقارير ---------- */
function renderReports() {
  const container = document.getElementById("reportContent");
  const meds = appData.medications;
  if (meds.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">📊</div>
        <h3>لا توجد بيانات بعد</h3>
        <p>أضف أدوية وابدأ بتسجيل الجرعات لعرض التقارير</p>
      </div>`;
    return;
  }

  // تقرير الأسبوع الحالي
  const weekData = getWeekData();
  const total = weekData.total;
  const taken = weekData.taken;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  container.innerHTML = `
    <div class="report-card">
      <div class="report-header">
        <h3>📅 التزام هذا الأسبوع</h3>
        <span class="badge" style="font-size:1rem;">${pct}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-muted);text-align:center;">
        ${taken} من ${total} جرعة تم أخذها هذا الأسبوع
      </p>
      <div class="week-grid">
        ${weekData.days.map(d => `
          <div class="week-day">
            <div>${DAY_SHORT[d.day]}</div>
            <div class="day-circle ${d.total === 0 ? "" : d.taken === d.total ? "full" : d.taken > 0 ? "partial" : "empty"}">
              ${d.total === 0 ? "–" : d.taken}
            </div>
          </div>`).join("")}
      </div>
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>💊 تقرير كل دواء</h3>
      </div>
      ${meds.map(med => {
        const mWeek = getMedWeekData(med.id);
        const mPct = mWeek.total > 0 ? Math.round((mWeek.taken / mWeek.total) * 100) : 0;
        return `
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;font-weight:700;margin-bottom:4px;">
              <span>${escapeHtml(med.name)}</span>
              <span style="color:${mPct >= 80 ? "var(--success)" : mPct >= 50 ? "var(--accent)" : "var(--danger)"};">${mPct}%</span>
            </div>
            <div class="progress-bar" style="height:8px;">
              <div class="progress-fill" style="width:${mPct}%;${mPct < 50 ? "background:var(--danger);" : ""}"></div>
            </div>
          </div>`;
      }).join("")}
    </div>

    <div class="report-card">
      <div class="report-header">
        <h3>📈 نصائح لتحسين الالتزام</h3>
      </div>
      <ul style="font-size:0.9rem;color:var(--text-muted);padding-right:18px;line-height:2;">
        <li>اضبط التذكيرات على نفس وقت عاداتك اليومية (الأكل، النوم)</li>
        <li>استخدم علبة حبوب أسبوعية مرتبة حسب الأيام</li>
        <li>أبلغ طبيبك إذا تكرر نسيان الجرعات</li>
        <li>لا توقف الدواء دون استشارة الطبيب</li>
      </ul>
    </div>`;
}

function getWeekData() {
  const days = [];
  let total = 0, taken = 0;
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayNum = d.getDay();
    let dTotal = 0, dTaken = 0;
    appData.medications.forEach(med => {
      if (!med.active || !med.days.includes(dayNum)) return;
      med.times.forEach(t => {
        dTotal++;
        if (med.log && med.log[`${dateStr}_${t}`]) dTaken++;
      });
    });
    total += dTotal;
    taken += dTaken;
    days.push({ day: dayNum, total: dTotal, taken: dTaken });
  }
  return { total, taken, days };
}

function getMedWeekData(medId) {
  const med = appData.medications.find(m => m.id === medId);
  if (!med) return { total: 0, taken: 0 };
  let total = 0, taken = 0;
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (!med.days.includes(d.getDay())) continue;
    med.times.forEach(t => {
      total++;
      if (med.log && med.log[`${dateStr}_${t}`]) taken++;
    });
  }
  return { total, taken };
}

/* ---------- التنقل بين الأقسام ---------- */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab));

  document.getElementById("todaySection").classList.toggle("hidden", tab !== "home");
  document.getElementById("allSection").classList.toggle("hidden", tab !== "home");
  document.getElementById("vitalsSection").classList.toggle("hidden", tab !== "vitals");
  document.getElementById("symptomsSection").classList.toggle("hidden", tab !== "symptoms");
  document.getElementById("reportSection").classList.toggle("hidden", tab !== "report");
  document.getElementById("familySection").classList.toggle("hidden", tab !== "family");
  document.getElementById("encyclopediaSection").classList.toggle("hidden", tab !== "encyclopedia");
document.getElementById("settingsSection").classList.toggle("hidden", tab !== "settings");
  document.getElementById("vaccinesSection").classList.toggle("hidden", tab !== "vaccines");
  document.getElementById("safetySection").classList.toggle("hidden", tab !== "safety");

  // تحديث بيانات الأقسام الجديدة عند فتحها
  if (tab === "vitals") { renderVitals(); renderVitalsChart(); renderBpTracker(); }
  if (tab === "symptoms") { renderSymptoms(); renderSymptomMedLink(); }
  if (tab === "report") { renderHeatmap(); renderAppointments(); renderAlertHistory(); }
if (tab === "encyclopedia") { populateEncyCategories(); renderEncyclopedia(); renderHerbs(); renderFoodInteractions(); renderTreatmentPlans(); }
  if (tab === "vaccines") renderVaccines();
  if (tab === "report") { renderMonthlyAnalytics(); renderInteractionGraph(); }
  if (tab === "safety") { renderEmergencyCard(); renderExpiryAlerts(); renderRefillAlerts(); }
  if (tab === "settings") loadSettingsUI();

  // إخفاء زر الإضافة في غير الرئيسية
  document.querySelector(".fab").style.display = tab === "home" ? "flex" : "none";
}

/* ---------- تحميل واجهة الإعدادات ---------- */
function loadSettingsUI() {
  const ttsSw = document.getElementById("ttsSwitch");
  if (ttsSw) ttsSw.classList.toggle("on", !!appData.tts);
  const pinSw = document.getElementById("pinSwitch");
  if (pinSw) pinSw.classList.toggle("on", !!appData.pin);
  const pinSetup = document.getElementById("pinSetup");
  if (pinSetup) pinSetup.classList.add("hidden");
  const contacts = appData.contacts || {};
  const d = document.getElementById("contactDoctor");
  const p = document.getElementById("contactPharmacy");
  const e = document.getElementById("contactEmergency");
  if (d) d.value = contacts.doctor || "";
  if (p) p.value = contacts.pharmacy || "";
  if (e) e.value = contacts.emergency || "";
}

/* ---------- النوافذ المنبثقة ---------- */
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

/* ---------- أيام الأسبوع ---------- */
function buildDaysGrid() {
  const grid = document.getElementById("daysGrid");
  grid.innerHTML = DAY_NAMES.map((name, i) =>
    `<button type="button" class="day-btn active" data-day="${i}" onclick="toggleDay(this)">${name}</button>`
  ).join("");
}

function toggleDay(btn) {
  btn.classList.toggle("active");
}

function setAllDays(active) {
  document.querySelectorAll(".day-btn").forEach(b =>
    b.classList.toggle("active", active));
}

/* ---------- المواعيد ---------- */
function addTimeRow() {
  const container = document.getElementById("timeInputs");
  if (container.children.length >= 8) { showToast("الحد الأقصى 8 مواعيد يومياً", "error"); return; }
  const row = document.createElement("div");
  row.className = "time-input-row";
  row.innerHTML = `
    <input type="time" class="time-input" value="12:00">
    <button type="button" class="remove-time" onclick="removeTimeRow(this)">🗑️</button>`;
  container.appendChild(row);
}

function removeTimeRow(btn) {
  const container = document.getElementById("timeInputs");
  if (container.children.length <= 1) { showToast("يجب أن يبقى موعد واحد على الأقل", "error"); return; }
  btn.parentElement.remove();
}

/* ---------- الإشعارات ---------- */
function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    appData.settings.notifications = true;
  }
}

function toggleNotifications() {
  const sw = document.getElementById("notifSwitch");
  if (!("Notification" in window)) {
    showToast("المتصفح لا يدعم الإشعارات", "error");
    return;
  }
  if (Notification.permission === "granted") {
    appData.settings.notifications = !appData.settings.notifications;
    sw.classList.toggle("on", appData.settings.notifications);
    saveData();
    showToast(appData.settings.notifications ? "✓ الإشعارات مفعلة" : "تم إيقاف الإشعارات", "success");
  } else if (Notification.permission === "denied") {
    showToast("الإشعارات محظورة — فعّلها من إعدادات المتصفح", "error");
  } else {
    Notification.requestPermission().then(perm => {
      if (perm === "granted") {
        appData.settings.notifications = true;
        sw.classList.add("on");
        saveData();
        showToast("✓ الإشعارات مفعلة", "success");
      }
    });
  }
}

function sendNotification(title, body) {
  if (!appData.settings.notifications) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "icons/icon-192.png" });
  } catch (e) {}
}

/* فحص دوري للتذكير أثناء فتح التطبيق */
setInterval(() => {
  checkDoseAlert();
  // تذكير بالجرعة الحالية
  const now = timeToMinutes(nowTime());
  const doses = getTodayDoses();
  doses.forEach(d => {
    if (d.taken) return;
    const diff = now - timeToMinutes(d.time);
    if (diff >= 0 && diff <= 1) {
      sendNotification(`⏰ حان موعد ${d.medName}`, `${formatTimeArabic(d.time)} — ${d.dosage || ""}`);
    }
  });
}, 60000);

/* ---------- النسخ الاحتياطي ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `تذكير-الدواء-نسخة-احتياطية-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("✓ تم تصدير النسخة الاحتياطية", "success");
}

function importData() {
  document.getElementById("importFile").click();
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.medications || !data.family) throw new Error("صيغة غير صحيحة");
appData = {
      medications: data.medications,
      family: data.family,
      settings: data.settings || { notifications: false },
      vaccinations: data.vaccinations || [],
      emergency: data.emergency || { allergies: "", chronic: "", bloodType: "", emergencyContact: "", insurance: "", notes: "" },
      bpReadings: data.bpReadings || [],
      symptomMeds: data.symptomMeds || []
    };
      saveData();
      populateFamilySelect();
      renderAll();
      showToast("✓ تم استيراد البيانات بنجاح", "success");
    } catch (err) {
      showToast("ملف غير صالح", "error");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function clearAllData() {
  document.getElementById("confirmText").textContent = "سيتم حذف جميع الأدوية والبيانات نهائياً. هل أنت متأكد؟";
  confirmAction = () => {
    appData = { medications: [], family: [], settings: { notifications: false }, vitals: [], symptoms: [], appointments: [], contacts: { doctor: "", pharmacy: "", emergency: "" }, vaccinations: [], pin: "", tts: false, alertHistory: [], emergency: { allergies: "", chronic: "", bloodType: "", emergencyContact: "", insurance: "", notes: "" }, bpReadings: [], symptomMeds: [] };
    saveData();
    loadData();
    populateFamilySelect();
    renderAll();
    showToast("تم حذف كل البيانات", "success");
  };
  document.getElementById("confirmModal").classList.add("open");
}

/* ---------- زر التأكيد ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("confirmBtn").addEventListener("click", () => {
    if (confirmAction) confirmAction();
    confirmAction = null;
    closeModal("confirmModal");
  });
});

/* ---------- التنبيهات (Toast) ---------- */
let toastTimer = null;
function showToast(msg, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function showToastWithAction(msg, actionLabel, actionFn) {
  const toast = document.getElementById("toast");
  toast.className = "toast show";
  toast.innerHTML = `<div>${msg}</div>
    <div class="toast-actions"><button onclick="${actionFn}">${actionLabel}</button></div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 6000);
}

/* ---------- تسجيل Service Worker ---------- */
function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

/* ================================================================
   الميزات الجديدة: تفاعلات الأدوية، البحث، القياسات، الأعراض، ...
   ================================================================ */

/* ---------- قاعدة بيانات تفاعلات الأدوية ---------- */
// [الدواء الأول، الدواء الثاني، الخطورة، النصيحة]
const DRUG_INTERACTIONS = [
  ["الوارفارين", "الأسبرين", "خطيرة", "يزيدان معاً خطر النزيف الداخلي. استشر الطبيب قبل تناولهما معاً."],
  ["الوارفارين", "الإيبوبروفين", "خطيرة", "مضادات الالتهاب تزيد خطر النزيف مع الوارفارين. استشر الطبيب."],
  ["الوارفارين", "ديكلوفيناك", "خطيرة", "مضادات الالتهاب تزيد خطر النزيف مع الوارفارين. استشر الطبيب."],
  ["الوارفارين", "نابروكسين", "خطيرة", "مضادات الالتهاب تزيد خطر النزيف مع الوارفارين. استشر الطبيب."],
  ["الوارفارين", "سيليكوكسيب", "خطيرة", "مضادات الالتهاب تزيد خطر النزيف مع الوارفارين. استشر الطبيب."],
  ["الوارفارين", "كلوبيدوجريل", "خطيرة", "مزيج مضادات التخثر يزيد خطر النزيف بشكل كبير. استشر الطبيب."],
  ["الوارفارين", "أموكسيسيلين", "متوسطة", "بعض المضادات الحيوية تزيد تأثير الوارفارين. راقب علامات النزيف."],
  ["الوارفارين", "أزيثروميسين", "متوسطة", "قد يزيد تأثير الوارفارين. راقب علامات النزيف."],
  ["الوارفارين", "فيتامين ك", "متوسطة", "فيتامين ك يقلل تأثير الوارفارين. حافظ على جرعة ثابتة من فيتامين ك."],
  ["الوارفارين", "باراسيتامول", "خفيفة", "الجرعات العالية من الباراسيتامول قد تزيد تأثير الوارفارين."],
  ["الأسبرين", "الإيبوبروفين", "متوسطة", "الإيبوبروفين يقلل التأثير الوقائي للأسبرين على القلب. استشر الطبيب."],
  ["الأسبرين", "كلوبيدوجريل", "خطيرة", "يزيدان معاً خطر النزيف المعدي. استشر الطبيب."],
  ["الأسبرين", "ميثوتريكسات", "خطيرة", "الأسبرين يزيد سمية الميثوتريكسات. ممنوع تناولهما معاً."],
  ["الأسبرين", "غليكلازيد", "متوسطة", "الأسبرين قد يزيد تأثير خافضات السكر ويسبب هبوط السكر."],
  ["الأسبرين", "غليبينكلاميد", "متوسطة", "الأسبرين قد يزيد تأثير خافضات السكر ويسبب هبوط السكر."],
  ["كلوبيدوجريل", "أوميبرازول", "متوسطة", "أوميبرازول يقلل فعالية كلوبيدوجريل. استشر الطبيب."],
  ["كلوبيدوجريل", "بانتوبرازول", "خفيفة", "قد يقلل تأثير كلوبيدوجريل قليلاً. استشر الطبيب."],
  ["ميتفورمين", "الأنسولين", "خفيفة", "مزيج شائع لعلاج السكري. راقب هبوط السكر."],
  ["الأنسولين", "ميتوبرولول", "متوسطة", "حاصرات بيتا تخفي أعراض هبوط السكر. راقب السكر بانتظام."],
  ["الأنسولين", "أتينولول", "متوسطة", "حاصرات بيتا تخفي أعراض هبوط السكر. راقب السكر بانتظام."],
  ["غليكلازيد", "الأنسولين", "متوسطة", "يزيدان معاً خطر هبوط السكر. راقب السكر بانتظام."],
  ["ليسينوبريل", "مكملات البوتاسيوم", "خطيرة", "قد يسببان فرط البوتاسيوم في الدم. استشر الطبيب."],
  ["إنالابريل", "مكملات البوتاسيوم", "خطيرة", "قد يسببان فرط البوتاسيوم في الدم. استشر الطبيب."],
  ["ليسينوبريل", "سبيرونولاكتون", "خطيرة", "قد يسببان فرط البوتاسيوم في الدم. استشر الطبيب."],
  ["إنالابريل", "سبيرونولاكتون", "خطيرة", "قد يسببان فرط البوتاسيوم في الدم. استشر الطبيب."],
  ["ليسينوبريل", "الإيبوبروفين", "متوسطة", "مضادات الالتهاب تقلل تأثير خافضات الضغط وتضر الكلى."],
  ["إنالابريل", "الإيبوبروفين", "متوسطة", "مضادات الالتهاب تقلل تأثير خافضات الضغط وتضر الكلى."],
  ["لوسارتان", "مكملات البوتاسيوم", "متوسطة", "قد يسببان ارتفاع البوتاسيوم. راقب التحاليل."],
  ["لوسارتان", "الإيبوبروفين", "متوسطة", "مضادات الالتهاب تقلل تأثير خافضات الضغط وتضر الكلى."],
  ["ميتوبرولول", "فيراباميل", "خطيرة", "مزيج خطير يسبب بطءاً شديداً في ضربات القلب. استشر الطبيب."],
  ["ميتوبرولول", "ديلتيازيم", "خطيرة", "مزيج خطير يسبب بطءاً شديداً في ضربات القلب. استشر الطبيب."],
  ["أتينولول", "فيراباميل", "خطيرة", "مزيج خطير يسبب بطءاً شديداً في ضربات القلب. استشر الطبيب."],
  ["فوروسيميد", "الديجوكسين", "خطيرة", "نقص البوتاسيوم الناتج عن المدر يزيد سمية الديجوكسين. راقب البوتاسيوم."],
  ["فوروسيميد", "الإيبوبروفين", "متوسطة", "مضادات الالتهاب تقلل تأثير المدرات وتضر الكلى."],
  ["فوروسيميد", "بريدنيزولون", "متوسطة", "يزيدان معاً خطر نقص البوتاسيوم."],
  ["الديجوكسين", "أميودارون", "خطيرة", "أميودارون يرفع تركيز الديجوكسين في الدم. استشر الطبيب."],
  ["الديجوكسين", "مضادات الحموضة", "متوسطة", "مضادات الحموضة تقلل امتصاص الديجوكسين. افصل بينهما ساعتين."],
  ["أتورفاستاتين", "كلاريثرومايسين", "خطيرة", "يزيدان خطر تلف العضلات (اعتلال عضلي). استشر الطبيب."],
  ["سيمفاستاتين", "كلاريثرومايسين", "خطيرة", "يزيدان خطر تلف العضلات (اعتلال عضلي). استشر الطبيب."],
  ["أتورفاستاتين", "فيراباميل", "متوسطة", "قد يزيدان خطر تلف العضلات. استشر الطبيب."],
  ["سيمفاستاتين", "فيراباميل", "متوسطة", "قد يزيدان خطر تلف العضلات. استشر الطبيب."],
  ["ليفوثيروكسين", "كربونات الكالسيوم", "خطيرة", "الكالسيوم يقلل امتصاص هرمون الغدة. افصل بينهما 4 ساعات."],
  ["ليفوثيروكسين", "مكملات الحديد", "خطيرة", "الحديد يقلل امتصاص هرمون الغدة. افصل بينهما 4 ساعات."],
  ["ليفوثيروكسين", "مضادات الحموضة", "متوسطة", "مضادات الحموضة تقلل امتصاص هرمون الغدة. افصل بينهما 4 ساعات."],
  ["ليفوثيروكسين", "أوميبرازول", "خفيفة", "قد يقلل امتصاص هرمون الغدة. راقب التحاليل."],
  ["سيبروفلوكساسين", "مضادات الحموضة", "متوسطة", "مضادات الحموضة تقلل امتصاص المضاد الحيوي. افصل بينهما ساعتين."],
  ["سيبروفلوكساسين", "مكملات الحديد", "متوسطة", "الحديد يقلل امتصاص المضاد الحيوي. افصل بينهما ساعتين."],
  ["ليفوفلوكساسين", "مضادات الحموضة", "متوسطة", "مضادات الحموضة تقلل امتصاص المضاد الحيوي. افصل بينهما ساعتين."],
  ["ليفوفلوكساسين", "بريدنيزولون", "متوسطة", "يزيدان معاً خطر تمزق الأوتار. استشر الطبيب."],
  ["أموكسيسيلين", "مضادات الحموضة", "خفيفة", "قد يقلل امتصاص المضاد الحيوي. افصل بينهما ساعتين."],
  ["مكملات الحديد", "مضادات الحموضة", "متوسطة", "مضادات الحموضة تقلل امتصاص الحديد. افصل بينهما ساعتين."],
  ["مكملات الحديد", "كربونات الكالسيوم", "متوسطة", "الكالسيوم يقلل امتصاص الحديد. افصل بينهما ساعتين."],
  ["كربونات الكالسيوم", "مدرات الثيازيد", "متوسطة", "قد يسببان ارتفاع الكالسيوم في الدم. راقب التحاليل."],
  ["ترامادول", "فلوكسيتين", "خطيرة", "يزيدان خطر متلازمة السيروتونين (ارتباك، رجفة، تسارع قلب). استشر الطبيب."],
  ["ترامادول", "سيتالوبرام", "خطيرة", "يزيدان خطر متلازمة السيروتونين. استشر الطبيب."],
  ["ترامادول", "دولوكستين", "خطيرة", "يزيدان خطر متلازمة السيروتونين. استشر الطبيب."],
  ["فلوكسيتين", "أوميبرازول", "خفيفة", "قد يرفع تركيز فلوكسيتين في الدم."],
  ["سيلدينافيل", "النترات", "خطيرة", "مزيج خطير يسبب هبوطاً شديداً في الضغط. ممنوع تناولهما معاً."],
  ["سيلدينافيل", "ميتوبرولول", "خفيفة", "قد يسبب هبوط الضغط. راقب الضغط."],
  ["الوبيورينول", "الآزاثيوبرين", "خطيرة", "يزيدان خطر سمية نخاع العظم. استشر الطبيب."],
  ["الوبيورينول", "مدرات الثيازيد", "متوسطة", "قد يزيدان خطر الحساسية للوبيورينول."],
  ["الكاربامازيبين", "كلاريثرومايسين", "خطيرة", "يرفع تركيز الكاربامازيبين في الدم. استشر الطبيب."],
  ["الكاربامازيبين", "فلوكسيتين", "متوسطة", "يرفع تركيز الكاربامازيبين في الدم."],
  ["أميودارون", "الوارفارين", "خطيرة", "أميودارون يضاعف تأثير الوارفارين. راقب التحاليل."],
  ["بريدنيزولون", "الإيبوبروفين", "متوسطة", "يزيدان معاً خطر النزيف المعدي."],
  ["بريدنيزولون", "الأسبرين", "متوسطة", "يزيدان معاً خطر النزيف المعدي."],
  ["مونتيلوكاست", "الأسبرين", "خفيفة", "قد يزيد خطر التشنج القصبي عند الحساسية للأسبرين."],
  ["الليثيوم", "الإيبوبروفين", "خطيرة", "يرفع تركيز الليثيوم في الدم إلى مستويات سامة. استشر الطبيب."],
  ["الليثيوم", "فوروسيميد", "خطيرة", "يرفع تركيز الليثيوم في الدم. استشر الطبيب."],
  ["تامسولوسين", "ميتوبرولول", "متوسطة", "قد يسببان هبوط الضغط عند الوقوف."],
  ["تامسولوسين", "سيلدينافيل", "متوسطة", "قد يسببان هبوطاً شديداً في الضغط."],
  ["مكملات البوتاسيوم", "سبيرونولاكتون", "خطيرة", "يزيدان خطر فرط البوتاسيوم في الدم. استشر الطبيب."],
  ["مكملات البوتاسيوم", "فوروسيميد", "خفيفة", "مدر البوتاسيوم قد يعاكس تأثير المكمل. راقب التحاليل."],
  ["مكملات أوميغا 3", "الأسبرين", "خفيفة", "الجرعات العالية قد تزيد ميل النزيف."],
  ["مكملات أوميغا 3", "الوارفارين", "خفيفة", "الجرعات العالية قد تزيد ميل النزيف."],
  ["الجنكة", "الأسبرين", "متوسطة", "تزيد ميل النزيف. استشر الطبيب."],
  ["الجنكة", "الوارفارين", "متوسطة", "تزيد ميل النزيف. استشر الطبيب."],
  ["الثوم", "الوارفارين", "خفيفة", "الجرعات العالية قد تزيد ميل النزيف."],
  ["الجينسنغ", "الوارفارين", "خفيفة", "قد يقلل تأثير الوارفارين."],
  ["موانع الحمل", "الريفامبيسين", "متوسطة", "يقلل فعالية مانع الحمل. استشر الطبيب."],
  ["موانع الحمل", "أموكسيسيلين", "خفيفة", "قد يقلل فعالية مانع الحمل. استخدم وسيلة إضافية."],
  ["موانع الحمل", "كاربامازيبين", "متوسطة", "يقلل فعالية مانع الحمل. استشر الطبيب."]
];

/* ---------- توحيد أسماء الأدوية للمقارنة ---------- */
function normalizeName(s) {
  return (s || "").toString().trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^ال/, "")
    .toLowerCase();
}

/* هل للدواء أي تفاعل مسجل؟ */
function hasInteraction(name) {
  const n = normalizeName(name);
  if (!n) return false;
  return DRUG_INTERACTIONS.some(([a, b]) => n.includes(normalizeName(a)) || n.includes(normalizeName(b)));
}

/* فحص كل أزواج الأدوية وعرض التنبيهات */
function checkInteractions() {
  const container = document.getElementById("interactionAlerts");
  if (!container) return;
  const meds = appData.medications;
  const alerts = [];
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const m1 = meds[i], m2 = meds[j];
      const n1 = normalizeName(m1.name), n2 = normalizeName(m2.name);
      if (!n1 || !n2) continue;
      for (const [a, b, sev, advice] of DRUG_INTERACTIONS) {
        const na = normalizeName(a), nb = normalizeName(b);
        if ((n1.includes(na) && n2.includes(nb)) || (n1.includes(nb) && n2.includes(na))) {
          alerts.push({ m1, m2, sev, advice });
          break;
        }
      }
    }
  }
  if (alerts.length === 0) {
    container.innerHTML = '<div class="interaction-safe">✅ لا توجد تفاعلات خطيرة بين أدويتك الحالية</div>';
    return;
  }
  const sevIcon = { "خطيرة": "🔴", "متوسطة": "🟠", "خفيفة": "🟡" };
  container.innerHTML = alerts.map(al => `
    <div class="interaction-alert">
      <div class="ia-icon">${sevIcon[al.sev] || "⚠️"}</div>
      <div class="ia-text">
        <strong>تفاعل ${al.sev}: ${escapeHtml(al.m1.name)} + ${escapeHtml(al.m2.name)}</strong>
        <span>${escapeHtml(al.advice)}</span>
      </div>
    </div>`).join("");
}

/* ---------- قاعدة بيانات الأدوية الشائعة (للبحث والإكمال التلقائي) ---------- */
const AR_DRUG_DB = [
  { n: "باراسيتامول", c: "مسكن وخافض حرارة", i: "الجرعة القصوى 4 غرام يومياً. تجنبه مع مشاكل الكبد." },
  { n: "إيبوبروفين", c: "مسكن ومضاد التهاب", i: "يؤخذ مع الطعام. تجنبه مع قرحة المعدة أو الفشل الكلوي." },
  { n: "أسبرين", c: "مسكن ومميع دم", i: "الجرعة القلبية 75-100 ملغ يومياً. لا تتناوله مع مضادات الالتهاب." },
  { n: "أموكسيسيلين", c: "مضاد حيوي", i: "أكمل الجرعة كاملة حتى لو تحسنت." },
  { n: "أزيثروميسين", c: "مضاد حيوي", i: "يؤخذ قبل الأكل بساعة أو بعده بساعتين." },
  { n: "كلاريثرومايسين", c: "مضاد حيوي", i: "احذر تفاعله مع الستاتينات والوارفارين." },
  { n: "سيبروفلوكساسين", c: "مضاد حيوي", i: "لا تتناوله مع مضادات الحموضة أو الحليب." },
  { n: "ليفوفلوكساسين", c: "مضاد حيوي", i: "اشرب ماء كثيراً. احذر تمزق الأوتار مع الكورتيزون." },
  { n: "سيفالكسين", c: "مضاد حيوي", i: "يؤخذ مع الطعام لتقليل اضطراب المعدة." },
  { n: "ميتفورمين", c: "خافض سكر", i: "يؤخذ مع الأكل. أخبر طبيبك قبل أي صبغة يود." },
  { n: "غليكلازيد", c: "خافض سكر", i: "قد يسبب هبوط السكر. احمل حلوى معك." },
  { n: "غليبينكلاميد", c: "خافض سكر", i: "قد يسبب هبوط السكر. لا تفوت الوجبات." },
  { n: "سيتاجليبتين", c: "خافض سكر", i: "يؤخذ مرة يومياً في نفس الموعد." },
  { n: "إمباغليفلوزين", c: "خافض سكر", i: "اشرب ماء كثيراً. راقب التهابات المسالك." },
  { n: "أنسولين", c: "هرمون سكر", i: "احفظه في الثلاجة. لا تهزه بعنف." },
  { n: "ليفوثيروكسين", c: "هرمون غدة درقية", i: "يؤخذ على معدة فارغة قبل الفطور بنصف ساعة." },
  { n: "أتورفاستاتين", c: "خافض كوليسترول", i: "يؤخذ مساءً. احذر آلام العضلات." },
  { n: "سيمفاستاتين", c: "خافض كوليسترول", i: "يؤخذ مساءً. تجنب عصير الجريب فروت." },
  { n: "أملوديبين", c: "خافض ضغط", i: "قد يسبب تورم الكاحلين. أخبر طبيبك." },
  { n: "لوسارتان", c: "خافض ضغط", i: "احذر مكملات البوتاسيوم معه." },
  { n: "ليسينوبريل", c: "خافض ضغط", i: "قد يسبب سعالاً جافاً. أخبر طبيبك." },
  { n: "إنالابريل", c: "خافض ضغط", i: "قد يسبب سعالاً جافاً. أخبر طبيبك." },
  { n: "ميتوبرولول", c: "حاصر بيتا", i: "لا توقفه فجأة. راقب نبضك." },
  { n: "أتينولول", c: "حاصر بيتا", i: "لا توقفه فجأة." },
  { n: "بيسوبرولول", c: "حاصر بيتا", i: "لا توقفه فجأة. راقب نبضك." },
  { n: "فوروسيميد", c: "مدر بول", i: "يؤخذ صباحاً لتجنب التبول الليلي. راقب البوتاسيوم." },
  { n: "سبيرونولاكتون", c: "مدر بول", i: "احذر ارتفاع البوتاسيوم. راقب التحاليل." },
  { n: "هيدروكلوروثيازيد", c: "مدر بول", i: "قد يرفع السكر واليوريك. راقب التحاليل." },
  { n: "ديجوكسين", c: "مقوي قلب", i: "راقب النبض. أخبر طبيبك عند الغثيان أو تشوش الرؤية." },
  { n: "وارفارين", c: "مميع دم", i: "حافظ على جرعة فيتامين ك ثابتة. راقب التحاليل بانتظام." },
  { n: "ريفاروكسابان", c: "مميع دم", i: "لا تنس الجرعة. أخبر طبيبك قبل أي عملية." },
  { n: "أبيكسابان", c: "مميع دم", i: "لا تنس الجرعة. أخبر طبيبك قبل أي عملية." },
  { n: "كلوبيدوجريل", c: "مميع دم", i: "لا توقفه قبل العمليات إلا بأمر الطبيب." },
  { n: "أوميبرازول", c: "مضاد حموضة", i: "يؤخذ قبل الفطور بنصف ساعة." },
  { n: "بانتوبرازول", c: "مضاد حموضة", i: "يؤخذ قبل الفطور بنصف ساعة." },
  { n: "رانيتيدين", c: "مضاد حموضة", i: "يؤخذ قبل الأكل بنصف ساعة." },
  { n: "مضادات الحموضة", c: "مضاد حموضة", i: "افصلها ساعتين عن الأدوية الأخرى." },
  { n: "ديكلوفيناك", c: "مسكن ومضاد التهاب", i: "يؤخذ مع الطعام. احذر مع مميعات الدم." },
  { n: "نابروكسين", c: "مسكن ومضاد التهاب", i: "يؤخذ مع الطعام. لا تتناوله مع الأسبرين." },
  { n: "سيليكوكسيب", c: "مسكن ومضاد التهاب", i: "احذر مع مميعات الدم وأمراض القلب." },
  { n: "بريدنيزولون", c: "كورتيزون", i: "لا توقفه فجأة. قلل الجرعة تدريجياً." },
  { n: "ديكساميثازون", c: "كورتيزون", i: "لا توقفه فجأة." },
  { n: "سيتالوبرام", c: "مضاد اكتئاب", i: "يؤخذ صباحاً. لا توقفه فجأة." },
  { n: "فلوكسيتين", c: "مضاد اكتئاب", i: "يؤخذ صباحاً. احذر مع الترامادول." },
  { n: "دولوكستين", c: "مضاد اكتئاب", i: "احذر مع الترامادول ومضادات الالتهاب." },
  { n: "ترامادول", c: "مسكن أفيوني", i: "قد يسبب دوخة ونعاساً. لا تقد السيارة." },
  { n: "كودايين", c: "مسكن أفيوني", i: "قد يسبب إمساكاً. اشرب ماء كثيراً." },
  { n: "ألبوتيرول", c: "موسع قصبات", i: "رج البخاخ قبل الاستخدام." },
  { n: "سالبوتامول", c: "موسع قصبات", i: "رج البخاخ قبل الاستخدام." },
  { n: "مونتيلوكاست", c: "مضاد حساسية", i: "يؤخذ مساءً. قد يسبب صداعاً." },
  { n: "سيتريزين", c: "مضاد حساسية", i: "قد يسبب نعاساً خفيفاً." },
  { n: "لوراتادين", c: "مضاد حساسية", i: "لا يسبب نعاساً عادة." },
  { n: "ليفوسيتريزين", c: "مضاد حساسية", i: "قد يسبب نعاساً خفيفاً." },
  { n: "فيتامين د", c: "فيتامين", i: "يؤخذ مع وجبة دهنية لامتصاص أفضل." },
  { n: "كربونات الكالسيوم", c: "مكمل", i: "افصله 4 ساعات عن هرمون الغدة." },
  { n: "مكملات الحديد", c: "مكمل", i: "يؤخذ مع فيتامين سي. قد يسبب إمساكاً." },
  { n: "فيتامين ب12", c: "فيتامين", i: "يؤخذ صباحاً على معدة فارغة." },
  { n: "مكملات أوميغا 3", c: "مكمل", i: "يؤخذ مع الطعام." },
  { n: "مكملات البوتاسيوم", c: "مكمل", i: "احذر مع خافضات الضغط ومدرات البول." },
  { n: "تامسولوسين", c: "بروستاتا", i: "قم ببطء عند الوقوف لتجنب الدوخة." },
  { n: "فيناسترايد", c: "بروستاتا", i: "النساء الحوامل لا يلمسن الأقراص." },
  { n: "سيلدينافيل", c: "ضعف انتصاب", i: "ممنوع مع النترات نهائياً." },
  { n: "ميتوكلوبراميد", c: "مضاد غثيان", i: "قد يسبب حركات لا إرادية. أخبر طبيبك." },
  { n: "أوندانسيترون", c: "مضاد غثيان", i: "قد يسبب إمساكاً." },
  { n: "بيساكوديل", c: "ملين", i: "يؤخذ ليلاً. لا تستخدمه يومياً." },
  { n: "لاكتولوز", c: "ملين", i: "اشرب ماء كثيراً معه." },
  { n: "الوبيورينول", c: "نقرس", i: "اشرب ماء كثيراً. لا توقفه أثناء نوبة النقرس." },
  { n: "كولشيسين", c: "نقرس", i: "لا تتجاوز الجرعة الموصوفة." },
  { n: "أميودارون", c: "مضاد اضطراب نظم", i: "احذر تفاعله مع الوارفارين والديجوكسين." },
  { n: "كاربامازيبين", c: "مضاد تشنج", i: "لا توقفه فجأة. راقب التحاليل." },
  { n: "ليثيوم", c: "مثبت مزاج", i: "اشرب ماء كثيراً. راقب التحاليل بانتظام." },
  { n: "ميثوتريكسات", c: "مثبط مناعة", i: "جرعة أسبوعية وليست يومية. ممنوع مع الأسبرين." },
  { n: "الآزاثيوبرين", c: "مثبط مناعة", i: "احذر مع الوبيورينول." },
  { n: "موانع الحمل", c: "هرموني", i: "تناوليها في نفس الموعد يومياً." },
  { n: "النترات", c: "ذبحات صدرية", i: "ممنوعة مع السيلدينافيل نهائياً." },
  { n: "الجنكة", c: "عشبة", i: "تزيد ميل النزيف. احذر مع مميعات الدم." },
  { n: "الثوم", c: "عشبة", i: "الجرعات العالية تزيد ميل النزيف." },
  { n: "الجينسنغ", c: "عشبة", i: "قد يقلل تأثير مميعات الدم." }
];

/* ---------- البحث في الأدوية ---------- */
function medCardHTML(med) {
  const member = getMember(med.memberId);
  const lowStock = med.quantity !== undefined && med.quantity !== null && med.refill !== undefined && med.quantity <= med.refill;
  const cardCls = lowStock ? "warning" : "";
  const daysLabel = med.days.length === 7 ? "كل يوم" :
    med.days.map(d => DAY_SHORT[d]).join("، ");
  // تنبؤ موعد إعادة الطلب
  let refillInfo = "";
  const dr = daysRemaining(med);
  if (dr !== null) {
    const refillDate = new Date();
    refillDate.setDate(refillDate.getDate() + dr);
    refillInfo = `<div class="med-footer">📦 يكفي حتى ${formatDateArabic(refillDate.toISOString().slice(0, 10))} (${dr} يوم)</div>`;
  }
  // تتبع الكورس
  let courseHTML = "";
  if (med.courseTotal) {
    const taken = Math.min(med.courseTaken || 0, med.courseTotal);
    const pct = Math.round((taken / med.courseTotal) * 100);
    const done = taken >= med.courseTotal;
    courseHTML = `
      <div class="course-label">${done ? "✅ اكتمل الكورس" : `📅 يوم ${taken} من ${med.courseTotal}`}</div>
      <div class="course-progress"><div class="bar" style="width:${pct}%;${done ? "background:var(--success);" : ""}"></div></div>`;
  }
  // تحذيرات السلامة على الكرت
  let safetyBadges = "";
  const exp = med.expiry ? new Date(med.expiry + "T00:00:00") : null;
  if (exp && !isNaN(exp)) {
    const daysLeft = Math.ceil((exp - new Date()) / 86400000);
    if (daysLeft < 0) safetyBadges += `<div class="med-footer" style="color:var(--danger);font-weight:700;">☠️ منتهي الصلاحية منذ ${Math.abs(daysLeft)} يوم</div>`;
    else if (daysLeft <= 30) safetyBadges += `<div class="med-footer" style="color:var(--accent);font-weight:700;">📅 تنتهي الصلاحية بعد ${daysLeft} يوم</div>`;
  }
  if (hasInteraction(med.name)) safetyBadges += `<div class="med-footer" style="color:var(--danger);font-weight:700;">⚠️ تفاعل دوائي محتمل</div>`;
  const catName = CATEGORY_LABELS[med.category];
  return `
    <div class="med-card ${cardCls}">
      <div class="med-header">
        <div>
          <div class="med-name">
            ${escapeHtml(med.name)}
            <span class="med-form">${escapeHtml(med.form)}</span>
            ${catName ? `<span class="cat-badge">${catName}</span>` : ""}
          </div>
          <div class="med-dosage">
            ${escapeHtml(med.dosage || "بدون جرعة")} · ${escapeHtml(member.name)} · ${daysLabel}
          </div>
        </div>
        <div class="med-actions">
          <button class="icon-btn" onclick="openMedModal('${med.id}')" title="تعديل">✏️</button>
          <button class="icon-btn delete" onclick="askDeleteMed('${med.id}')" title="حذف">🗑️</button>
        </div>
      </div>
      <div class="med-times">
        ${med.times.map(t => `<span class="time-chip" style="cursor:default;">${formatTimeArabic(t)}</span>`).join("")}
      </div>
      ${courseHTML}
      ${safetyBadges}
      ${lowStock ? `<div class="med-footer" style="color:var(--danger);font-weight:700;">⚠️ الكمية منخفضة: ${med.quantity} متبقية — اطلب من الصيدلية</div>` : ""}
      ${refillInfo}
      ${med.notes ? `<div class="med-footer">📝 ${escapeHtml(med.notes)}</div>` : ""}
    </div>`;
}

function handleSearch(q) {
  q = (q || "").trim();
  const container = document.getElementById("allList");
  if (!container) return;
  if (!q) { renderAllMeds(); return; }
  const nq = normalizeName(q);
  const results = appData.medications.filter(med =>
    normalizeName(med.name).includes(nq) ||
    normalizeName(med.dosage || "").includes(nq) ||
    normalizeName(med.form || "").includes(nq) ||
    normalizeName(getMember(med.memberId).name).includes(nq)
  );
  document.getElementById("allCount").textContent = results.length;
  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🔍</div>
        <h3>لا توجد نتائج</h3>
        <p>جرّب كلمة أخرى مثل اسم الدواء أو الجرعة</p>
      </div>`;
    return;
  }
  container.innerHTML = results.map(medCardHTML).join("");
}

/* ---------- الإكمال التلقائي ---------- */
let _acCache = [];
function showAutocomplete(q, dropdownId) {
  const dropdown = document.getElementById(dropdownId || "autocompleteDropdown");
  if (!dropdown) return;
  q = (q || "").trim();
  if (!q) { dropdown.classList.remove("open"); return; }
  const nq = normalizeName(q);
  const suggestions = AR_DRUG_DB.filter(d => normalizeName(d.n).includes(nq)).slice(0, 6)
    .map(d => ({ label: d.n, sub: d.c }));
  appData.medications.forEach(m => {
    if (normalizeName(m.name).includes(nq) && !suggestions.some(s => s.label === m.name)) {
      suggestions.push({ label: m.name, sub: "دواء مضاف" });
    }
  });
  if (suggestions.length === 0) { dropdown.classList.remove("open"); return; }
  _acCache = suggestions.map(s => s.label);
  dropdown.innerHTML = suggestions.map((s, i) => `
    <div class="autocomplete-item" onclick="selectAutocomplete(${i})">
      <strong>${escapeHtml(s.label)}</strong>
      <span>${escapeHtml(s.sub)}</span>
    </div>`).join("");
  dropdown.classList.add("open");
}

function selectAutocomplete(i) {
  const label = _acCache[i];
  if (label === undefined) return;
  const active = document.activeElement;
  if (active && (active.id === "searchInput" || active.id === "medName")) {
    active.value = label;
    if (active.id === "searchInput") handleSearch(label);
  } else {
    const medName = document.getElementById("medName");
    if (medName) medName.value = label;
  }
  clearAutocomplete();
}

function clearAutocomplete() {
  ["autocompleteDropdown", "medAutocomplete"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("open");
  });
}

/* ---------- العلامات الحيوية ---------- */
const VITALS_TYPES = {
  bp: { label: "ضغط الدم", unit: "ملم زئبق", icon: "🩸", v1: "الانقباضي (العلوي)", v2: "الانبساطي (السفلي)", ph1: "120", ph2: "80" },
  sugar: { label: "السكر", unit: "ملغ/دل", icon: "🍬", v1: "السكر (صائم)", v2: "السكر (فاطر)", ph1: "90", ph2: "140" },
  weight: { label: "الوزن", unit: "كغ", icon: "⚖️", v1: "الوزن", v2: "", ph1: "70", ph2: "" }
};

function formatDateArabic(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" });
}

function openVitalsModal() {
  document.getElementById("vitalsType").value = "bp";
  document.getElementById("vitalsValue1").value = "";
  document.getElementById("vitalsValue2").value = "";
  document.getElementById("vitalsNote").value = "";
  updateVitalsLabels();
  document.getElementById("vitalsModal").classList.add("open");
}

function updateVitalsLabels() {
  const type = document.getElementById("vitalsType").value;
  const cfg = VITALS_TYPES[type];
  document.getElementById("vitalsValueLabel").textContent = cfg.v1;
  document.getElementById("vitalsValue1").placeholder = cfg.ph1;
  const v2Group = document.getElementById("vitalsValue2Label").closest(".form-group");
  if (cfg.v2) {
    document.getElementById("vitalsValue2Label").textContent = cfg.v2;
    document.getElementById("vitalsValue2").placeholder = cfg.ph2;
    v2Group.style.display = "";
  } else {
    v2Group.style.display = "none";
    document.getElementById("vitalsValue2").value = "";
  }
}

function saveVital() {
  const type = document.getElementById("vitalsType").value;
  const cfg = VITALS_TYPES[type];
  const v1 = parseFloat(document.getElementById("vitalsValue1").value);
  if (isNaN(v1) || v1 <= 0) { showToast("أدخل قيمة صحيحة", "error"); return; }
  const v2Raw = document.getElementById("vitalsValue2").value;
  const v2 = v2Raw ? parseFloat(v2Raw) : null;
  if (cfg.v2 && (v2 === null || isNaN(v2) || v2 <= 0)) { showToast("أدخل القيمة الثانية", "error"); return; }
  const note = document.getElementById("vitalsNote").value.trim();
  appData.vitals = appData.vitals || [];
  appData.vitals.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type,
    value1: v1,
    value2: v2,
    note,
    date: todayStr(),
    time: nowTime()
  });
  saveData();
  renderVitals();
  closeModal("vitalsModal");
  showToast("✓ تم حفظ القياس", "success");
}

function deleteVital(id) {
  appData.vitals = (appData.vitals || []).filter(v => v.id !== id);
  saveData();
  renderVitals();
  showToast("تم حذف القياس", "error");
}

function renderVitals() {
  const container = document.getElementById("vitalsList");
  if (!container) return;
  const vitals = appData.vitals || [];
  const addBtn = `<button class="btn btn-primary btn-block" onclick="openVitalsModal()" style="margin-bottom:12px;">➕ إضافة قياس</button>`;
  if (vitals.length === 0) {
    container.innerHTML = addBtn + `
      <div class="empty-state">
        <div class="emoji">💓</div>
        <h3>لا توجد قياسات بعد</h3>
        <p>سجّل ضغط الدم أو السكر أو الوزن لمتابعتها</p>
      </div>`;
    return;
  }
  const groups = {};
  vitals.forEach(v => { (groups[v.type] = groups[v.type] || []).push(v); });
  container.innerHTML = addBtn + Object.keys(groups).map(type => {
    const cfg = VITALS_TYPES[type] || { label: type, unit: "", icon: "📊" };
    const list = groups[type].slice(-7).reverse();
    const last = list[0];
    const valueText = type === "bp" ? `${last.value1}/${last.value2}` : `${last.value1}${cfg.unit ? " " + cfg.unit : ""}`;
    const abnormal = type === "bp" ? (last.value1 > 140 || last.value1 < 90) :
      type === "sugar" ? (last.value1 > 180 || last.value1 < 70) : false;
    const bars = list.slice(0, 7).map(v => {
      const val = Number(v.value1) || 0;
      const h = Math.min(100, Math.max(6, Math.round((val / 200) * 100)));
      const cls = type === "bp" ? (val > 140 ? " high" : val < 90 ? " low" : "") :
        type === "sugar" ? (val > 180 ? " high" : val < 70 ? " low" : "") : "";
      return `<div class="vitals-bar${cls}" title="${val}"><div class="bar-label">${val}</div></div>`;
    }).join("");
    return `
      <div class="vitals-card">
        <div class="vitals-header">
          <h4>${cfg.icon} ${cfg.label}</h4>
          <button class="icon-btn delete" onclick="deleteVital('${last.id}')" title="حذف آخر قياس">🗑️</button>
        </div>
        <div class="vitals-value${abnormal ? " abnormal" : ""}">${valueText} <span class="unit">${cfg.unit}</span></div>
        <div class="vitals-chart">${bars}</div>
        <div class="vitals-actions">
          <button class="btn btn-outline" onclick="openVitalsModal()">➕ إضافة قياس</button>
        </div>
      </div>`;
  }).join("");
}

/* ---------- سجل الأعراض ---------- */
function openSymptomModal() {
  document.getElementById("symptomType").value = "🤕 صداع";
  document.getElementById("symptomSeverity").value = "light";
  document.getElementById("symptomNote").value = "";
  document.getElementById("symptomModal").classList.add("open");
}

function saveSymptom() {
  const type = document.getElementById("symptomType").value;
  const severity = document.getElementById("symptomSeverity").value;
  const note = document.getElementById("symptomNote").value.trim();
  appData.symptoms = appData.symptoms || [];
  appData.symptoms.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type,
    severity,
    note,
    date: todayStr(),
    time: nowTime()
  });
  saveData();
  renderSymptoms();
  closeModal("symptomModal");
  showToast("✓ تم تسجيل العرض", "success");
}

function deleteSymptom(id) {
  appData.symptoms = (appData.symptoms || []).filter(s => s.id !== id);
  saveData();
  renderSymptoms();
  showToast("تم حذف العرض", "error");
}

function renderSymptoms() {
  const container = document.getElementById("symptomsList");
  if (!container) return;
  const symptoms = appData.symptoms || [];
  const addBtn = `<button class="btn btn-primary btn-block" onclick="openSymptomModal()" style="margin-bottom:12px;">➕ تسجيل عرض</button>`;
  if (symptoms.length === 0) {
    container.innerHTML = addBtn + `
      <div class="empty-state">
        <div class="emoji">🩺</div>
        <h3>لا توجد أعراض مسجلة</h3>
        <p>سجّل أي عرض تشعر به لمشاركته مع طبيبك</p>
      </div>`;
    return;
  }
  const sevMap = { light: "خفيف", moderate: "متوسط", severe: "شديد" };
  const sorted = [...symptoms].reverse();
  container.innerHTML = addBtn + sorted.map(s => {
    const raw = s.type || "أخرى";
    let emoji, name;
    if (raw === "أخرى") { emoji = "📝"; name = "أخرى"; }
    else {
      const parts = raw.split(" ");
      emoji = parts[0] || "📝";
      name = parts.slice(1).join(" ") || raw;
    }
    return `
      <div class="symptom-card">
        <div class="symptom-emoji">${emoji}</div>
        <div class="symptom-info">
          <div class="name">${escapeHtml(name)}</div>
          <div class="time">${formatDateArabic(s.date)} ${s.time ? "· " + s.time : ""}${s.note ? " · " + escapeHtml(s.note) : ""}</div>
        </div>
        <span class="symptom-severity ${s.severity}">${sevMap[s.severity] || s.severity}</span>
        <button class="icon-btn delete" onclick="deleteSymptom('${s.id}')" title="حذف">🗑️</button>
      </div>`;
  }).join("");
}

/* ---------- الوضع الليلي ---------- */
function toggleDarkMode() {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("medReminder_dark", dark ? "1" : "0");
  showToast(dark ? "🌙 الوضع الليلي مفعّل" : "☀️ الوضع النهاري", "success");
}

/* ---------- الخط الأكبر ---------- */
function toggleLargeText() {
  const large = document.body.classList.toggle("large-text");
  localStorage.setItem("medReminder_large", large ? "1" : "0");
  showToast(large ? "🔠 الخط أصبح أكبر" : "🔠 الخط الافتراضي", "success");
}

/* ---------- اللغة الإنجليزية ---------- */
function setLangText(el, ar, enText) {
  if (!el) return;
  const t = document.body.classList.contains("en") ? enText : ar;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") { el.placeholder = t; return; }
  [...el.childNodes].forEach(n => { if (n.nodeType === 3) n.textContent = ""; });
  el.insertBefore(document.createTextNode(t + " "), el.firstChild);
}

function applyLang() {
  const en = localStorage.getItem("medReminder_lang") === "en";
  document.body.classList.toggle("en", en);
  const map = [
    [".logo span", "تذكير الدواء", "Med Reminder"],
    ["#greetingText", "مرحباً 👋", "Hello 👋"],
    ["#greetingSub", "كيف حال التزامك اليوم؟", "How is your adherence today?"],
    ["#searchInput", "ابحث عن دواء...", "Search for a medicine..."],
    ["#todaySection h2", "📋 أدوية اليوم", "📋 Today's Medicines"],
    ["#allSection h2", "💊 جميع الأدوية", "💊 All Medicines"],
    ["#vitalsSection h2", "💓 العلامات الحيوية", "💓 Vital Signs"],
    ["#symptomsSection h2", "🩺 سجل الأعراض", "🩺 Symptom Log"],
    ["#reportSection h2", "📊 تقرير الالتزام", "📊 Adherence Report"],
    ["#familySection h2", "👨‍👩‍👧‍👦 أفراد العائلة", "👨‍👩‍👧‍👦 Family Members"],
    ["#settingsSection h2", "⚙️ الإعدادات", "⚙️ Settings"],
    ["#medModalTitle", "➕ إضافة دواء جديد", "➕ Add New Medicine"],
    ["#voiceBtn", "🎤 إدخال صوتي", "🎤 Voice Input"]
  ];
  map.forEach(([sel, ar, enText]) => setLangText(document.querySelector(sel), ar, enText));
  const navEn = { home: "Home", vitals: "Vitals", symptoms: "Symptoms", report: "Reports", family: "Family", settings: "Settings" };
  const navAr = { home: "الرئيسية", vitals: "الحيوية", symptoms: "الأعراض", report: "التقارير", family: "العائلة", settings: "الإعدادات" };
  document.querySelectorAll(".nav-item").forEach(btn => {
    const tab = btn.dataset.tab;
    const span = btn.querySelector(".nav-icon");
    btn.textContent = "";
    if (span) btn.appendChild(span);
    btn.appendChild(document.createTextNode(" " + (en ? navEn[tab] : navAr[tab])));
  });
  const sumMap = [
    ["totalToday", "جرعة اليوم", "Today's doses"],
    ["takenToday", "تم أخذها", "Taken"],
    ["missedToday", "فائتة", "Missed"]
  ];
  sumMap.forEach(([id, ar, enText]) => {
    const num = document.getElementById(id);
    if (num) {
      const label = num.parentElement.querySelector(".label");
      if (label) label.textContent = en ? enText : ar;
    }
  });
}

function toggleLang() {
  const en = localStorage.getItem("medReminder_lang") === "en";
  localStorage.setItem("medReminder_lang", en ? "ar" : "en");
  applyLang();
  showToast(en ? "🌐 تم التبديل إلى العربية" : "🌐 Switched to English", "success");
}

/* ---------- الإدخال الصوتي ---------- */
function startVoiceInput() {
  const btn = document.getElementById("voiceBtn");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast("الإدخال الصوتي غير مدعوم في هذا المتصفح", "error"); return; }
  const rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  btn.classList.add("listening");
  btn.textContent = "🎤 ... جارٍ الاستماع";
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    const medName = document.getElementById("medName");
    if (medName) medName.value = text;
    showToast("✓ تم التعرف على الاسم", "success");
  };
  rec.onerror = () => showToast("تعذر التعرف على الصوت، حاول مجدداً", "error");
  rec.onend = () => {
    btn.classList.remove("listening");
    btn.textContent = "🎤 إدخال صوتي";
  };
  rec.start();
}

/* ---------- التقرير الطبي القابل للطباعة ---------- */
/* ---------- التقرير الطبي القابل للطباعة (مع رسوم بيانية) ---------- */
function generatePrintReport() {
  const el = document.getElementById("printReport");
  const meds = appData.medications;
  const vitals = appData.vitals || [];
  const symptoms = appData.symptoms || [];
  const today = new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  /* رسم بياني للالتزام (آخر 7 أيام) */
  let adherenceSvg = "";
  try {
    const wd = getWeekData();
    const max = Math.max(1, ...wd.days.map(d => d.total));
    const bars = wd.days.map((d, i) => {
      const h = d.total > 0 ? Math.max(4, Math.round((d.taken / d.total) * 100)) : 0;
      const color = d.total === 0 ? "#cbd5e1" : d.taken === d.total ? "#10b981" : d.taken > 0 ? "#f59e0b" : "#ef4444";
      const x = 20 + i * 40;
      return `<rect x="${x}" y="${100 - h}" width="26" height="${h}" rx="4" fill="${color}"/>
        <text x="${x + 13}" y="116" font-size="9" text-anchor="middle" fill="#555">${DAY_SHORT[d.day]}</text>
        <text x="${x + 13}" y="${100 - h - 4}" font-size="9" text-anchor="middle" fill="#333">${d.total === 0 ? "–" : d.taken + "/" + d.total}</text>`;
    }).join("");
    adherenceSvg = `<svg viewBox="0 0 300 130" style="width:100%;max-width:340px;display:block;margin:0 auto;">
      <line x1="20" y1="100" x2="300" y2="100" stroke="#ddd" stroke-width="1"/>
      ${bars}</svg>`;
  } catch (e) { adherenceSvg = ""; }

  /* رسم بياني للعلامات الحيوية (آخر قياس لكل نوع) */
  let vitalsSvg = "";
  try {
    const types = {};
    vitals.forEach(v => { if (!types[v.type]) types[v.type] = []; types[v.type].push(v); });
    const typeKeys = Object.keys(types);
    if (typeKeys.length > 0) {
      const t = typeKeys[0];
      const cfg = VITALS_TYPES[t] || { label: t, unit: "" };
      const series = types[t].slice(-14);
      const vals = series.map(v => Number(v.value1));
      const min = Math.min(...vals), max = Math.max(...vals);
      const range = (max - min) || 1;
      const pts = series.map((v, i) => {
        const x = 20 + (i * (260 / Math.max(1, series.length - 1)));
        const y = 100 - ((Number(v.value1) - min) / range) * 80;
        return `${x},${y}`;
      }).join(" ");
      const last = series[series.length - 1];
      vitalsSvg = `<svg viewBox="0 0 300 130" style="width:100%;max-width:340px;display:block;margin:0 auto;">
        <polyline points="${pts}" fill="none" stroke="#0d9488" stroke-width="2.5"/>
        <text x="150" y="16" font-size="11" text-anchor="middle" fill="#333" font-weight="bold">${cfg.label} — آخر ${series.length} قياس</text>
        <text x="20" y="124" font-size="9" fill="#555">${formatDateArabic(last.date)}</text>
        <text x="280" y="124" font-size="9" text-anchor="end" fill="#555">${last.value1}${cfg.unit ? " " + cfg.unit : ""}</text>
      </svg>`;
    }
  } catch (e) { vitalsSvg = ""; }

  /* ملخص التفاعلات بين الأدوية الحالية */
  let interSummary = "";
  try {
    const ints = (typeof DRUG_INTERACTIONS_DB !== "undefined" ? DRUG_INTERACTIONS_DB : []);
    const builtIn = (typeof DRUG_INTERACTIONS !== "undefined" ? DRUG_INTERACTIONS : []);
    const activeNames = meds.filter(m => m.active).map(m => m.name);
    const found = [];
    for (let i = 0; i < activeNames.length; i++) {
      for (let j = i + 1; j < activeNames.length; j++) {
        const a = activeNames[i], b = activeNames[j];
        for (let k = 0; k < ints.length; k++) {
          if ((ints[k].a.indexOf(a) !== -1 && ints[k].b.indexOf(b) !== -1) ||
              (ints[k].b.indexOf(a) !== -1 && ints[k].a.indexOf(b) !== -1)) {
            found.push({ a, b, severity: ints[k].severity, effect: ints[k].effect });
          }
        }
        for (let k = 0; k < builtIn.length; k++) {
          if ((builtIn[k][0].indexOf(a) !== -1 && builtIn[k][1].indexOf(b) !== -1) ||
              (builtIn[k][1].indexOf(a) !== -1 && builtIn[k][0].indexOf(b) !== -1)) {
            found.push({ a, b, severity: "high", effect: builtIn[k][2] });
          }
        }
      }
    }
    if (found.length > 0) {
      interSummary = `<h2>⚠️ تفاعلات محتملة بين الأدوية الحالية</h2>
        <table><thead><tr><th>الدواءان</th><th>الخطورة</th><th>التأثير</th></tr></thead><tbody>
        ${found.map(f => `<tr><td>${escapeHtml(f.a)} + ${escapeHtml(f.b)}</td><td>${f.severity === "high" ? "🔴 خطير" : "🟡 متوسط"}</td><td>${escapeHtml(f.effect)}</td></tr>`).join("")}
        </tbody></table>`;
    }
  } catch (e) { interSummary = ""; }

  const medRows = meds.length === 0
    ? `<tr><td colspan="4" style="text-align:center;">لا توجد أدوية</td></tr>`
    : meds.map(m => {
        const member = getMember(m.memberId);
        const daysLabel = m.days.length === 7 ? "كل يوم" : m.days.map(d => DAY_SHORT[d]).join("، ");
        return `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.dosage || "-")} ${escapeHtml(m.form || "")}</td><td>${m.times.map(formatTimeArabic).join("، ")}</td><td>${escapeHtml(member.name)} · ${daysLabel}</td></tr>`;
      }).join("");
  const vitalRows = vitals.length === 0
    ? `<tr><td colspan="3" style="text-align:center;">لا توجد قياسات</td></tr>`
    : [...vitals].reverse().slice(0, 20).map(v => {
        const cfg = VITALS_TYPES[v.type] || { label: v.type, unit: "" };
        const val = v.type === "bp" ? `${v.value1}/${v.value2}` : `${v.value1} ${cfg.unit}`;
        return `<tr><td>${cfg.label}</td><td>${val}</td><td>${formatDateArabic(v.date)} ${v.time || ""}</td></tr>`;
      }).join("");
  const sevMap = { light: "خفيف", moderate: "متوسط", severe: "شديد" };
  const symptomRows = symptoms.length === 0
    ? `<tr><td colspan="3" style="text-align:center;">لا توجد أعراض</td></tr>`
    : [...symptoms].reverse().slice(0, 20).map(s =>
        `<tr><td>${escapeHtml(s.type)}</td><td>${sevMap[s.severity] || s.severity}</td><td>${formatDateArabic(s.date)} ${s.time || ""}${s.note ? " — " + escapeHtml(s.note) : ""}</td></tr>`
      ).join("");
  el.innerHTML = `
    <h1>💊 التقرير الطبي — تذكير الدواء</h1>
    <div class="meta">تاريخ التقرير: ${today} · عدد الأدوية: ${meds.length}</div>
    <h2>📊 الالتزام (آخر 7 أيام)</h2>
    ${adherenceSvg || '<p style="font-size:0.8rem;color:#555;">لا توجد بيانات التزام بعد</p>'}
    <h2>الأدوية الحالية</h2>
    <table><thead><tr><th>الدواء</th><th>الجرعة</th><th>المواعيد</th><th>الفرد / الأيام</th></tr></thead><tbody>${medRows}</tbody></table>
    ${interSummary}
    <h2>📈 العلامات الحيوية</h2>
    ${vitalsSvg || ""}
    <table><thead><tr><th>النوع</th><th>القيمة</th><th>التاريخ</th></tr></thead><tbody>${vitalRows}</tbody></table>
    <h2>الأعراض المسجلة (آخر 20)</h2>
    <table><thead><tr><th>العرض</th><th>الشدة</th><th>التاريخ</th></tr></thead><tbody>${symptomRows}</tbody></table>`;
  window.print();
}
/* ---------- تنبيهات الجرعات الفائتة (قسم العائلة) ---------- */
function renderFamilyAlerts() {
  const container = document.getElementById("familyAlerts");
  if (!container) return;
  const alerts = [];
  appData.medications.forEach(med => {
    const member = getMember(med.memberId);
    med.times.forEach(t => {
      if (isDoseTaken(med.id, t, todayStr())) return;
      const diff = timeToMinutes(nowTime()) - timeToMinutes(t);
      if (diff >= 30) alerts.push({ med, member, time: t, diff });
    });
  });
  if (alerts.length === 0) {
    container.innerHTML = `<div class="interaction-safe">✅ لا توجد جرعات فائتة اليوم</div>`;
    return;
  }
  container.innerHTML = `<div class="section-title"><h3>⏰ جرعات فائتة اليوم</h3></div>` +
    alerts.map(a => `
      <div class="interaction-alert">
        <div class="ia-icon">⏰</div>
        <div class="ia-text">
          <strong>${escapeHtml(a.med.name)} — ${escapeHtml(a.member.name)}</strong>
          <span>فات موعد ${formatTimeArabic(a.time)} منذ ${Math.floor(a.diff / 60)} ساعة و ${a.diff % 60} دقيقة</span>
        </div>
      </div>`).join("");
}

/* ---------- تهيئة الميزات الجديدة ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("medReminder_dark") === "1") document.body.classList.add("dark");
  if (localStorage.getItem("medReminder_large") === "1") document.body.classList.add("large-text");
  applyLang();
  const medName = document.getElementById("medName");
  if (medName) {
    medName.addEventListener("input", () => showAutocomplete(medName.value, "medAutocomplete"));
    medName.addEventListener("blur", () => setTimeout(clearAutocomplete, 200));
  }
  const vitalsType = document.getElementById("vitalsType");
  if (vitalsType) vitalsType.addEventListener("change", updateVitalsLabels);
  const familySection = document.getElementById("familySection");
  if (familySection && !document.getElementById("familyAlerts")) {
    const div = document.createElement("div");
    div.id = "familyAlerts";
    div.style.marginBottom = "12px";
    familySection.insertBefore(div, familySection.firstChild);
  }
  renderFamilyAlerts();
  // ميزات الإصدار 1.2
  checkSafety();
  renderAppointments();
  checkPinLock();
  startEscalation();
  loadSettingsUI();
  // ميزات الإصدار 1.3
  showOnboarding();
  renderAlertHistory();
});

/* ================================================================
   الإصدار 1.2 — ميزات السلامة والمساعدة
   ================================================================ */

/* ---------- صورة الوصفة ---------- */
function previewMedPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) { showToast("الصورة كبيرة — اختر صورة أقل من 1 ميغا", "error"); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    _medPhotoData = e.target.result;
    const preview = document.getElementById("medPhotoPreview");
    preview.src = _medPhotoData;
    preview.classList.remove("hidden");
    document.getElementById("medPhotoRemove").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function removeMedPhoto() {
  _medPhotoData = "";
  document.getElementById("medPhoto").value = "";
  document.getElementById("medPhotoPreview").classList.add("hidden");
  document.getElementById("medPhotoRemove").classList.add("hidden");
}

/* ---------- قاعدة بيانات التفاعلات مع الطعام ---------- */
// [الدواء، الطعام، الخطورة، النصيحة]
const FOOD_INTERACTIONS = [
  ["أتورفاستاتين", "عصير الجريب فروت", "خطيرة", "الجريب فروت يرفع تركيز الدواء في الدم ويسبب تلف العضلات. تجنبه تماماً."],
  ["سيمفاستاتين", "عصير الجريب فروت", "خطيرة", "الجريب فروت يرفع تركيز الدواء في الدم. تجنبه تماماً."],
  ["أملوديبين", "عصير الجريب فروت", "متوسطة", "الجريب فروت يرفع تركيز الدواء ويسبب هبوط الضغط."],
  ["نيفيديبين", "عصير الجريب فروت", "متوسطة", "الجريب فروت يرفع تركيز الدواء."],
  ["سيبروفلوكساسين", "الحليب ومشتقاته", "متوسطة", "الكالسيوم يقلل امتصاص المضاد الحيوي. افصل بينهما ساعتين."],
  ["ليفوفلوكساسين", "الحليب ومشتقاته", "متوسطة", "الكالسيوم يقلل امتصاص المضاد الحيوي. افصل بينهما ساعتين."],
  ["الوارفارين", "الخضار الورقية (السبانخ، الكرنب)", "متوسطة", "فيتامين ك يقلل تأثير الوارفارين. حافظ على كمية ثابتة من الخضار الورقية."],
  ["الوارفارين", "التوت البري", "متوسطة", "التوت البري قد يزيد تأثير الوارفارين وخطر النزيف."],
  ["ميتفورمين", "الكحول", "خطيرة", "الكحول يزيد خطر حموضة الدم. تجنبه."],
  ["الأنسولين", "الكحول", "خطيرة", "الكحول يسبب هبوطاً شديداً في السكر."],
  ["غليكلازيد", "الكحول", "خطيرة", "الكحول يسبب هبوطاً شديداً في السكر."],
  ["الليفوثيروكسين", "القهوة", "متوسطة", "القهوة تقلل امتصاص هرمون الغدة. انتظر ساعة بعد الدواء."],
  ["مكملات الحديد", "الشاي والقهوة", "متوسطة", "الشاي والقهوة يقللان امتصاص الحديد. افصل بينهما ساعتين."],
  ["مكملات الحديد", "الحليب", "متوسطة", "الكالسيوم يقلل امتصاص الحديد. افصل بينهما ساعتين."],
  ["سيلدينافيل", "الوجبات الدسمة", "خفيفة", "الطعام الدسم يؤخر مفعول الدواء."],
  ["الديجوكسين", "عرق السوس", "خطيرة", "عرق السوس يرفع سمية الديجوكسين ويخفض البوتاسيوم."],
  ["مدرات البول", "عرق السوس", "متوسطة", "عرق السوس يخفض البوتاسيوم ويزيد خطر اضطراب النظم."],
  ["الوارفارين", "الثوم", "خفيفة", "الجرعات العالية من الثوم تزيد ميل النزيف."],
  ["الوارفارين", "الزنجبيل", "خفيفة", "الجرعات العالية من الزنجبيل تزيد ميل النزيف."]
];

/* ---------- قاعدة بيانات الجرعة اليومية القصوى ---------- */
// [الدواء، الجرعة القصوى اليومية، الوحدة]
const MAX_DAILY_DOSE = [
  ["باراسيتامول", 4000, "ملغ"],
  ["إيبوبروفين", 2400, "ملغ"],
  ["نابروكسين", 1000, "ملغ"],
  ["ديكلوفيناك", 150, "ملغ"],
  ["أسبرين", 4000, "ملغ"],
  ["ترامادول", 400, "ملغ"],
  ["كودايين", 240, "ملغ"],
  ["ميتفورمين", 2550, "ملغ"],
  ["أموكسيسيلين", 3000, "ملغ"],
  ["أزيثروميسين", 500, "ملغ"],
  ["ليفوثيروكسين", 200, "ميكروغرام"],
  ["أتورفاستاتين", 80, "ملغ"],
  ["سيمفاستاتين", 40, "ملغ"],
  ["أوميبرازول", 40, "ملغ"],
  ["بانتوبرازول", 80, "ملغ"],
  ["سيتالوبرام", 40, "ملغ"],
  ["فلوكسيتين", 80, "ملغ"],
  ["بريدنيزولون", 60, "ملغ"],
  ["الوبيورينول", 800, "ملغ"],
  ["سيلدينافيل", 100, "ملغ"]
];

/* ---------- موانع الاستعمال حسب الأمراض المزمنة ---------- */
// [الدواء، المرض المزمن، النصيحة]
const CONTRAINDICATIONS = [
  ["إيبوبروفين", "قرحة المعدة", "مضادات الالتهاب تزيد خطر النزيف المعدي. استشر الطبيب."],
  ["ديكلوفيناك", "قرحة المعدة", "مضادات الالتهاب تزيد خطر النزيف المعدي. استشر الطبيب."],
  ["نابروكسين", "قرحة المعدة", "مضادات الالتهاب تزيد خطر النزيف المعدي. استشر الطبيب."],
  ["أسبرين", "قرحة المعدة", "الأسبرين يزيد خطر النزيف المعدي. استشر الطبيب."],
  ["إيبوبروفين", "الفشل الكلوي", "مضادات الالتهاب تضر الكلى. ممنوع مع أمراض الكلى."],
  ["ديكلوفيناك", "الفشل الكلوي", "مضادات الالتهاب تضر الكلى. ممنوع مع أمراض الكلى."],
  ["نابروكسين", "الفشل الكلوي", "مضادات الالتهاب تضر الكلى. ممنوع مع أمراض الكلى."],
  ["ميتفورمين", "الفشل الكلوي", "الميتفورمين يتراكم في الجسم مع ضعف الكلى. استشر الطبيب."],
  ["أسبرين", "الربو", "الأسبرين قد يسبب نوبة ربو شديدة عند بعض المرضى."],
  ["إيبوبروفين", "الربو", "مضادات الالتهاب قد تسبب نوبة ربو. استشر الطبيب."],
  ["ديكلوفيناك", "الربو", "مضادات الالتهاب قد تسبب نوبة ربو. استشر الطبيب."],
  ["بريدنيزولون", "السكري", "الكورتيزون يرفع السكر. راقب السكر بانتظام."],
  ["بريدنيزولون", "هشاشة العظام", "الكورتيزون يزيد هشاشة العظام. استشر الطبيب."],
  ["باراسيتامول", "أمراض الكبد", "الباراسيتامول يضر الكبد المتضرر. استشر الطبيب."],
  ["الوارفارين", "قرحة المعدة", "مميعات الدم تزيد خطر النزيف المعدي. استشر الطبيب."],
  ["سبيرونولاكتون", "الفشل الكلوي", "قد يسبب فرط البوتاسيوم مع ضعف الكلى."],
  ["ليثيوم", "الفشل الكلوي", "الليثيوم يتراكم مع ضعف الكلى. استشر الطبيب."],
  ["الديجوكسين", "الفشل الكلوي", "الديجوكسين يتراكم مع ضعف الكلى. استشر الطبيب."],
  ["مكملات البوتاسيوم", "الفشل الكلوي", "ممنوع مع ضعف الكلى — خطر فرط البوتاسيوم."],
  ["سيلدينافيل", "أمراض القلب", "استشر الطبيب قبل استخدامه مع أمراض القلب."],
  ["تامسولوسين", "هبوط الضغط", "قد يسبب هبوطاً شديداً في الضغط."],
  ["أميودارون", "أمراض الغدة الدرقية", "يؤثر على وظيفة الغدة الدرقية. راقب التحاليل."]
];

/* ---------- مجموعات الحساسية الدوائية ---------- */
const ALLERGY_GROUPS = [
  { group: "بنسلين", meds: ["أموكسيسيلين", "أمبيسيلين", "بنسلين", "أموكسيل"] },
  { group: "مضادات الالتهاب", meds: ["أسبرين", "إيبوبروفين", "ديكلوفيناك", "نابروكسين", "سيليكوكسيب"] },
  { group: "السلفا", meds: ["سلفاميثوكسازول", "تريميثوبريم", "كوتريموكسازول"] },
  { group: "الأفيونيات", meds: ["مورفين", "كودايين", "ترامادول"] },
  { group: "مضادات الصرع", meds: ["كاربامازيبين", "فينيتوين", "لاموتريجين"] },
  { group: "اليود", meds: ["أميودارون", "بوفيدون يودي"] }
];

/* ---------- فحوصات السلامة ---------- */
function getMember(id) {
  return appData.family.find(m => m.id === id) || { name: "أفراد العائلة", allergies: "", chronic: "" };
}

function daysRemaining(med) {
  if (!med || !med.quantity || !med.times || med.times.length === 0) return null;
  const dosesPerDay = med.days.length === 0 ? 0 : med.times.length;
  if (dosesPerDay === 0) return null;
  return Math.floor(med.quantity / dosesPerDay);
}

function checkAllergies() {
  const alerts = [];
  appData.medications.forEach(med => {
    const member = getMember(med.memberId);
    const allergies = (member.allergies || "").split(/[,،]/).map(s => normalizeName(s)).filter(Boolean);
    if (allergies.length === 0) return;
    const n = normalizeName(med.name);
    // 1) تطابق مباشر بين اسم الدواء والحساسية المسجلة
    allergies.forEach(al => {
      if (n.includes(al) || al.includes(n)) {
        alerts.push({ med, member, allergy: al });
      }
    });
    // 2) تطابق عبر المجموعات الدوائية (مثل أموكسيسيلين = بنسلين)
    ALLERGY_GROUPS.forEach(g => {
      const inGroup = g.meds.some(m => n.includes(normalizeName(m)) || normalizeName(m).includes(n));
      if (!inGroup) return;
      const allergyMentioned = allergies.some(al =>
        al.includes(normalizeName(g.group)) || g.meds.some(m => al.includes(normalizeName(m)))
      );
      if (allergyMentioned) alerts.push({ med, member, allergy: g.group });
    });
  });
  return alerts;
}

function checkContraindications() {
  const alerts = [];
  appData.medications.forEach(med => {
    const member = getMember(med.memberId);
    const chronic = (member.chronic || "").split(/[,،]/).map(s => normalizeName(s)).filter(Boolean);
    if (chronic.length === 0) return;
    const n = normalizeName(med.name);
    CONTRAINDICATIONS.forEach(([drug, disease, advice]) => {
      const nd = normalizeName(drug), ndis = normalizeName(disease);
      if ((n.includes(nd) || nd.includes(n)) && chronic.some(c => c.includes(ndis) || ndis.includes(c))) {
        alerts.push({ med, member, disease, advice });
      }
    });
  });
  return alerts;
}

function checkFoodInteractions() {
  const alerts = [];
  appData.medications.forEach(med => {
    const n = normalizeName(med.name);
    FOOD_INTERACTIONS.forEach(([drug, food, sev, advice]) => {
      const nd = normalizeName(drug);
      if (n.includes(nd) || nd.includes(n)) {
        alerts.push({ med, food, sev, advice });
      }
    });
  });
  return alerts;
}

function checkExpiry() {
  const alerts = [];
  const today = new Date();
  appData.medications.forEach(med => {
    if (!med.expiry) return;
    const exp = new Date(med.expiry + "T00:00:00");
    if (isNaN(exp)) return;
    const daysLeft = Math.ceil((exp - today) / 86400000);
    if (daysLeft < 0) {
      alerts.push({ med, daysLeft, expired: true });
    } else if (daysLeft <= 30) {
      alerts.push({ med, daysLeft, expired: false });
    }
  });
  return alerts;
}

function checkSafety() {
  const container = document.getElementById("safetyAlerts");
  if (!container) return;
  const allergyAlerts = checkAllergies();
  const contraAlerts = checkContraindications();
  const foodAlerts = checkFoodInteractions();
  const expiryAlerts = checkExpiry();
  const all = [
    ...allergyAlerts.map(a => ({ icon: "🚨", title: `حساسية محتملة: ${a.med.name}`, detail: `${a.member.name} لديه حساسية من "${a.allergy}"`, sev: "خطيرة" })),
    ...contraAlerts.map(a => ({ icon: "⚠️", title: `موانع الاستعمال: ${a.med.name}`, detail: `${a.member.name} يعاني من ${a.disease} — ${a.advice}`, sev: "خطيرة" })),
    ...foodAlerts.map(a => ({ icon: "🍽️", title: `تفاعل مع الطعام: ${a.med.name}`, detail: `${a.food} — ${a.advice}`, sev: a.sev })),
    ...expiryAlerts.map(a => a.expired
      ? { icon: "☠️", title: `دواء منتهي الصلاحية: ${a.med.name}`, detail: `انتهت صلاحيته منذ ${Math.abs(a.daysLeft)} يوم — توقف عن استخدامه فوراً`, sev: "خطيرة" }
      : { icon: "📅", title: `صلاحية قاربت على الانتهاء: ${a.med.name}`, detail: `تبقى ${a.daysLeft} يوم — استبدله قريباً`, sev: "متوسطة" })
  ];
  if (all.length === 0) {
    container.innerHTML = `<div class="interaction-safe">✅ لا توجد تحذيرات سلامة</div>`;
    return;
  }
  container.innerHTML = all.map(a => `
    <div class="interaction-alert">
      <div class="ia-icon">${a.icon}</div>
      <div class="ia-text">
        <strong>${escapeHtml(a.title)}</strong>
        <span>${escapeHtml(a.detail)}</span>
      </div>
    </div>`).join("");
}

/* ---------- حماية الجرعة الزائدة ---------- */
function getTakenCountForMed(medId) {
  const med = appData.medications.find(m => m.id === medId);
  if (!med || !med.log) return 0;
  const dateStr = todayStr();
  return med.times.filter(t => med.log[`${dateStr}_${t}`]).length;
}

function checkMaxDose(med) {
  if (!med) return null;
  const n = normalizeName(med.name);
  for (const [drug, max, unit] of MAX_DAILY_DOSE) {
    const nd = normalizeName(drug);
    if (n.includes(nd) || nd.includes(n)) {
      const doseMatch = (med.dosage || "").match(/(\d+(?:\.\d+)?)/);
      const dosePerTime = doseMatch ? parseFloat(doseMatch[1]) : 0;
      if (dosePerTime > 0) {
        const takenToday = getTakenCountForMed(med.id);
        const total = (takenToday + 1) * dosePerTime;
        if (total > max) return { max, unit, total };
      }
    }
  }
  return null;
}

/* ---------- تأجيل التنبيه ---------- */
let snoozeTimer = null;
function snoozeDose() {
  const alertEl = document.getElementById("doseAlert");
  if (alertEl) alertEl.classList.add("hidden");
  showToast("⏰ سأذكرك بعد 10 دقائق", "success");
  clearTimeout(snoozeTimer);
  snoozeTimer = setTimeout(() => {
    checkDoseAlert();
    speakDoseAlert();
  }, 10 * 60 * 1000);
}

/* ---------- النطق الصوتي ---------- */
function toggleTTS() {
  appData.tts = !appData.tts;
  saveData();
  const sw = document.getElementById("ttsSwitch");
  if (sw) sw.classList.toggle("on", appData.tts);
  showToast(appData.tts ? "🔊 النطق الصوتي مفعّل" : "🔇 النطق الصوتي متوقف", "success");
}

function speakDoseAlert() {
  if (!appData.tts) return;
  if (!("speechSynthesis" in window)) return;
  const nameEl = document.getElementById("alertMedName");
  const detailEl = document.getElementById("alertMedDetail");
  if (!nameEl) return;
  const name = nameEl.textContent.replace("⏰ حان موعد ", "");
  const detail = detailEl ? detailEl.textContent : "";
  const msg = new SpeechSynthesisUtterance(`حان موعد ${name}. ${detail}`);
  msg.lang = "ar-SA";
  msg.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

/* ---------- تذكير تصاعدي ---------- */
let escalateTimer = null;
function startEscalation() {
  clearInterval(escalateTimer);
  escalateTimer = setInterval(() => {
    const alertEl = document.getElementById("doseAlert");
    if (!alertEl || alertEl.classList.contains("hidden")) return;
    const medId = alertEl.dataset.medId;
    const time = alertEl.dataset.time;
    if (!medId || !time) return;
    const med = appData.medications.find(m => m.id === medId);
    if (!med || !med.log) return;
    if (med.log[`${todayStr()}_${time}`]) {
      alertEl.classList.add("hidden");
      return;
    }
    speakDoseAlert();
  }, 5 * 60 * 1000);
}

/* ---------- قفل PIN ---------- */
function togglePin() {
  const sw = document.getElementById("pinSwitch");
  const setup = document.getElementById("pinSetup");
  if (appData.pin) {
    appData.pin = "";
    saveData();
    if (sw) sw.classList.remove("on");
    if (setup) setup.classList.add("hidden");
    showToast("🔓 تم إيقاف قفل التطبيق", "success");
  } else {
    if (setup) setup.classList.toggle("hidden");
  }
}

function savePin() {
  const pin = document.getElementById("pinInput").value.trim();
  if (!/^\d{4}$/.test(pin)) { showToast("أدخل رمزاً من 4 أرقام", "error"); return; }
  appData.pin = pin;
  saveData();
  document.getElementById("pinSetup").classList.add("hidden");
  document.getElementById("pinSwitch").classList.add("on");
  document.getElementById("pinInput").value = "";
  showToast("🔒 تم حفظ رمز القفل", "success");
}

function unlockApp() {
  const pin = document.getElementById("pinUnlock").value.trim();
  if (pin === appData.pin) {
    document.getElementById("pinModal").classList.remove("open");
    document.getElementById("pinUnlock").value = "";
    sessionStorage.setItem("medReminder_unlocked", "1");
  } else {
    showToast("رمز خاطئ — حاول مجدداً", "error");
  }
}

function checkPinLock() {
  if (appData.pin && sessionStorage.getItem("medReminder_unlocked") !== "1") {
    document.getElementById("pinModal").classList.add("open");
  }
}

/* ---------- البطاقة الطبية للطوارئ ---------- */
function showEmergencyCard() {
  const container = document.getElementById("emergencyContent");
  if (!container) return;
  const contacts = appData.contacts || {};
  const cards = appData.family.map(m => `
    <div class="vitals-card" style="text-align:right;">
      <h4 style="margin-bottom:8px;">👤 ${escapeHtml(m.name)}</h4>
      <p style="font-size:0.9rem;margin:4px 0;"><strong>🩸 فصيلة الدم:</strong> ${escapeHtml(m.bloodType || "غير معروف")}</p>
      <p style="font-size:0.9rem;margin:4px 0;"><strong>🚨 الحساسية:</strong> ${escapeHtml(m.allergies || "لا توجد")}</p>
      <p style="font-size:0.9rem;margin:4px 0;"><strong>🏥 الأمراض المزمنة:</strong> ${escapeHtml(m.chronic || "لا توجد")}</p>
      <p style="font-size:0.9rem;margin:4px 0;"><strong>💊 الأدوية الحالية:</strong> ${appData.medications.filter(x => x.memberId === m.id).map(x => escapeHtml(x.name)).join("، ") || "لا توجد"}</p>
    </div>`).join("");
  const contactsHtml = `
    <div class="vitals-card" style="text-align:right;">
      <h4 style="margin-bottom:8px;">📞 جهات الاتصال</h4>
      <p style="font-size:0.9rem;margin:4px 0;"><strong>👨‍⚕️ الطبيب:</strong> ${escapeHtml(contacts.doctor || "غير مسجل")}</p>
      <p style="font-size:0.9rem;margin:4px 0;"><strong>💊 الصيدلية:</strong> ${escapeHtml(contacts.pharmacy || "غير مسجل")}</p>
      <p style="font-size:0.9rem;margin:4px 0;"><strong>🚑 الطوارئ:</strong> ${escapeHtml(contacts.emergency || "غير مسجل")}</p>
    </div>`;
  container.innerHTML = cards + contactsHtml;
  document.getElementById("emergencyModal").classList.add("open");
}

/* ---------- جهات الاتصال ---------- */
function saveContacts() {
  appData.contacts = {
    doctor: document.getElementById("contactDoctor").value.trim(),
    pharmacy: document.getElementById("contactPharmacy").value.trim(),
    emergency: document.getElementById("contactEmergency").value.trim()
  };
  saveData();
  showToast("✓ تم حفظ جهات الاتصال", "success");
}

/* ---------- مواعيد الأطباء ---------- */
function openAppointmentModal() {
  document.getElementById("apptTitle").value = "";
  document.getElementById("apptDate").value = "";
  document.getElementById("apptTime").value = "10:00";
  document.getElementById("apptNote").value = "";
  document.getElementById("appointmentModal").classList.add("open");
}

function saveAppointment() {
  const title = document.getElementById("apptTitle").value.trim();
  const date = document.getElementById("apptDate").value;
  if (!title || !date) { showToast("أدخل الموعد والتاريخ", "error"); return; }
  appData.appointments = appData.appointments || [];
  appData.appointments.push({
    id: uid(),
    title,
    date,
    time: document.getElementById("apptTime").value,
    note: document.getElementById("apptNote").value.trim()
  });
  saveData();
  renderAppointments();
  closeModal("appointmentModal");
  showToast("✓ تم حفظ الموعد", "success");
}

function deleteAppointment(id) {
  appData.appointments = (appData.appointments || []).filter(a => a.id !== id);
  saveData();
  renderAppointments();
  showToast("تم حذف الموعد", "error");
}

function renderAppointments() {
  const container = document.getElementById("appointmentsList");
  if (!container) return;
  const appts = appData.appointments || [];
  if (appts.length === 0) {
    container.innerHTML = `<div class="interaction-safe">لا توجد مواعيد مسجلة</div>`;
    return;
  }
  const today = todayStr();
  const sorted = [...appts].sort((a, b) => a.date.localeCompare(b.date));
  container.innerHTML = sorted.map(a => {
    const isToday = a.date === today;
    const isPast = a.date < today;
    return `
<div class="vitals-card" style="padding:12px 14px;">
        <div class="vitals-header">
          <div>
            <strong>${isToday ? "🔴 " : isPast ? "⚪ " : "🟢 "}${escapeHtml(a.title)}</strong>
            <span>${formatDateArabic(a.date)}${a.time ? " · " + a.time : ""}${a.note ? " · " + escapeHtml(a.note) : ""}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="icon-btn" onclick="openAppointmentMap('${a.title.replace(/'/g, "\\'")}')" title="فتح في خرائط جوجل">📍</button>
            <button class="icon-btn delete" onclick="deleteAppointment('${a.id}')" title="حذف">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

/* ---------- قائمة المشتريات ---------- */
function showShoppingList() {
  const container = document.getElementById("shoppingContent");
  if (!container) return;
  const lowMeds = appData.medications.filter(m =>
    m.quantity !== null && m.quantity !== undefined &&
    m.refill !== null && m.refill !== undefined &&
    m.quantity <= m.refill);
  const expiring = appData.medications.filter(m => {
    if (!m.expiry) return false;
    const days = Math.ceil((new Date(m.expiry + "T00:00:00") - new Date()) / 86400000);
    return days <= 30;
  });
  const items = [];
  lowMeds.forEach(m => {
    const days = daysRemaining(m);
    items.push({ icon: "💊", name: m.name, detail: `الكمية ${m.quantity} — ${days !== null ? "يكفي " + days + " يوم" : "منخفضة"} — اطلب من الصيدلية` });
  });
  expiring.forEach(m => {
    items.push({ icon: "📅", name: m.name, detail: "يقترب من انتهاء الصلاحية — استبدله" });
  });
  if (items.length === 0) {
    container.innerHTML = `<div class="interaction-safe">✅ لا توجد أدوية تحتاج شراء الآن</div>`;
  } else {
    container.innerHTML = items.map(i => `
      <div class="interaction-alert">
        <div class="ia-icon">${i.icon}</div>
        <div class="ia-text">
          <strong>${escapeHtml(i.name)}</strong>
          <span>${escapeHtml(i.detail)}</span>
        </div>
      </div>`).join("");
  }
  document.getElementById("shoppingModal").classList.add("open");
}

/* ---------- تصدير CSV ---------- */
function downloadCSV(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportVitalsCSV() {
  const vitals = appData.vitals || [];
  if (vitals.length === 0) { showToast("لا توجد قياسات للتصدير", "error"); return; }
  const rows = [["التاريخ", "الوقت", "النوع", "القيمة 1", "القيمة 2", "ملاحظة"]];
  vitals.forEach(v => {
    const cfg = VITALS_TYPES[v.type] || { label: v.type };
    rows.push([v.date, v.time || "", cfg.label, v.value1, v.value2 || "", v.note || ""]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadCSV("العلامات-الحيوية.csv", csv);
  showToast("✓ تم تصدير القياسات", "success");
}

function exportSymptomsCSV() {
  const symptoms = appData.symptoms || [];
  if (symptoms.length === 0) { showToast("لا توجد أعراض للتصدير", "error"); return; }
  const sevMap = { light: "خفيف", moderate: "متوسط", severe: "شديد" };
  const rows = [["التاريخ", "الوقت", "العرض", "الشدة", "ملاحظة"]];
  symptoms.forEach(s => {
    rows.push([s.date, s.time || "", s.type, sevMap[s.severity] || s.severity, s.note || ""]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadCSV("الأعراض.csv", csv);
  showToast("✓ تم تصدير الأعراض", "success");
}

/* ---------- خريطة الالتزام (آخر 28 يوم) ---------- */
function renderHeatmap() {
  const container = document.getElementById("heatmap");
  if (!container) return;
  const meds = appData.medications;
  if (meds.length === 0) {
    container.innerHTML = `<div class="interaction-safe">أضف أدوية لعرض خريطة الالتزام</div>`;
    return;
  }
  const days = 28;
  const today = new Date();
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    let taken = 0, total = 0;
    meds.forEach(med => {
      if (!med.log) return;
      med.times.forEach(t => {
        if (med.log[`${dateStr}_${t}`]) taken++;
        total++;
      });
    });
    const pct = total === 0 ? null : taken / total;
    const cls = pct === null ? "empty" : pct === 1 ? "full" : pct >= 0.5 ? "half" : "low";
    const label = d.toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" });
    cells.push(`<div class="hm-cell ${cls}" title="${label}: ${taken}/${total}">${pct === null ? "" : Math.round(pct * 100)}</div>`);
  }
  container.innerHTML = `<div class="hm-grid">${cells.join("")}</div>
    <div class="hm-legend">
      <span><span class="hm-dot full"></span> كامل</span>
      <span><span class="hm-dot half"></span> جزئي</span>
      <span><span class="hm-dot low"></span> قليل</span>
      <span><span class="hm-dot empty"></span> لا جرعات</span>
    </div>`;
}

/* ---------- رسم بياني للعلامات الحيوية ---------- */
function renderVitalsChart() {
  const container = document.getElementById("vitalsChart");
  if (!container) return;
  const vitals = appData.vitals || [];
  const groups = {};
  vitals.forEach(v => { (groups[v.type] = groups[v.type] || []).push(v); });
  const types = Object.keys(groups);
  if (types.length === 0) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = types.map(type => {
    const cfg = VITALS_TYPES[type] || { label: type, unit: "", icon: "📊" };
    const list = groups[type].slice(-14);
    if (list.length < 2) return "";
    const values = list.map(v => Number(v.value1) || 0);
    const max = Math.max(...values) * 1.1;
    const min = Math.min(...values) * 0.9;
    const range = (max - min) || 1;
    const W = 300, H = 80, P = 8;
    const points = values.map((v, i) => {
      const x = P + (i / (values.length - 1)) * (W - 2 * P);
      const y = H - P - ((v - min) / range) * (H - 2 * P);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const lastVal = values[values.length - 1];
    const lastX = P + (values.length - 1) / (values.length - 1) * (W - 2 * P);
    const lastY = H - P - ((lastVal - min) / range) * (H - 2 * P);
    return `
      <div class="vitals-card">
        <div class="vitals-header">
          <h4>📈 ${cfg.icon} ${cfg.label} — آخر ${list.length} قياسات</h4>
        </div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">
          <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="${lastX}" cy="${lastY}" r="3" fill="var(--danger)"/>
        </svg>
        <div style="text-align:center;font-size:0.8rem;color:var(--text-muted);">آخر قيمة: ${lastVal} ${cfg.unit}</div>
      </div>`;
  }).join("");
}

/* ================================================================
   الإصدار 1.3 — السلامة المتقدمة وتجربة المستخدم
   ================================================================ */

/* ---------- تصنيفات الأدوية ---------- */
const CATEGORY_LABELS = {
  heart: "❤️ القلب", diabetes: "🩸 السكري", pain: "💊 مسكنات",
  antibiotic: "🦠 مضاد حيوي", respiratory: "🫁 تنفس", gut: "🫄 هضمي",
  mental: "🧠 نفسي", bone: "🦴 عظام", thyroid: "🦋 غدة درقية",
  skin: "🧴 جلدي", eyes: "👁️ عيون", other: "📦 أخرى"
};

/* ---------- المواد الفعالة (كشف التكرار) ---------- */
// [الاسم التجاري، المادة الفعالة]
const ACTIVE_INGREDIENTS = [
  ["أموكسيسيلين", "أموكسيسيلين"], ["أموكسيل", "أموكسيسيلين"], ["أموكسيلين", "أموكسيسيلين"],
  ["باراسيتامول", "باراسيتامول"], ["بنادول", "باراسيتامول"], ["تايلينول", "باراسيتامول"], ["أدول", "باراسيتامول"], ["ريفانين", "باراسيتامول"],
  ["إيبوبروفين", "إيبوبروفين"], ["بروفين", "إيبوبروفين"], ["أدفيل", "إيبوبروفين"],
  ["أسبرين", "أسبرين"], ["أسبوسيد", "أسبرين"],
  ["ميتفورمين", "ميتفورمين"], ["جلوكوفاج", "ميتفورمين"], ["سيوفور", "ميتفورمين"],
  ["أتورفاستاتين", "أتورفاستاتين"], ["ليبيتور", "أتورفاستاتين"],
  ["أملوديبين", "أملوديبين"], ["نورفاسك", "أملوديبين"],
  ["أوميبرازول", "أوميبرازول"], ["لوسيك", "أوميبرازول"], ["أوميزول", "أوميبرازول"],
  ["سيتالوبرام", "سيتالوبرام"], ["سيبرام", "سيتالوبرام"],
  ["ليفوثيروكسين", "ليفوثيروكسين"], ["ثيروكسين", "ليفوثيروكسين"], ["إيلتروكسين", "ليفوثيروكسين"],
  ["ديكلوفيناك", "ديكلوفيناك"], ["فولتارين", "ديكلوفيناك"], ["كاتافلام", "ديكلوفيناك"],
  ["سيلدينافيل", "سيلدينافيل"], ["فياغرا", "سيلدينافيل"],
  ["أزيثروميسين", "أزيثروميسين"], ["زيثروماكس", "أزيثروميسين"],
  ["سيمفاستاتين", "سيمفاستاتين"], ["زوكور", "سيمفاستاتين"],
  ["بيسوبرولول", "بيسوبرولول"], ["كونكور", "بيسوبرولول"],
  ["فالسارتان", "فالسارتان"], ["ديوفان", "فالسارتان"],
  ["لوسارتان", "لوسارتان"], ["كوزار", "لوسارتان"],
  ["بريدنيزولون", "بريدنيزولون"], ["كورتيزون", "بريدنيزولون"],
  ["ترامادول", "ترامادول"], ["ترامال", "ترامادول"],
  ["كودايين", "كودايين"], ["كودافين", "كودايين"],
  ["نابروكسين", "نابروكسين"], ["نابروسين", "نابروكسين"],
  ["سيليكوكسيب", "سيليكوكسيب"], ["سيليبريكس", "سيليكوكسيب"]
];

/* ---------- تحذيرات الحمل والرضاعة ---------- */
// [الدواء، الحالة، النصيحة]
const PREGNANCY_WARNINGS = [
  ["إيبوبروفين", "pregnant", "ممنوع في الثلث الثالث من الحمل — قد يضر الجنين. استشر الطبيب."],
  ["ديكلوفيناك", "pregnant", "ممنوع في الحمل — قد يضر الجنين. استشر الطبيب."],
  ["نابروكسين", "pregnant", "ممنوع في الحمل — قد يضر الجنين. استشر الطبيب."],
  ["أسبرين", "pregnant", "الأسبرين بجرعات عالية ممنوع في الحمل. استشر الطبيب."],
  ["الوارفارين", "pregnant", "ممنوع تماماً في الحمل — يسبب تشوهات خلقية."],
  ["أميودارون", "pregnant", "ممنوع في الحمل — يضر الغدة الدرقية للجنين."],
  ["ليثيوم", "pregnant", "خطير في الحمل — يسبب تشوهات قلبية. استشر الطبيب."],
  ["ميثوتريكسات", "pregnant", "ممنوع تماماً في الحمل — يسبب تشوهات خطيرة."],
  ["أيزوتريتينوين", "pregnant", "ممنوع تماماً في الحمل — يسبب تشوهات خطيرة."],
  ["فالبروات", "pregnant", "ممنوع في الحمل — يسبب تشوهات عصبية."],
  ["كاربامازيبين", "pregnant", "يسبب تشوهات خلقية — استشر الطبيب قبل الحمل."],
  ["فينيتوين", "pregnant", "يسبب تشوهات خلقية — استشر الطبيب قبل الحمل."],
  ["أتينولول", "pregnant", "قد يبطئ نمو الجنين — استشر الطبيب."],
  ["إينالابريل", "pregnant", "ممنوع في الحمل — يضر كلى الجنين."],
  ["لوسارتان", "pregnant", "ممنوع في الحمل — يضر كلى الجنين."],
  ["فالسارتان", "pregnant", "ممنوع في الحمل — يضر كلى الجنين."],
  ["سبيرونولاكتون", "pregnant", "ممنوع في الحمل — يؤثر على الهرمونات."],
  ["تتراسيكلين", "pregnant", "ممنوع في الحمل — يضر أسنان وعظام الجنين."],
  ["دوكسيسيكلين", "pregnant", "ممنوع في الحمل — يضر أسنان وعظام الجنين."],
  ["سيبروفلوكساسين", "pregnant", "ممنوع في الحمل — يضر غضاريف الجنين."],
  ["إيبوبروفين", "breastfeeding", "ينتقل للحليب بكميات قليلة — استشر الطبيب."],
  ["أسبرين", "breastfeeding", "ممنوع في الرضاعة — خطر متلازمة راي."],
  ["الوارفارين", "breastfeeding", "آمن نسبياً في الرضاعة — استشر الطبيب."],
  ["ليثيوم", "breastfeeding", "ينتقل للحليب بكميات كبيرة — ممنوع."],
  ["تتراسيكلين", "breastfeeding", "ينتقل للحليب — قد يضر أسنان الرضيع."],
  ["سيبروفلوكساسين", "breastfeeding", "ينتقل للحليب — استشر الطبيب."],
  ["ميثوتريكسات", "breastfeeding", "ممنوع تماماً في الرضاعة."]
];

/* ---------- تحذيرات الأطفال وكبار السن ---------- */
// [الدواء، الحالة، النصيحة]
const AGE_WARNINGS = [
  ["أسبرين", "child", "ممنوع للأطفال دون 16 سنة — خطر متلازمة راي الخطيرة."],
  ["إيبوبروفين", "child", "جرعة الأطفال تختلف حسب الوزن — استشر الطبيب."],
  ["ديكلوفيناك", "child", "ممنوع للأطفال دون 14 سنة."],
  ["نابروكسين", "child", "ممنوع للأطفال دون 12 سنة."],
  ["ترامادول", "child", "ممنوع للأطفال دون 12 سنة."],
  ["كودايين", "child", "ممنوع للأطفال دون 12 سنة."],
  ["تتراسيكلين", "child", "ممنوع للأطفال دون 8 سنوات — يضر الأسنان."],
  ["دوكسيسيكلين", "child", "ممنوع للأطفال دون 8 سنوات — يضر الأسنان."],
  ["سيبروفلوكساسين", "child", "ممنوع للأطفال دون 18 سنة — يضر الغضاريف."],
  ["ليفوثيروكسين", "child", "جرعة الأطفال تختلف — استشر الطبيب."],
  ["الوارفارين", "elderly", "كبار السن أكثر عرضة للنزيف — راقب بانتظام."],
  ["إيبوبروفين", "elderly", "كبار السن أكثر عرضة لتأثيرات الكلى والمعدة."],
  ["ديكلوفيناك", "elderly", "كبار السن أكثر عرضة لتأثيرات الكلى والمعدة."],
  ["نابروكسين", "elderly", "كبار السن أكثر عرضة لتأثيرات الكلى والمعدة."],
  ["بريدنيزولون", "elderly", "كبار السن أكثر عرضة لهشاشة العظام وارتفاع السكر."],
  ["أميودارون", "elderly", "كبار السن أكثر عرضة لاضطراب النظم — راقب بانتظام."],
  ["الديجوكسين", "elderly", "كبار السن أكثر عرضة للتسمم بالديجوكسين."],
  ["ميتفورمين", "elderly", "راقب وظائف الكلى عند كبار السن."],
  ["سيلدينافيل", "elderly", "استشر الطبيب — قد يسبب هبوط الضغط عند كبار السن."],
  ["مضادات الهيستامين", "elderly", "قد تسبب تشوشاً وسقوطاً عند كبار السن."]
];

/* ---------- كشف الأدوية المكررة ---------- */
function checkDuplicates() {
  const alerts = [];
  const seen = {};
  appData.medications.forEach(med => {
    const n = normalizeName(med.name);
    let active = null;
    for (const [brand, ing] of ACTIVE_INGREDIENTS) {
      const nb = normalizeName(brand);
      if (n.includes(nb) || nb.includes(n)) { active = ing; break; }
    }
    if (!active) active = n;
    if (seen[active]) {
      alerts.push({ med, other: seen[active], active });
    } else {
      seen[active] = med;
    }
  });
  return alerts;
}

/* ---------- تحذيرات الحمل والرضاعة ---------- */
function checkPregnancy() {
  const alerts = [];
  appData.medications.forEach(med => {
    const member = getMember(med.memberId);
    const n = normalizeName(med.name);
    PREGNANCY_WARNINGS.forEach(([drug, cond, advice]) => {
      const nd = normalizeName(drug);
      if ((n.includes(nd) || nd.includes(n)) && member[cond] === "yes") {
        alerts.push({ med, member, cond, advice });
      }
    });
  });
  return alerts;
}

/* ---------- تحذيرات العمر ---------- */
function checkAgeWarnings() {
  const alerts = [];
  appData.medications.forEach(med => {
    const member = getMember(med.memberId);
    if (!member.age) return;
    const n = normalizeName(med.name);
    const isChild = member.age < 12;
    const isElderly = member.age >= 65;
    if (!isChild && !isElderly) return;
    AGE_WARNINGS.forEach(([drug, cond, advice]) => {
      const nd = normalizeName(drug);
      const matches = (n.includes(nd) || nd.includes(n));
      if (matches && ((cond === "child" && isChild) || (cond === "elderly" && isElderly))) {
        alerts.push({ med, member, advice });
      }
    });
  });
  return alerts;
}

/* ---------- سجل التنبيهات ---------- */
function logAlert(title, detail, sev) {
  appData.alertHistory = appData.alertHistory || [];
  appData.alertHistory.unshift({
    id: uid(),
    date: todayStr(),
    time: nowTime(),
    title,
    detail,
    sev
  });
  if (appData.alertHistory.length > 100) appData.alertHistory.length = 100;
  saveData();
}

function renderAlertHistory() {
  const container = document.getElementById("alertHistoryList");
  if (!container) return;
  const history = appData.alertHistory || [];
  if (history.length === 0) {
    container.innerHTML = `<div class="interaction-safe">لا توجد تنبيهات مسجلة</div>`;
    return;
  }
  container.innerHTML = history.slice(0, 30).map(h => `
    <div class="alert-history-item">
      <div style="flex:1;">
        <strong>${escapeHtml(h.title)}</strong>
        <div style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(h.detail)}</div>
      </div>
      <div class="ah-date">${formatDateArabic(h.date)} ${h.time}</div>
    </div>`).join("");
}

/* ---------- فحص السلامة الموسّع ---------- */
function checkSafety() {
  const container = document.getElementById("safetyAlerts");
  if (!container) return;
  const allergyAlerts = checkAllergies();
  const contraAlerts = checkContraindications();
  const foodAlerts = checkFoodInteractions();
  const expiryAlerts = checkExpiry();
  const dupAlerts = checkDuplicates();
  const pregAlerts = checkPregnancy();
  const ageAlerts = checkAgeWarnings();
  const all = [
    ...dupAlerts.map(a => ({ icon: "🔁", title: `تكرار محتمل: ${a.med.name}`, detail: `نفس المادة الفعالة "${a.active}" موجودة أيضاً في ${a.other.name} — قد يحدث تسمم`, sev: "خطيرة" })),
    ...allergyAlerts.map(a => ({ icon: "🚨", title: `حساسية محتملة: ${a.med.name}`, detail: `${a.member.name} لديه حساسية من "${a.allergy}"`, sev: "خطيرة" })),
    ...contraAlerts.map(a => ({ icon: "⚠️", title: `موانع الاستعمال: ${a.med.name}`, detail: `${a.member.name} يعاني من ${a.disease} — ${a.advice}`, sev: "خطيرة" })),
    ...pregAlerts.map(a => ({ icon: "🤰", title: `تحذير ${a.cond === "pregnant" ? "الحمل" : "الرضاعة"}: ${a.med.name}`, detail: `${a.member.name} — ${a.advice}`, sev: "خطيرة" })),
    ...ageAlerts.map(a => ({ icon: "👶", title: `تحذير العمر: ${a.med.name}`, detail: `${a.member.name} (${a.member.age} سنة) — ${a.advice}`, sev: "متوسطة" })),
    ...foodAlerts.map(a => ({ icon: "🍽️", title: `تفاعل مع الطعام: ${a.med.name}`, detail: `${a.food} — ${a.advice}`, sev: a.sev })),
    ...expiryAlerts.map(a => a.expired
      ? { icon: "☠️", title: `دواء منتهي الصلاحية: ${a.med.name}`, detail: `انتهت صلاحيته منذ ${Math.abs(a.daysLeft)} يوم — توقف عن استخدامه فوراً`, sev: "خطيرة" }
      : { icon: "📅", title: `صلاحية قاربت على الانتهاء: ${a.med.name}`, detail: `تبقى ${a.daysLeft} يوم — استبدله قريباً`, sev: "متوسطة" })
  ];
  if (all.length === 0) {
    container.innerHTML = `<div class="interaction-safe">✅ لا توجد تحذيرات سلامة</div>`;
    return;
  }
  container.innerHTML = all.map(a => `
    <div class="interaction-alert">
      <div class="ia-icon">${a.icon}</div>
      <div class="ia-text">
        <strong>${escapeHtml(a.title)}</strong>
        <span>${escapeHtml(a.detail)}</span>
      </div>
    </div>`).join("");
  // تسجيل التنبيهات الجديدة في السجل
  const todayKey = todayStr();
  all.forEach(a => {
    const exists = (appData.alertHistory || []).some(h => h.title === a.title && h.date === todayKey);
    if (!exists) logAlert(a.title, a.detail, a.sev);
  });
}

/* ---------- أخذ كل الجرعات المستحقة ---------- */
function takeAllDueDoses() {
  const now = timeToMinutes(nowTime());
  const doses = getTodayDoses().filter(d => !d.taken && timeToMinutes(d.time) <= now);
  if (doses.length === 0) { showToast("لا توجد جرعات مستحقة الآن", "error"); return; }
  let count = 0;
  doses.forEach(d => {
    const med = appData.medications.find(m => m.id === d.medId);
    if (med && !checkMaxDose(med)) {
      markDose(d.medId, d.time, todayStr(), true);
      count++;
    }
  });
  showToast(`✅ تم تسجيل ${count} جرعة`, "success");
  renderAll();
}

/* ---------- مشاركة قائمة الأدوية ---------- */
function shareMedList() {
  const meds = appData.medications;
  if (meds.length === 0) { showToast("لا توجد أدوية للمشاركة", "error"); return; }
  let text = "💊 قائمة أدويتي:\n";
  meds.forEach(m => {
    const member = getMember(m.memberId);
    text += `\n• ${m.name} (${m.dosage || "بدون جرعة"}) — ${member.name}\n  ⏰ ${m.times.map(t => formatTimeArabic(t)).join("، ")}`;
    if (m.notes) text += `\n  📝 ${m.notes}`;
  });
  text += "\n\n— من تطبيق تذكير الدواء";
  if (navigator.share) {
    navigator.share({ title: "قائمة الأدوية", text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast("✓ تم نسخ القائمة — ألصقها في واتساب", "success"));
  } else {
    showToast("المشاركة غير مدعومة في هذا المتصفح", "error");
  }
}

/* ---------- شاشة الترحيب ---------- */
function closeOnboarding() {
  document.getElementById("onboardingModal").classList.remove("open");
  localStorage.setItem("medReminder_onboarded", "1");
}

function showOnboarding() {
  if (localStorage.getItem("medReminder_onboarded") !== "1") {
    document.getElementById("onboardingModal").classList.add("open");
  }
}

/* ================================================================
   الإصدار 1.4 — دليل الأدوية الشامل
   ================================================================ */

const PREG_LABELS = {
  A: "A — آمن في الحمل", B: "B — آمن نسبياً", C: "C — يُستخدم بحذر",
  D: "D — يُستخدم إذا فاقت الفائدة الخطر", X: "X — ممنوع تماماً في الحمل", N: "N — غير مصنف"
};

function broadCategory(cat) {
  if (/مسكن|أفيوني|COX|التهاب غير/.test(cat)) return "مسكنات ومضادات التهاب";
  if (/مضاد حيوي|بنسلين|سيفالوسبورين|ماكرولايد|فلوروكينولون|تتراسيكلين|سلفوناميد|أمينوغليكوزيد|لينكوساميد|كاربابينيم|جلايكوببتيد|أوكسازوليدينون|مونوباكتام/.test(cat)) return "مضادات حيوية";
  if (/قلب|كالسيوم|بيتا|أنجيوتنسين|ACE|مدر بول|غليكوسيد|تخثر|صفيحات|ستاتين|كوليسترول|نيترات|نظم القلب|موسع وعائي|ألفا/.test(cat)) return "قلب وأوعية دموية";
  if (/سكر|إنسولين|جلوكوزيداز|بيجوانيد|سلفونيل|ثيازوليدينديون|GLP|SGLT|ميجليتينيد/.test(cat)) return "السكري";
  if (/مضخة البروتون|H2|هضمي|قيء|إسهال|ملين|بروستاغلاندين|قرحة|معوي/.test(cat)) return "الجهاز الهضمي";
  if (/هيستامين|حساسية|لوكوترين|أنفي/.test(cat)) return "الحساسية والأنف";
  if (/موسع قصبي|تنفس|قصبي|استنشاقي/.test(cat)) return "الجهاز التنفسي";
  if (/كورتيكوستيرويد جهازي|ستيرويد جهازي/.test(cat)) return "الكورتيزون الجهازي";
  if (/SSRI|SNRI|اكتئاب|بنزوديازيبين|منوم|ذهان|مزاج|صرع|قلق|عصبي|GABA|سيروتونين/.test(cat)) return "الأعصاب والنفسية";
  if (/درقية|هرمون|استروجين|بروجستين|أندروجيني|إباضة|أروماتاز|نمو|فازوبريسين|ولادة|كظر/.test(cat)) return "الهرمونات والغدد";
  if (/فيتامين|مكمل|معدني|كالسيوم|بوتاسيوم|كهرلي|أحماض دهنية|B12|B9|B1|B7|D نشط/.test(cat)) return "فيتامينات ومكملات";
  if (/علاج كيميائي|أورام|كيميائي|أروماتاز|كيناز|استقلاب/.test(cat)) return "الأورام والعلاج الكيميائي";
  if (/موضعي|جلد|قمل|جرب|ريتينويد|حروق/.test(cat)) return "الجلدية";
  if (/عين|حدقة|دموع/.test(cat)) return "العيون";
  if (/ترياق|تسمم|سموم|طوارئ|إسعاف|أدرينالية|مضاد كوليني|مضاد أفيوني|مضاد بنزوديازيبين/.test(cat)) return "الطوارئ والترياق";
  if (/فيروس|فطريات|طفيليات|ملاريا|سل/.test(cat)) return "مضادات الفيروسات والفطريات";
  if (/منع حمل|رحمي|غرسة|PDE5|تامسولوسين|مختزل/.test(cat)) return "الصحة الجنسية والتنظيم";
  if (/مناعة|روماتيزم|نقرس|بيولوجي|حمض البول/.test(cat)) return "المناعة والروماتيزم";
  if (/هشاشة|بيفوسفونات/.test(cat)) return "العظام والمفاصل";
  return "أخرى";
}

function populateEncyCategories() {
  const sel = document.getElementById("encyCategory");
  if (!sel || sel.options.length > 1) return;
  const cats = {};
  (typeof DRUG_ENCYCLOPEDIA !== "undefined" ? DRUG_ENCYCLOPEDIA : []).forEach(d => { cats[broadCategory(d.cat)] = true; });
  Object.keys(cats).sort((a, b) => a.localeCompare(b, "ar")).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

function renderEncyclopedia() {
  const container = document.getElementById("encyList");
  if (!container) return;
  const q = (document.getElementById("encySearch").value || "").trim();
  const cat = document.getElementById("encyCategory").value;
  let drugs = getFullEncyclopedia();
  if (q) {
    const nq = normalizeName(q);
drugs = drugs.filter(d =>
      normalizeName(d.ar).includes(nq) ||
      normalizeName(d.en).includes(nq) ||
      (Array.isArray(d.brands) && d.brands.some(b => normalizeName(b).includes(nq))));
  }
  if (cat) drugs = drugs.filter(d => broadCategory(d.cat) === cat);
  document.getElementById("encyCount").textContent = `${drugs.length} دواء`;
  if (drugs.length === 0) {
    container.innerHTML = `<div class="interaction-safe">لا توجد نتائج — جرّب البحث عبر الإنترنت بالأسفل</div>`;
    return;
  }
  container.innerHTML = drugs.slice(0, 60).map(d => `
    <div class="vitals-card" style="padding:12px 14px;cursor:pointer;" onclick="showDrugDetails('${d.ar.replace(/'/g, "\\'")}')">
      <div class="vitals-header">
        <div>
          <strong>${escapeHtml(d.ar)}</strong>
          <span style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(d.en)} · ${escapeHtml(d.cat)}</span>
        </div>
        <span style="font-size:0.8rem;color:var(--primary);">التفاصيل ←</span>
      </div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">${escapeHtml(d.uses)}</div>
    </div>`).join("");
}

function showDrugDetails(arName) {
  const d = getFullEncyclopedia().find(x => x.ar === arName);
  if (!d) return;
  document.getElementById("drugDetailTitle").textContent = `💊 ${d.ar}`;
  const preg = PREG_LABELS[d.pregnancy] || d.pregnancy;
  document.getElementById("drugDetailContent").innerHTML = `
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:1.3rem;font-weight:800;">${escapeHtml(d.ar)}</div>
      <div style="color:var(--text-muted);font-size:0.85rem;">${escapeHtml(d.en)}</div>
      <div style="margin-top:6px;"><span class="cat-badge">${escapeHtml(d.cat)}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--primary);background:var(--primary-light);">
      <div class="ia-icon">💊</div>
      <div class="ia-text"><strong>الاستخدامات</strong><span>${escapeHtml(d.uses)}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--accent);">
      <div class="ia-icon">💧</div>
      <div class="ia-text"><strong>الجرعة</strong><span>${escapeHtml(d.dosage)}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--danger);">
      <div class="ia-icon">⚠️</div>
      <div class="ia-text"><strong>الأعراض الجانبية</strong><span>${escapeHtml(d.side)}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--danger);">
      <div class="ia-icon">🚫</div>
      <div class="ia-text"><strong>متى لا يُستخدم</strong><span>${escapeHtml(d.contra)}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--primary);">
      <div class="ia-icon">🤰</div>
      <div class="ia-text"><strong>الحمل والرضاعة</strong><span>${preg}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--primary);">
      <div class="ia-icon">👶</div>
      <div class="ia-text"><strong>الأطفال</strong><span>${escapeHtml(d.children)}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--primary);">
      <div class="ia-icon">👴</div>
      <div class="ia-text"><strong>كبار السن</strong><span>${escapeHtml(d.elderly)}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--danger);">
      <div class="ia-icon">🔗</div>
      <div class="ia-text"><strong>التفاعلات الدوائية</strong><span>${escapeHtml(d.interactions)}</span></div>
    </div>
    <div class="interaction-alert" style="border-color:var(--accent);">
      <div class="ia-icon">🍽️</div>
      <div class="ia-text"><strong>تفاعلات الطعام</strong><span>${escapeHtml(d.food)}</span></div>
    </div>
    ${d.brands && d.brands.length ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;">🏷️ أسماء تجارية: ${d.brands.map(escapeHtml).join("، ")}</div>` : ""}
    ${d.dialects && (d.dialects.eg !== d.ar || d.dialects.gulf !== d.ar || d.dialects.lev !== d.ar) ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">🗣️ أسماء الدواء باللهجات:<br><span>🇪🇬 مصري: ${escapeHtml(d.dialects.eg)}</span> · <span>🇸🇦 خليجي: ${escapeHtml(d.dialects.gulf)}</span> · <span>🇱🇧 شامي: ${escapeHtml(d.dialects.lev)}</span></div>` : ""}
    <button class="btn btn-primary btn-block" onclick="addFromEncyclopedia('${d.ar.replace(/'/g, "\\'")}')" style="margin-top:12px;">➕ إضافة إلى أدويتي</button>
  `;
  document.getElementById("drugDetailModal").classList.add("open");
}

function addFromEncyclopedia(arName) {
  const d = (typeof DRUG_ENCYCLOPEDIA !== "undefined" ? DRUG_ENCYCLOPEDIA : []).find(x => x.ar === arName);
  if (!d) return;
  closeModal("drugDetailModal");
  openMedModal();
  document.getElementById("medName").value = d.ar;
  document.getElementById("medDosage").value = d.dosage.split("(")[0].trim();
  // تعيين التصنيف تلقائياً
  const catMap = {
    "مسكن": "pain", "مضاد حيوي": "antibiotic", "قلب": "heart", "سكري": "diabetes",
    "تنفس": "respiratory", "هضمي": "gut", "نفسي": "mental", "عظام": "bone",
    "غدة درقية": "thyroid", "جلدي": "skin", "عيون": "eyes"
  };
  const catSel = document.getElementById("medCategory");
  for (const [k, v] of Object.entries(catMap)) {
    if (d.cat.includes(k)) { catSel.value = v; break; }
  }
  showToast(`✓ تم تعبئة بيانات ${d.ar} — أكمل المواعيد ثم احفظ`, "success");
}

/* ---------- البحث عبر الإنترنت (OpenFDA) ---------- */
let fdaTimer = null;
function searchFDA() {
  const q = document.getElementById("fdaSearch").value.trim();
  const container = document.getElementById("fdaResults");
  if (!q) { showToast("اكتب اسم الدواء أولاً", "error"); return; }
  container.innerHTML = `<div class="interaction-safe">⏳ جارٍ البحث في قاعدة FDA...</div>`;
  const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(q)}+OR+openfda.generic_name:${encodeURIComponent(q)}&limit=10`;
  fetch(url)
    .then(r => r.json())
    .then(data => {
      const results = data.results || [];
      if (results.length === 0) {
        container.innerHTML = `<div class="interaction-safe">لا توجد نتائج في FDA — تحقق من الاسم أو اكتبه بالإنجليزية</div>`;
        return;
      }
      container.innerHTML = results.map(r => {
        const name = (r.openfda && (r.openfda.brand_name || [])[0]) || (r.openfda && (r.openfda.generic_name || [])[0]) || "دواء";
        const uses = (r.indications_and_usage || [""])[0] || "لا توجد معلومات";
        const warnings = (r.warnings || [""])[0] || "";
        const pregnancy = (r.pregnancy || [""])[0] || "";
        return `
          <div class="vitals-card" style="padding:12px 14px;">
            <div class="vitals-header">
              <div>
                <strong>${escapeHtml(name)}</strong>
                <span style="font-size:0.75rem;color:var(--text-muted);">من قاعدة FDA الأمريكية</span>
              </div>
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">${escapeHtml(uses.slice(0, 200))}</div>
            ${warnings ? `<div style="font-size:0.8rem;color:var(--danger);margin-top:4px;">⚠️ ${escapeHtml(warnings.slice(0, 200))}</div>` : ""}
            ${pregnancy ? `<div style="font-size:0.8rem;color:var(--accent);margin-top:4px;">🤰 ${escapeHtml(pregnancy.slice(0, 150))}</div>` : ""}
          </div>`;
      }).join("");
    })
    .catch(() => {
      container.innerHTML = `<div class="interaction-alert"><div class="ia-icon">📡</div><div class="ia-text"><strong>لا يمكن الاتصال بقاعدة FDA</strong><span>تحقق من اتصالك بالإنترنت أو جرّب لاحقاً</span></div></div>`;
    });
}

/* ---------- التفاعلات الدوائية ---------- */
function checkDrugInteractions(newDrugName) {
  if (typeof DRUG_INTERACTIONS_DB === 'undefined') return;
  const existingNames = appData.medications.map(m => m.name);
  const warnings = [];
  for (const inter of DRUG_INTERACTIONS_DB) {
    const ab = existingNames.some(n => (n.includes(inter.a) || inter.a.includes(n))) && (newDrugName.includes(inter.b) || inter.b.includes(newDrugName));
    const ba = existingNames.some(n => (n.includes(inter.b) || inter.b.includes(n))) && (newDrugName.includes(inter.a) || inter.a.includes(newDrugName));
    if (ab || ba) warnings.push(inter);
  }
  if (warnings.length > 0) {
    showToast(`🚨 ${warnings.length} تفاعل(ات) دوائية خطيرة!`, "error");
    const detail = warnings.map(w => `⚠️ ${w.a} + ${w.b} [${w.severity === 'high' ? 'خطير' : 'متوسط'}]: ${w.effect}\n💡 ${w.advice}`).join('\n\n');
    setTimeout(() => alert(detail), 500);
  }
}

/* ---------- مسح الباركود ---------- */
function scanBarcode() {
  if ('BarcodeDetector' in window) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsinline = true;
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:white;font-size:1.1rem;';
        overlay.innerHTML = '<p>📷 وجه الكاميرا نحو الباركود</p><div id="barcodeVideoWrap"></div><button onclick="this.parentElement.remove();window._barcodeStream&&window._barcodeStream.getTracks().forEach(t=>t.stop())" style="margin-top:16px;padding:10px 20px;border-radius:8px;border:1px solid white;background:transparent;color:white;cursor:pointer;">❌ إلغاء</button>';
        document.body.appendChild(overlay);
        document.getElementById('barcodeVideoWrap').appendChild(video);
        window._barcodeStream = stream;
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] });
        const scan = async () => {
          try {
            if (video.readyState < 2) { requestAnimationFrame(scan); return; }
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              stream.getTracks().forEach(t => t.stop());
              overlay.remove();
              lookupBarcode(barcodes[0].rawValue);
              return;
            }
          } catch(e) {}
          requestAnimationFrame(scan);
        };
        scan();
      })
      .catch(() => promptManualBarcode());
  } else {
    promptManualBarcode();
  }
}

function promptManualBarcode() {
  const code = prompt('أدخل رقم الباركود أو رقم NDC للدواء:');
  if (code && code.trim()) lookupBarcode(code.trim());
}

function lookupBarcode(code) {
  showToast('🔍 جارٍ البحث عن الدواء في FDA...', 'info');
  fetch(`https://api.fda.gov/drug/label.json?search=openfda.product_number:${encodeURIComponent(code)}&limit=3`)
    .then(r => r.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        const name = (r.openfda && (r.openfda.brand_name || [])[0]) ||
                     (r.openfda && (r.openfda.generic_name || [])[0]) || code;
        document.getElementById('medName').value = name;
        const dosage = (r.dosage_and_administration || [""])[0];
        if (dosage) document.getElementById('medDosage').value = dosage.split(/[.\n]/)[0].trim().slice(0, 50);
        showToast(`✓ تم العثور على: ${name}`, 'success');
      } else {
        showToast('لم يتم العثور على الدواء في FDA — أدخل الاسم يدوياً', 'error');
      }
    })
    .catch(() => {
      showToast('خطأ في الاتصال بقاعدة FDA — تحقق من الإنترنت', 'error');
    });
}
/* ============================================================
   الإصدار 1.6 — البحث العكسي + التطعيمات + المساعد الذكي + المشاركة + النسخ السحابي
   ============================================================ */

/* ---------- البحث بالعكس (عرض جانبي ← دواء) ---------- */
function reverseSearch() {
  const q = document.getElementById("reverseInput").value.trim();
  const container = document.getElementById("reverseResults");
  if (!q) { showToast("اكتب العرض الجانبي أو الاستخدام", "error"); return; }
  const ency = (typeof DRUG_ENCYCLOPEDIA !== "undefined" ? DRUG_ENCYCLOPEDIA : []);
  const results = ency.filter(d =>
    (d.side && d.side.includes(q)) ||
    (d.uses && d.uses.includes(q)) ||
    (d.cat && d.cat.includes(q)) ||
    (d.ar && d.ar.includes(q)) ||
    (d.en && d.en.toLowerCase().includes(q.toLowerCase()))
  );
  if (results.length === 0) {
    container.innerHTML = '<div class="interaction-safe">لا توجد نتائج لـ "' + escapeHtml(q) + '" — جرّب: نعاس، غثيان، صداع، حموضة</div>';
    return;
  }
  container.innerHTML = '<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">' + results.length + ' نتيجة لـ "' + escapeHtml(q) + '"</div>' +
    results.slice(0, 30).map(function(d) {
      return '<div class="vitals-card" style="padding:10px 12px;margin-bottom:8px;cursor:pointer;" onclick="showDrugDetails(\'' + d.ar.replace(/'/g, "\\'") + '\')">' +
        '<div style="font-weight:700;">' + escapeHtml(d.ar) + '</div>' +
        '<div style="font-size:0.8rem;color:var(--text-muted);">' + escapeHtml(d.en) + ' · ' + escapeHtml(d.cat) + '</div></div>';
    }).join("");
}

/* ---------- جدول التطعيمات ---------- */
var VACCINE_SCHEDULE = [
  { name: "BCG (الدرن)", when: "عند الولادة", cat: "طفال", notes: "حماية من الدرن الرئوي" },
  { name: "التهاب الكبد B - الجرعة 1", when: "عند الولادة", cat: "طفال", notes: "خلال 24 ساعة من الولادة" },
  { name: "شلل الأطفال الفموي (OPV)", when: "عند الولادة + 2 + 4 + 6 أشهر", cat: "طفال", notes: "4 جرعات فموية" },
  { name: "الثلاثي البكتيري (DTP)", when: "2 + 4 + 6 أشهر + 18 شهراً", cat: "طفال", notes: "الخناق + السعال الديكي + الكزاز" },
  { name: "المكورات الرئوية (PCV)", when: "2 + 4 + 12 شهراً", cat: "طفال", notes: "3 جرعات - التهاب رئوي والتهاب سحايا" },
  { name: "الروتا فيروس", when: "2 + 4 أشهر", cat: "طفال", notes: "لقاح فموي ضد الإسهال الشديد" },
  { name: "المستدمية النزلية (Hib)", when: "2 + 4 + 6 أشهر + 18 شهراً", cat: "طفال", notes: "التهاب السحايا البكتيري" },
  { name: "التهاب الكبد B - الجرعة 3", when: "6 أشهر", cat: "طفال", notes: "إتمام الجرعات الثلاث" },
  { name: "MMR (حصبة + نكاف + حصبة ألمانية)", when: "12 شهراً + 4 سنوات", cat: "طفال", notes: "جرعتان" },
  { name: "الثلاثي البكتيري - تعزيز", when: "4 سنوات", cat: "طفال", notes: "جرعة تعزيزية قبل المدرسة" },
  { name: "الإنفلونزا الموسمية", when: "كل سنة (أكتوبر)", cat: "بالغون", notes: "خصوصاً كبار السن وأصحاب الأمراض المزمنة" },
  { name: "الكزاز والدفتيريا (Tdap)", when: "كل 10 سنوات", cat: "بالغون", notes: "جرعة تعزيزية" },
  { name: "التهاب الكبد B - بالغون", when: "3 جرعات", cat: "بالغون", notes: "لمن لم يتلقه سابقاً" },
  { name: "كوفيد-19", when: "حسب التوصيات", cat: "بالغون", notes: "الجرعات التعزيزية المحدثة" },
  { name: "المكورات الرئوية - كبار السن", when: "بعد 65 سنة", cat: "بالغون", notes: "جرعة واحدة + تعزيز حسب التوصيات" }
];

function renderVaccines() {
  var container = document.getElementById("vaccinesList");
  if (!container) return;
  var taken = (appData.vaccinations || []).map(function(v) { return v.name; });
  var children = [], adults = [];
  VACCINE_SCHEDULE.forEach(function(v) { (v.cat === "طفال" ? children : adults).push(v); });

  function renderGroup(title, icon, list) {
    return '<h4 style="margin-bottom:8px;">' + icon + ' ' + title + '</h4>' +
      list.map(function(v) {
        var isTaken = taken.indexOf(v.name) >= 0;
        return '<div class="vitals-card" style="padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;' + (isTaken ? 'opacity:0.65;' : '') + '">' +
          '<button class="switch ' + (isTaken ? "on" : "") + '" style="flex-shrink:0;" onclick="toggleVaccine(\'' + v.name.replace(/'/g, "\\'") + '\')"></button>' +
          '<div style="flex:1;">' +
          '<div style="font-weight:700;">' + escapeHtml(v.name) + '</div>' +
          '<div style="font-size:0.8rem;color:var(--text-muted);">🕐 ' + escapeHtml(v.when) + '</div>' +
          '<div style="font-size:0.75rem;color:var(--text-muted);">' + escapeHtml(v.notes) + '</div>' +
          '</div></div>';
      }).join("");
  }

  container.innerHTML = renderGroup("تطعيمات الأطفال", "👶", children) +
    '<div style="height:16px;"></div>' +
    renderGroup("تطعيمات البالغين", "🧑", adults);

  var done = taken.length;
  var total = VACCINE_SCHEDULE.length;
  var prog = document.getElementById("vaccineProgress");
  if (prog) prog.textContent = "✅ تم " + done + " من " + total + " تطعيم";
}

function toggleVaccine(name) {
  if (!appData.vaccinations) appData.vaccinations = [];
  var idx = -1;
  for (var i = 0; i < appData.vaccinations.length; i++) {
    if (appData.vaccinations[i].name === name) { idx = i; break; }
  }
  if (idx >= 0) {
    appData.vaccinations.splice(idx, 1);
    showToast("تم إلغاء تسجيل التطعيم", "success");
  } else {
    appData.vaccinations.push({ name: name, date: todayStr() });
    showToast("✓ تم تسجيل التطعيم", "success");
  }
  saveData();
  renderVaccines();
}

/* ---------- المساعد الذكي ---------- */
function askAssistant() {
  var q = document.getElementById("assistantInput").value.trim();
  var container = document.getElementById("assistantResponse");
  if (!q) { showToast("اكتب سؤالك عن أي دواء", "error"); return; }

  var ency = (typeof DRUG_ENCYCLOPEDIA !== "undefined" ? DRUG_ENCYCLOPEDIA : []);
  var ints = (typeof DRUG_INTERACTIONS_DB !== "undefined" ? DRUG_INTERACTIONS_DB : []);
  var builtIn = (typeof DRUG_INTERACTIONS !== "undefined" ? DRUG_INTERACTIONS : []);
  var answer = "";

  function findDrug(name) {
    for (var i = 0; i < ency.length; i++) {
      if (ency[i].ar.indexOf(name) !== -1 || ency[i].en.toLowerCase().indexOf(name.toLowerCase()) !== -1) {
        return ency[i];
      }
    }
    return null;
  }
  function drugFullInfo(match) {
    var a = '<div style="border-right:3px solid var(--primary);padding-right:10px;margin-bottom:8px;">' +
      '<strong style="font-size:1.1rem;">' + escapeHtml(match.ar) + '</strong> (' + escapeHtml(match.en) + ')<br>' +
      '<span class="cat-badge">' + escapeHtml(match.cat) + '</span></div>' +
      '<strong>💊 الاستخدامات:</strong> ' + escapeHtml(match.uses) + '<br>' +
      '<strong>💧 الجرعة:</strong> ' + escapeHtml(match.dosage) + '<br>' +
      '<strong>⚠️ الأعراض الجانبية:</strong> ' + escapeHtml(match.side) + '<br>' +
      '<strong>🚫 موانع الاستخدام:</strong> ' + escapeHtml(match.contra) + '<br>' +
      '<strong>🤰 الحمل والرضاعة:</strong> ' + escapeHtml(match.pregnancy) + '<br>' +
      '<strong>👶 الأطفال:</strong> ' + escapeHtml(match.children) + '<br>' +
      '<strong>👴 كبار السن:</strong> ' + escapeHtml(match.elderly) + '<br>' +
      '<strong>🔗 التفاعلات:</strong> ' + escapeHtml(match.interactions) + '<br>' +
      '<strong>🍽️ الطعام:</strong> ' + escapeHtml(match.food);
    if (match.brands && match.brands.length) {
      a += '<br><strong>🏷️ أسماء تجارية:</strong> ' + match.brands.map(escapeHtml).join(", ");
    }
    return a;
  }

  /* 1) تحية / مساعدة */
  if (q.indexOf("مرحبا") !== -1 || q.indexOf("السلام") !== -1 || q.indexOf("اهلا") !== -1 || q === "help" || q === "مساعدة") {
    answer = "أهلاً بك! 👋 أنا مساعدك الذكي للأدوية. يمكنك أن تسألني:<br>" +
      "• <strong>ما هو دواء X؟</strong> — معلومات كاملة عن أي دواء<br>" +
      "• <strong>X مع Y؟</strong> — فحص التفاعلات بين دواءين<br>" +
      "• <strong>هل X آمن للحامل؟</strong> — فحص الحمل والرضاعة<br>" +
      "• <strong>ماذا آخذ لصداع؟</strong> — اقتراحات حسب العرض<br>" +
      "• <strong>جرعة X؟</strong> — الجرعة الموصى بها<br>" +
      "• <strong>بديل لـ X؟</strong> — أدوية بديلة من نفس التصنيف<br>" +
      "• <strong>X للأطفال؟</strong> — مدى أمانه للأطفال أو كبار السن";
  }
  /* 2) فحص الحمل */
  else if (q.indexOf("حامل") !== -1 || q.indexOf("حمل") !== -1 || q.indexOf("رضاع") !== -1) {
    var pregQ = q.replace(/هل/, "").replace(/آمن/, "").replace(/في الحمل/, "").replace(/للحامل/, "").replace(/أثناء/, "").replace(/والرضاعة/, "").replace(/الرضاعة/, "").replace(/\?/g, "").trim();
    var pm = findDrug(pregQ);
    if (pm) {
var code = (pm.pregnancy || "N").charAt(0);
      var verdict = "";
      if (code === "A" || code === "B") verdict = "🟢 آمن نسبياً في الحمل (تصنيف " + code + ") — لكن استشيري طبيبك دائماً.";
      else if (code === "C") verdict = "🟡 يُستخدم بحذر في الحمل (تصنيف C) — فقط إذا كانت الفائدة أكبر من الخطر وبإشراف الطبيب.";
      else if (code === "D") verdict = "🔴 دليل على خطر على الجنين (تصنيف D) — يُمنع إلا في حالات استثنائية بإشراف طبي صارم.";
      else if (code === "X") verdict = "⛔ ممنوع تماماً في الحمل (تصنيف X) — خطر مؤكد على الجنين.";
      else if (code === "N") verdict = "⚪ غير مصنف (N) — لا توجد دراسات كافية عن أمانه في الحمل، يُنصح بتجنبه أو استشارة الطبيب.";
      else verdict = "⚠️ لا توجد بيانات كافية — استشيري طبيبك.";
      answer = "<strong>" + escapeHtml(pm.ar) + " — الحمل والرضاعة:</strong><br>" + verdict + "<br><br>📋 التفاصيل: " + escapeHtml(pm.pregnancy);
    } else {
      answer = "لم أجد الدواء المطلوب. جرّب كتابة الاسم كاملاً بالعربية أو الإنجليزية.";
    }
  }
  /* 3) بديل لدواء */
  else if (q.indexOf("بديل") !== -1 || q.indexOf("بديلي") !== -1 || q.indexOf("مثيل") !== -1) {
    var altQ = q.replace(/بديل لـ/, "").replace(/بديل/, "").replace(/مثيل/, "").replace(/\?/g, "").trim();
    var am = findDrug(altQ);
    if (am) {
      var alts = ency.filter(function(d) { return d.cat === am.cat && d.ar !== am.ar; }).slice(0, 8);
      if (alts.length > 0) {
        answer = "<strong>💊 بدائل " + escapeHtml(am.ar) + " (تصنيف: " + escapeHtml(am.cat) + "):</strong><br>" +
          alts.map(function(d) { return "• <strong>" + escapeHtml(d.ar) + "</strong> (" + escapeHtml(d.en) + ") — " + escapeHtml(d.uses).split(",")[0]; }).join("<br>") +
          "<br><br>⚠️ لا تستبدل دواءً بنفسك — استشر طبيبك أو الصيدلاني أولاً.";
      } else {
        answer = "لا توجد بدائل مسجلة في قاعدة البيانات لـ " + escapeHtml(am.ar) + ".";
      }
    } else {
      answer = "لم أجد الدواء المطلوب للبحث عن بديل.";
    }
  }
  /* 4) جرعة دواء */
  else if (q.indexOf("جرعة") !== -1 || q.indexOf("الجرعة") !== -1 || q.indexOf("كم آخذ") !== -1) {
    var doseQ = q.replace(/ما هي جرعة/, "").replace(/جرعة/, "").replace(/الجرعة/, "").replace(/كم آخذ من/, "").replace(/\?/g, "").trim();
    var dm = findDrug(doseQ);
    if (dm) {
      answer = "<strong>💧 جرعة " + escapeHtml(dm.ar) + ":</strong><br>" + escapeHtml(dm.dosage) +
        "<br><br>⚠️ الجرعة قد تختلف حسب العمر والحالة — التزم بوصفة طبيبك.";
    } else {
      answer = "لم أجد الدواء المطلوب. جرّب كتابة الاسم كاملاً.";
    }
  }
  /* 5) دواء مع الطعام */
  else if (q.indexOf("طعام") !== -1 || q.indexOf("اكل") !== -1 || q.indexOf("أكل") !== -1 || q.indexOf("معدة") !== -1) {
    var foodQ = q.replace(/مع الطعام/, "").replace(/على معدة/, "").replace(/الطعام/, "").replace(/\?/g, "").trim();
    var fm = findDrug(foodQ);
    if (fm) {
      answer = "<strong>🍽️ " + escapeHtml(fm.ar) + " والطعام:</strong><br>" + escapeHtml(fm.food);
    } else {
      answer = "لم أجد الدواء المطلوب.";
    }
  }
  /* 6) دواء للأطفال أو كبار السن */
  else if (q.indexOf("طفل") !== -1 || q.indexOf("أطفال") !== -1 || q.indexOf("اطفال") !== -1 || q.indexOf("كبار") !== -1 || q.indexOf("مسن") !== -1) {
    var ageQ = q.replace(/هل/, "").replace(/آمن/, "").replace(/للأطفال/, "").replace(/للاطفال/, "").replace(/للطفل/, "").replace(/لكبار السن/, "").replace(/لكبار/, "").replace(/\?/g, "").trim();
    var agem = findDrug(ageQ);
    if (agem) {
      var isChild = q.indexOf("طفل") !== -1 || q.indexOf("أطفال") !== -1 || q.indexOf("اطفال") !== -1;
      answer = "<strong>" + escapeHtml(agem.ar) + (isChild ? " — للأطفال:</strong><br>" : " — لكبار السن:</strong><br>") +
        (isChild ? escapeHtml(agem.children) : escapeHtml(agem.elderly));
    } else {
      answer = "لم أجد الدواء المطلوب.";
    }
  }
/* 7) ماذا آخذ لـ (عرض) */
  else if (q.indexOf("ماذا آخذ") !== -1 || q.indexOf("ماذا اخذ") !== -1 || q.indexOf("دواء لـ") !== -1 || q.indexOf("دواء ل") !== -1 || q.indexOf("علاج لـ") !== -1 || q.indexOf("علاج ل") !== -1 || q.indexOf("ما هو علاج") !== -1) {
    var symQ = q.replace(/ماذا آخذ لـ/, "").replace(/ماذا اخذ لـ/, "").replace(/ماذا آخذ/, "").replace(/دواء لـ/, "").replace(/دواء ل/, "").replace(/علاج لـ/, "").replace(/علاج ل/, "").replace(/ما هو علاج/, "").replace(/\?/g, "").trim();
    var symCheck = symptomChecker(symQ);
    if (symCheck) {
      answer = symCheck;
    } else {
      var symHits = ency.filter(function(d) {
        return (d.uses && d.uses.indexOf(symQ) !== -1) || (d.cat && d.cat.indexOf(symQ) !== -1);
      });
      if (symHits.length > 0) {
        answer = '<strong>🔎 أدوية مفيدة لـ "' + escapeHtml(symQ) + '" (' + symHits.length + ' نتيجة):</strong><br>' +
          symHits.slice(0, 10).map(function(d) {
            return '• <strong>' + escapeHtml(d.ar) + '</strong> — ' + escapeHtml(d.uses).split(",")[0];
          }).join("<br>") +
          "<br><br>⚠️ هذه معلومات عامة — التشخيص والعلاج من اختصاص الطبيب.";
      } else {
        answer = "لم أجد أدوية مرتبطة بـ \"" + escapeHtml(symQ) + "\" في قاعدة البيانات.";
      }
    }
  }
  /* 8) فحص التفاعلات */
  else if (q.indexOf("+") !== -1 || q.indexOf("مع") !== -1 || q.indexOf("متعارض") !== -1 || q.indexOf("تفاعل") !== -1) {
    var parts = q.replace(/\+/g, " ").replace(/هل يتعارض/, " ").replace(/هل يتفاعل/, " ").replace(/متعارض/, " ").replace(/تفاعل/, " ").replace(/مع/, " ").replace(/\?/g, "").split(/\s{2,}/);
    var drug1 = parts[0].trim(), drug2 = (parts[1] || "").trim();
    var found = [];
    for (var j = 0; j < ints.length; j++) {
      if ((ints[j].a.indexOf(drug1) !== -1 && ints[j].b.indexOf(drug2) !== -1) ||
          (ints[j].b.indexOf(drug1) !== -1 && ints[j].a.indexOf(drug2) !== -1)) {
        found.push(ints[j]);
      }
    }
    if (found.length === 0 && builtIn.length) {
      for (var b = 0; b < builtIn.length; b++) {
        if ((builtIn[b][0].indexOf(drug1) !== -1 && builtIn[b][1].indexOf(drug2) !== -1) ||
            (builtIn[b][1].indexOf(drug1) !== -1 && builtIn[b][0].indexOf(drug2) !== -1)) {
          found.push({ a: builtIn[b][0], b: builtIn[b][1], severity: "high", effect: builtIn[b][2], advice: builtIn[b][3] });
        }
      }
    }
    if (found.length > 0) {
      answer = "<strong>⚠️ تفاعلات مكتشفة بين " + escapeHtml(drug1) + " و " + escapeHtml(drug2) + ":</strong><br>" +
        found.map(function(f) {
          var sev = f.severity === "high" ? "🔴 خطير" : "🟡 متوسط";
          return sev + ": " + escapeHtml(f.effect) + "<br>💡 " + escapeHtml(f.advice);
        }).join("<br><br>");
    } else {
      answer = "لم يتم اكتشاف تفاعلات معروفة بين " + escapeHtml(drug1) + " و " + escapeHtml(drug2) + ". لكن يُنصح دائماً باستشارة الطبيب أو الصيدلاني.";
    }
  }
  /* 9) بحث عن دواء */
  else {
    var match = null;
    for (var k = 0; k < ency.length; k++) {
      if (ency[k].ar.indexOf(q) !== -1 || ency[k].en.toLowerCase().indexOf(q.toLowerCase()) !== -1) {
        match = ency[k]; break;
      }
    }
if (match) {
      answer = drugFullInfo(match);
    } else {
      var symCheck2 = symptomChecker(q);
      if (symCheck2) {
        answer = symCheck2;
      } else {
        var broad = ency.filter(function(d) {
          return (d.side && d.side.indexOf(q) !== -1) ||
                 (d.uses && d.uses.indexOf(q) !== -1) ||
                 (d.cat && d.cat.indexOf(q) !== -1);
        });
        if (broad.length > 0) {
          answer = '<strong>🔎 أدوية مرتبطة بـ "' + escapeHtml(q) + '" (' + broad.length + ' نتيجة):</strong><br>' +
            broad.slice(0, 10).map(function(d) {
              return '• <strong>' + escapeHtml(d.ar) + '</strong> — ' + escapeHtml(d.uses).split(",")[0];
            }).join("<br>");
        } else {
          answer = "لم أجد معلومات عن \"" + escapeHtml(q) + "\" في قاعدة البيانات. جرّب كتابة الاسم بالعربية أو الإنجليزية.";
        }
      }
    }
  }
  container.innerHTML = '<div class="interaction-alert" style="border-color:var(--primary);background:var(--primary-light);">' +
    '<div class="ia-icon">🤖</div>' +
    '<div class="ia-text" style="white-space:normal;line-height:1.8;">' + answer + '</div></div>';
}
/* ---------- المشاركة عبر واتساب / تيليجرام ---------- */
function shareToWhatsApp(text) {
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
}
function shareToTelegram(text) {
  window.open("https://t.me/share/url?text=" + encodeURIComponent(text), "_blank");
}
function shareMedication(medId) {
  var med = appData.medications.find(function(m) { return m.id === medId; });
  if (!med) return;
  var txt = "💊 " + med.name + "\n";
  if (med.dosage) txt += "💧 الجرعة: " + med.dosage + "\n";
  if (med.times && med.times.length) txt += "⏰ المواعيد: " + med.times.join(", ") + "\n";
  if (med.notes) txt += "📝 ملاحظات: " + med.notes + "\n";
  txt += "\n— من تطبيق تذكير الدواء";
  shareToWhatsApp(txt);
}
function shareDailySummary() {
  var doses = getTodayDoses();
  var txt = "📋 ملخص جرعات اليوم (" + todayStr() + "):\n";
  doses.forEach(function(d) {
    txt += (d.taken ? "✅" : "⬜") + " " + d.medName + " — " + formatTimeArabic(d.time) + "\n";
  });
  var total = doses.length;
  var taken = doses.filter(function(d) { return d.taken; }).length;
  txt += "\n📊 التقدم: " + taken + "/" + total + " جرعة";
  shareToWhatsApp(txt);
}

/* ---------- نسخ احتياطي بالكود ---------- */
function generateBackupCode() {
  try {
    var raw = JSON.stringify(appData);
    var code = btoa(unescape(encodeURIComponent(raw)));
    var el = document.getElementById("backupCode");
    if (el) { el.value = code; el.style.display = "block"; }
    showToast("✓ تم إنشاء كود النسخ الاحتياطي — انسخه واحفظه في مكان آمن", "success");
  } catch (e) {
    showToast("خطأ في إنشاء الكود", "error");
  }
}
function copyBackupCode() {
  var el = document.getElementById("backupCode");
  if (!el) return;
  el.select();
  document.execCommand("copy");
  showToast("✓ تم نسخ الكود", "success");
}
function restoreFromBackupCode() {
  var code = document.getElementById("restoreCode").value.trim();
  if (!code) { showToast("الصق كود الاسترداد أولاً", "error"); return; }
  try {
    var raw = decodeURIComponent(escape(atob(code)));
    var data = JSON.parse(raw);
    if (!data.medications) throw new Error("صيغة غير صحيحة");
appData = {
      medications: data.medications || [],
      family: data.family || [],
      settings: data.settings || { notifications: false },
      vaccinations: data.vaccinations || [],
      contacts: data.contacts || {},
      emergency: data.emergency || { allergies: "", chronic: "", bloodType: "", emergencyContact: "", insurance: "", notes: "" },
      bpReadings: data.bpReadings || [],
      symptomMeds: data.symptomMeds || []
    };
    saveData();
    populateFamilySelect();
    renderAll();
    showToast("✓ تمت استعادة البيانات بنجاح", "success");
  } catch (e) {
    showToast("كود غير صالح — تأكد من النسخ الكامل", "error");
  }
}

/* ---------- مشاركة مواعيد الأدوية ---------- */
function shareMedicationList() {
  var meds = appData.medications.filter(function(m) { return m.active; });
  if (meds.length === 0) { showToast("لا توجد أدوية نشطة للمشاركة", "error"); return; }
  var txt = "📋 قائمة أدويتي:\n\n";
  meds.forEach(function(m) {
    txt += "💊 " + m.name;
    if (m.dosage) txt += " — " + m.dosage;
    if (m.times && m.times.length) txt += "\n   ⏰ " + m.times.join(", ");
    txt += "\n";
  });
  txt += "\n— من تطبيق تذكير الدواء";
  shareToWhatsApp(txt);
}

/* ---------- رابط واتساب للتذكير اليومي ---------- */
function openWhatsAppReminder() {
  var doses = getTodayDoses();
  if (doses.length === 0) { showToast("لا توجد جرعات اليوم", "error"); return; }
  var txt = "⏰ تذكير جرعات اليوم:\n";
  doses.forEach(function(d) {
    txt += (d.taken ? "✅" : "⬜") + " " + d.medName + " @ " + d.time;
    if (d.taken) txt += " [تم taken]";
    txt += "\n";
  });
  shareToWhatsApp(txt);
}

/* ---------- ترتيب تطعيمات الأطفال حسب العمر (تابع) ---------- */
function getVaccineStatus(name) {
  var taken = appData.vaccinations || [];
  for (var i = 0; i < taken.length; i++) {
    if (taken[i].name === name) return true;
  }
  return false;
}

/* ---------- مزامنة WebDAV السحابية ---------- */
function webdavGetCredentials() {
  var url = document.getElementById("webdavUrl").value.trim();
  var user = document.getElementById("webdavUser").value.trim();
  var pass = document.getElementById("webdavPass").value;
  if (!url || !user || !pass) {
    showToast("أكمل جميع حقول WebDAV (الرابط + المستخدم + كلمة المرور)", "error");
    return null;
  }
  return { url: url, auth: "Basic " + btoa(user + ":" + pass) };
}

function webdavSave() {
  var creds = webdavGetCredentials();
  if (!creds) return;
  var status = document.getElementById("webdavStatus");
  if (status) status.textContent = "⏳ جاري الرفع...";
  fetch(creds.url, {
    method: "PUT",
    headers: { "Authorization": creds.auth, "Content-Type": "application/json" },
    body: JSON.stringify(appData)
  }).then(function(r) {
    if (r.ok || r.status === 201 || r.status === 204) {
      if (status) status.textContent = "✅ تم الرفع بنجاح — " + new Date().toLocaleTimeString("ar-EG");
      showToast("✓ تم رفع البيانات إلى السحابة", "success");
    } else {
      throw new Error("HTTP " + r.status);
    }
  }).catch(function(e) {
    if (status) status.textContent = "❌ فشل الرفع: " + e.message;
    showToast("فشل الرفع — تحقق من الرابط والبيانات", "error");
  });
}

function webdavLoad() {
  var creds = webdavGetCredentials();
  if (!creds) return;
  var status = document.getElementById("webdavStatus");
  if (status) status.textContent = "⏳ جاري التنزيل...";
  fetch(creds.url, {
    method: "GET",
    headers: { "Authorization": creds.auth }
  }).then(function(r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }).then(function(data) {
    if (!data || !data.medications) throw new Error("صيغة البيانات غير صحيحة");
    appData = {
      medications: data.medications || [],
      family: data.family || [],
      settings: data.settings || { notifications: false },
      vitals: data.vitals || [],
      symptoms: data.symptoms || [],
      appointments: data.appointments || [],
      contacts: data.contacts || { doctor: "", pharmacy: "", emergency: "" },
      vaccinations: data.vaccinations || [],
      pin: data.pin || "",
      tts: data.tts || false,
      alertHistory: data.alertHistory || []
    };
    saveData();
    loadData();
    populateFamilySelect();
    renderAll();
    if (status) status.textContent = "✅ تم التنزيل بنجاح — " + new Date().toLocaleTimeString("ar-EG");
    showToast("✓ تم تنزيل البيانات من السحابة", "success");
  }).catch(function(e) {
    if (status) status.textContent = "❌ فشل التنزيل: " + e.message;
    showToast("فشل التنزيل — تحقق من الرابط والبيانات", "error");
  });
}

function webdavTest() {
  var creds = webdavGetCredentials();
  if (!creds) return;
  var status = document.getElementById("webdavStatus");
  if (status) status.textContent = "⏳ جاري اختبار الاتصال...";
  fetch(creds.url, {
    method: "HEAD",
    headers: { "Authorization": creds.auth }
  }).then(function(r) {
    if (r.ok || r.status === 404) {
      if (status) status.textContent = "✅ الاتصال ناجح — السحابة تعمل (status " + r.status + ")";
      showToast("✓ الاتصال ناجح", "success");
    } else {
      throw new Error("HTTP " + r.status);
    }
  }).catch(function(e) {
    if (status) status.textContent = "❌ فشل الاتصال: " + e.message;
    showToast("فشل الاتصال — تحقق من الرابط والبيانات", "error");
  });
}

/* ---------- حفظ/WebDAV في الإعدادات عند التحميل ---------- */
function loadWebdavSettings() {
  try {
    var s = JSON.parse(localStorage.getItem(STORAGE_KEY + "_webdav") || "{}");
    var u = document.getElementById("webdavUrl");
    var user = document.getElementById("webdavUser");
    var p = document.getElementById("webdavPass");
    if (u) u.value = s.url || "";
    if (user) user.value = s.user || "";
    if (p) p.value = s.pass || "";
  } catch (e) {}
}
function saveWebdavSettings() {
  var s = {
    url: (document.getElementById("webdavUrl") || {}).value || "",
    user: (document.getElementById("webdavUser") || {}).value || "",
    pass: (document.getElementById("webdavPass") || {}).value || ""
  };
  localStorage.setItem(STORAGE_KEY + "_webdav", JSON.stringify(s));
}
/* ============================================================
   الإصدار 1.8 — ICS + تشفير WebDAV + رسم التفاعلات + صوت + رمضان + سفر + تحليلات + أعشاب + دواء مخصص
   ============================================================ */

/* ---------- تصدير ICS للتقويم ---------- */
function exportICS() {
  var meds = appData.medications.filter(function(m) { return m.active; });
  if (meds.length === 0) { showToast("لا توجد أدوية نشطة للتصدير", "error"); return; }
  function fmtICS(d) { return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"; }
  var ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MedReminder//AR//\r\nCALSCALE:GREGORIAN\r\n";
  meds.forEach(function(med) {
    med.times.forEach(function(t) {
      var parts = t.split(":");
      var h = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
      var start = new Date(); start.setHours(h, m, 0, 0);
      var end = new Date(start.getTime() + 30 * 60000);
      ics += "BEGIN:VEVENT\r\n";
      ics += "UID:" + med.id + "-" + t + "@medreminder\r\n";
      ics += "SUMMARY:" + med.name + "\r\n";
      ics += "DTSTART:" + fmtICS(start) + "\r\n";
      ics += "DTEND:" + fmtICS(end) + "\r\n";
      ics += "RRULE:FREQ=DAILY\r\n";
      ics += "DESCRIPTION:جرعة " + med.name + (med.dosage ? " - " + med.dosage : "") + "\r\n";
      ics += "END:VEVENT\r\n";
    });
  });
  ics += "END:VCALENDAR\r\n";
  var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "مواعيد-الأدوية.ics";
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  showToast("✓ تم تصدير مواعيد الأدوية — افتح الملف في أي تقويم", "success");
}

/* ---------- تشفير WebDAV (AES-GCM عبر WebCrypto) ---------- */
async function webdavEncryptData(data, passphrase) {
  var enc = new TextEncoder();
  var keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  var key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("med-reminder-salt-v1"), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(JSON.stringify(data)));
  function b64(buf) {
    var bytes = new Uint8Array(buf);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  return b64(iv) + ":" + b64(cipher);
}
async function webdavDecryptData(payload, passphrase) {
  var enc = new TextEncoder();
  var parts = payload.split(":");
  if (parts.length !== 2) throw new Error("صيغة مشفرة غير صحيحة");
  function unb64(s) {
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  var iv = unb64(parts[0]);
  var cipher = unb64(parts[1]);
  var keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  var key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("med-reminder-salt-v1"), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}

/* WebDAV مع تشفير اختياري */
function webdavGetPassphrase() {
  var el = document.getElementById("webdavEncPass");
  return el ? el.value.trim() : "";
}
function webdavSave() {
  var creds = webdavGetCredentials();
  if (!creds) return;
  var status = document.getElementById("webdavStatus");
  var pass = webdavGetPassphrase();
  if (status) status.textContent = "⏳ جاري الرفع" + (pass ? " (مشفر)..." : "...");
  var body = JSON.stringify(appData);
  var doPut = function(finalBody) {
    fetch(creds.url, {
      method: "PUT",
      headers: { "Authorization": creds.auth, "Content-Type": "application/json" },
      body: finalBody
    }).then(function(r) {
      if (r.ok || r.status === 201 || r.status === 204) {
        if (status) status.textContent = "✅ تم الرفع" + (pass ? " مشفراً" : "") + " — " + new Date().toLocaleTimeString("ar-EG");
        showToast("✓ تم رفع البيانات إلى السحابة", "success");
      } else { throw new Error("HTTP " + r.status); }
    }).catch(function(e) {
      if (status) status.textContent = "❌ فشل الرفع: " + e.message;
      showToast("فشل الرفع — تحقق من الرابط والبيانات", "error");
    });
  };
  if (pass) {
    webdavEncryptData(appData, pass).then(function(enc) {
      doPut(JSON.stringify({ enc: true, payload: enc }));
    }).catch(function() { showToast("فشل التشفير", "error"); });
  } else {
    doPut(body);
  }
}
function webdavLoad() {
  var creds = webdavGetCredentials();
  if (!creds) return;
  var status = document.getElementById("webdavStatus");
  var pass = webdavGetPassphrase();
  if (status) status.textContent = "⏳ جاري التنزيل...";
  fetch(creds.url, { method: "GET", headers: { "Authorization": creds.auth } })
    .then(function(r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function(data) {
      var applyData = function(d) {
        if (!d || !d.medications) throw new Error("صيغة البيانات غير صحيحة");
appData = {
          medications: d.medications || [], family: d.family || [],
          settings: d.settings || { notifications: false }, vitals: d.vitals || [],
          symptoms: d.symptoms || [], appointments: d.appointments || [],
          contacts: d.contacts || { doctor: "", pharmacy: "", emergency: "" },
          vaccinations: d.vaccinations || [], pin: d.pin || "", tts: d.tts || false,
          alertHistory: d.alertHistory || [],
          emergency: d.emergency || { allergies: "", chronic: "", bloodType: "", emergencyContact: "", insurance: "", notes: "" },
          bpReadings: d.bpReadings || [], symptomMeds: d.symptomMeds || []
        };
        saveData(); loadData(); populateFamilySelect(); renderAll();
        if (status) status.textContent = "✅ تم التنزيل — " + new Date().toLocaleTimeString("ar-EG");
        showToast("✓ تم تنزيل البيانات من السحابة", "success");
      };
      if (data && data.enc && data.payload) {
        if (!pass) throw new Error("البيانات مشفرة — أدخل كلمة مرور التشفير");
        webdavDecryptData(data.payload, pass).then(applyData).catch(function(e) {
          if (status) status.textContent = "❌ فشل فك التشفير: " + e.message;
          showToast("فشل فك التشفير — كلمة المرور غير صحيحة", "error");
        });
      } else {
        applyData(data);
      }
    })
    .catch(function(e) {
      if (status) status.textContent = "❌ فشل التنزيل: " + e.message;
      showToast("فشل التنزيل — تحقق من الرابط والبيانات", "error");
    });
}

/* مزامنة تلقائية عند فتح التطبيق */
function webdavAutoSync() {
  try {
    var s = JSON.parse(localStorage.getItem(STORAGE_KEY + "_webdav") || "{}");
    if (!s.autoSync || !s.url || !s.user || !s.pass) return;
    document.getElementById("webdavUrl").value = s.url || "";
    document.getElementById("webdavUser").value = s.user || "";
    document.getElementById("webdavPass").value = s.pass || "";
    document.getElementById("webdavEncPass").value = s.encPass || "";
    var cb = document.getElementById("webdavAuto");
    if (cb) cb.checked = !!s.autoSync;
    webdavLoad();
  } catch (e) {}
}

/* ---------- رسم تفاعلات الأدوية الحالية ---------- */
function renderInteractionGraph() {
  var container = document.getElementById("interactionGraph");
  if (!container) return;
  var meds = appData.medications.filter(function(m) { return m.active; });
  if (meds.length < 2) {
    container.innerHTML = '<div class="interaction-safe">أضف دواءين نشطين على الأقل لعرض رسم التفاعلات</div>';
    return;
  }
  var ints = (typeof DRUG_INTERACTIONS_DB !== "undefined" ? DRUG_INTERACTIONS_DB : []);
  var builtIn = (typeof DRUG_INTERACTIONS !== "undefined" ? DRUG_INTERACTIONS : []);
  var edges = [];
  for (var i = 0; i < meds.length; i++) {
    for (var j = i + 1; j < meds.length; j++) {
      var a = meds[i].name, b = meds[j].name;
      var sev = null;
      for (var k = 0; k < ints.length; k++) {
        if ((ints[k].a.indexOf(a) !== -1 && ints[k].b.indexOf(b) !== -1) ||
            (ints[k].b.indexOf(a) !== -1 && ints[k].a.indexOf(b) !== -1)) { sev = ints[k].severity; break; }
      }
      if (!sev) {
        for (var q = 0; q < builtIn.length; q++) {
          if ((builtIn[q][0].indexOf(a) !== -1 && builtIn[q][1].indexOf(b) !== -1) ||
              (builtIn[q][1].indexOf(a) !== -1 && builtIn[q][0].indexOf(b) !== -1)) { sev = "high"; break; }
        }
      }
      if (sev) edges.push({ a: i, b: j, sev: sev });
    }
  }
  var W = 320, H = 260, cx = W / 2, cy = H / 2, R = 95;
  var nodes = meds.map(function(med, idx) {
    var ang = (2 * Math.PI * idx) / meds.length - Math.PI / 2;
    return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), name: med.name };
  });
  var lines = edges.map(function(e) {
    var color = e.sev === "high" ? "#ef4444" : "#f59e0b";
    return '<line x1="' + nodes[e.a].x + '" y1="' + nodes[e.a].y + '" x2="' + nodes[e.b].x + '" y2="' + nodes[e.b].y + '" stroke="' + color + '" stroke-width="2.5" stroke-dasharray="5,3"/>';
  }).join("");
  var circles = nodes.map(function(n) {
    return '<circle cx="' + n.x + '" cy="' + n.y + '" r="26" fill="#0d9488" opacity="0.9"/>' +
      '<text x="' + n.x + '" y="' + (n.y + 4) + '" font-size="8" text-anchor="middle" fill="#fff" font-weight="bold">' + escapeHtml(n.name.length > 14 ? n.name.slice(0, 13) + "…" : n.name) + '</text>';
  }).join("");
  var legend = edges.length === 0
    ? '<div style="text-align:center;font-size:0.85rem;color:var(--success);margin-top:6px;">✅ لا توجد تفاعلات معروفة بين أدويتك الحالية</div>'
    : '<div style="text-align:center;font-size:0.8rem;margin-top:6px;">🔴 خطير &nbsp;·&nbsp; 🟡 متوسط &nbsp;·&nbsp; عدد التفاعلات: ' + edges.length + '</div>';
  container.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:340px;display:block;margin:0 auto;">' + lines + circles + '</svg>' + legend;
}

/* ---------- إدخال صوتي للمساعد ---------- */
function startVoiceInput() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast("المتصفح لا يدعم الإدخال الصوتي — استخدم Chrome", "error"); return; }
  var rec = new SR();
  rec.lang = "ar-SA";
  rec.interimResults = false;
  rec.onresult = function(e) {
    var text = e.results[0][0].transcript;
    document.getElementById("assistantInput").value = text;
    askAssistant();
  };
  rec.onerror = function() { showToast("لم يُسمع صوت واضح — حاول مجدداً", "error"); };
  rec.start();
  showToast("🎤 استمع... تحدث الآن", "success");
}

/* ---------- رد صوتي للمساعد ---------- */
function speakAssistantAnswer() {
  var el = document.getElementById("assistantResponse");
  if (!el || !el.textContent || el.textContent.indexOf("🤖") === -1) { showToast("اسأل المساعد أولاً", "error"); return; }
  if (!("speechSynthesis" in window)) { showToast("المتصفح لا يدعم النطق", "error"); return; }
  var text = el.textContent.replace(/🤖/g, "").replace(/[🔴🟡🟢⚪⛔⚠️✅💊💧🍽️🔗🏷️👶👴🤰🔎•]/g, "");
  var msg = new SpeechSynthesisUtterance(text);
  msg.lang = "ar-SA";
  msg.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

/* ---------- وضع رمضان ---------- */
function toggleRamadanMode() {
  var cb = document.getElementById("ramadanToggle");
  if (!cb) return;
  appData.settings.ramadanMode = cb.checked;
  var off = document.getElementById("ramadanOffset");
  if (off) appData.settings.ramadanOffset = parseInt(off.value, 10) || 0;
  saveData();
  renderRamadanBanner();
  showToast(cb.checked ? "🌙 وضع رمضان مفعل" : "تم إيقاف وضع رمضان", "success");
}
function renderRamadanBanner() {
  var banner = document.getElementById("ramadanBanner");
  if (!banner) return;
  var on = appData.settings.ramadanMode;
  var off = appData.settings.ramadanOffset || 0;
  if (!on) { banner.classList.add("hidden"); return; }
  banner.classList.remove("hidden");
  var meds = appData.medications.filter(function(m) { return m.active; });
  var html = '<div style="font-weight:700;margin-bottom:6px;">🌙 وضع رمضان مفعل — أوقات الأدوية المعدلة (إزاحة ' + off + ' ساعة)</div>';
  if (meds.length === 0) {
    html += '<div style="font-size:0.8rem;color:var(--text-muted);">لا توجد أدوية نشطة</div>';
  } else {
    meds.forEach(function(m) {
      var times = m.times.map(function(t) { return adjustTime(t, off); });
      html += '<div style="font-size:0.85rem;margin-bottom:4px;">💊 ' + escapeHtml(m.name) + ': <strong>' + times.join("، ") + '</strong></div>';
    });
  }
  banner.innerHTML = html;
}
function adjustTime(t, offsetHours) {
  var parts = t.split(":");
  var mins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + (offsetHours || 0) * 60;
  mins = ((mins % 1440) + 1440) % 1440;
  var h = Math.floor(mins / 60), m = mins % 60;
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

/* ---------- وضع السفر (تعديل المنطقة الزمنية) ---------- */
function toggleTravelMode() {
  var cb = document.getElementById("travelToggle");
  if (!cb) return;
  appData.settings.travelMode = cb.checked;
  var off = document.getElementById("travelOffset");
  if (off) appData.settings.travelOffset = parseInt(off.value, 10) || 0;
  saveData();
  renderTravelBanner();
  showToast(cb.checked ? "✈️ وضع السفر مفعل" : "تم إيقاف وضع السفر", "success");
}
function renderTravelBanner() {
  var banner = document.getElementById("travelBanner");
  if (!banner) return;
  var on = appData.settings.travelMode;
  var off = appData.settings.travelOffset || 0;
  if (!on) { banner.classList.add("hidden"); return; }
  banner.classList.remove("hidden");
  var meds = appData.medications.filter(function(m) { return m.active; });
  var html = '<div style="font-weight:700;margin-bottom:6px;">✈️ وضع السفر — المنطقة الزمنية الجديدة (إزاحة ' + (off > 0 ? "+" : "") + off + ' ساعة)</div>';
  if (meds.length === 0) {
    html += '<div style="font-size:0.8rem;color:var(--text-muted);">لا توجد أدوية نشطة</div>';
  } else {
    meds.forEach(function(m) {
      var times = m.times.map(function(t) { return adjustTime(t, off); });
      html += '<div style="font-size:0.85rem;margin-bottom:4px;">💊 ' + escapeHtml(m.name) + ': <strong>' + times.join("، ") + '</strong></div>';
    });
  }
  banner.innerHTML = html;
}

/* ---------- تحليلات شهرية ---------- */
function renderMonthlyAnalytics() {
  var container = document.getElementById("monthlyAnalytics");
  if (!container) return;
  var days = [];
  var today = new Date();
  var totalAll = 0, takenAll = 0;
  for (var i = 29; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(today.getDate() - i);
    var dateStr = d.toISOString().slice(0, 10);
    var dayNum = d.getDay();
    var dTotal = 0, dTaken = 0;
    appData.medications.forEach(function(med) {
      if (!med.active || !med.days.includes(dayNum)) return;
      med.times.forEach(function(t) {
        dTotal++;
        if (med.log && med.log[dateStr + "_" + t]) dTaken++;
      });
    });
    totalAll += dTotal; takenAll += dTaken;
    days.push({ date: dateStr, total: dTotal, taken: dTaken });
  }
  var pct = totalAll > 0 ? Math.round((takenAll / totalAll) * 100) : 0;
  var bestDay = null, worstDay = null;
  days.forEach(function(d) {
    if (d.total === 0) return;
    var dp = d.taken / d.total;
    if (!bestDay || dp > bestDay.p) bestDay = { date: d.date, p: dp };
    if (!worstDay || dp < worstDay.p) worstDay = { date: d.date, p: dp };
  });
  var missedPattern = {};
  appData.medications.forEach(function(med) {
    if (!med.active) return;
    med.times.forEach(function(t) {
      var missed = 0;
      days.forEach(function(d) {
        var dn = new Date(d.date + "T00:00:00").getDay();
        if (!med.days.includes(dn)) return;
        if (!(med.log && med.log[d.date + "_" + t])) missed++;
      });
      if (missed > 0) missedPattern[t] = (missedPattern[t] || 0) + missed;
    });
  });
  var worstTime = null;
  Object.keys(missedPattern).forEach(function(t) {
    if (!worstTime || missedPattern[t] > missedPattern[worstTime]) worstTime = t;
  });
  var html = '<div class="report-card"><div class="report-header"><h3>📊 تحليلات آخر 30 يوم</h3><span class="badge" style="font-size:1rem;">' + pct + '%</span></div>' +
    '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div>' +
    '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;">' + takenAll + ' من ' + totalAll + ' جرعة تم أخذها</p>';
  if (bestDay) html += '<div style="font-size:0.85rem;margin-top:8px;">🏆 أفضل يوم: <strong>' + formatDateArabic(bestDay.date) + '</strong> (' + Math.round(bestDay.p * 100) + '%)</div>';
  if (worstDay) html += '<div style="font-size:0.85rem;">⚠️ أصعب يوم: <strong>' + formatDateArabic(worstDay.date) + '</strong> (' + Math.round(worstDay.p * 100) + '%)</div>';
  if (worstTime) html += '<div style="font-size:0.85rem;">⏰ أكثر وقت تُنسى فيه الجرعة: <strong>' + worstTime + '</strong></div>';
  html += '</div>';
  container.innerHTML = html;
}

/* ---------- فحص الأعراض (في المساعد) ---------- */
function symptomChecker(q) {
  var rules = [
    { kw: ["صداع", "راسي"], advice: "الصداع المتكرر قد يكون بسبب الإجهاد أو الجفاف أو قلة النوم. إذا استمر أكثر من 3 أيام أو كان شديداً فجأة، راجع الطبيب." },
    { kw: ["حرارة", "حمى", "سخونة"], advice: "الحمى (فوق 38°) قد تشير لعدوى. اشرب سوائل كثيراً، واستخدم خافض حرارة (باراسيتامول) إذا لزم. إذا استمرت أكثر من 48 ساعة أو صاحبتها صعوبة تنفس، راجع الطبيب فوراً." },
    { kw: ["سعال", "كحة"], advice: "السعال الجاف غالباً فيروسي. إذا صاحبه بلغم ملون أو دم أو استمر أكثر من أسبوعين، راجع الطبيب." },
    { kw: ["معدة", "بطن", "غثيان", "قيء"], advice: "اضطراب المعدة شائع. اشرب سوائل، وتجنب الأكل الدسم. إذا صاحبه دم أو ألم شديد أو استمر أكثر من يومين، راجع الطبيب." },
    { kw: ["إسهال"], advice: "الإسهال يسبب جفافاً — عوّض السوائل والأملاح. إذا استمر أكثر من 3 أيام أو صاحبه دم أو حرارة عالية، راجع الطبيب." },
    { kw: ["إمساك"], advice: "زد الألياف والماء، ومارس الحركة. إذا استمر أكثر من أسبوع أو صاحبه ألم شديد، راجع الطبيب." },
    { kw: ["ضغط", "دوار", "دوخة"], advice: "الدوخة قد تكون بسبب انخفاض الضغط أو الجفاف أو دواء. اجلس فوراً، واشرب ماء. إذا تكررت أو صاحبتها أعراض أخرى، راجع الطبيب." },
    { kw: ["قلب", "خفقان", "نبض"], advice: "الخفقان المتكرر يستدعي فحص طبي. إذا صاحبه ألم صدر أو ضيق تنفس أو إغماء، اتصل بالطوارئ فوراً." },
    { kw: ["نوم", "أرق"], advice: "حاول النوم في وقت ثابت، وقلل الكافيين قبل النوم. إذا استمر الأرق أكثر من أسبوعين، راجع الطبيب." },
    { kw: ["جلد", "طفح", "حكة"], advice: "الطفح الجلدي قد يكون حساسية أو عدوى. إذا انتشر بسرعة أو صاحبه تورم في الوجه أو صعوبة تنفس، توجه للطوارئ فوراً." }
  ];
  for (var i = 0; i < rules.length; i++) {
    for (var j = 0; j < rules[i].kw.length; j++) {
      if (q.indexOf(rules[i].kw[j]) !== -1) {
        return '<strong>🩺 فحص الأعراض:</strong><br>' + rules[i].advice +
          '<br><br>⚠️ هذا فحص مبدئي وليس تشخيصاً — استشر طبيبك دائماً.';
      }
    }
  }
  return null;
}

/* ---------- قسم الأعشاب ---------- */
var HERBS = [
  { ar: "النعناع", en: "Mint", uses: "عسر الهضم، الغثيان، القولون العصبي", side: "حموضة نادرة، تفاعل مع أدوية الحموضة", note: "يُشرب كشاي بعد الأكل" },
  { ar: "البابونج", en: "Chamomile", uses: "الأرق، القلق، اضطراب المعدة", side: "حساسية لدى من يتحسس من عائلة الأقحوان", note: "كوب قبل النوم يساعد على الاسترخاء" },
  { ar: "الزنجبيل", en: "Ginger", uses: "الغثيان، الدوخة، الالتهابات", side: "حرقة، تفاعل مع مميعات الدم", note: "يُحذر مع الوارفارين والأسبرين" },
  { ar: "الكركم", en: "Turmeric", uses: "الالتهابات، المفاصل، الهضم", side: "اضطراب معدة، تفاعل مع مميعات الدم", note: "يُفضل مع الفلفل الأسود لزيادة الامتصاص" },
  { ar: "الحلبة", en: "Fenugreek", uses: "سكر الدم، الرضاعة، الهضم", side: "رائحة عرق، انخفاض سكر الدم", note: "تُحذر مع أدوية السكري — قد تخفض السكر كثيراً" },
  { ar: "القرفة", en: "Cinnamon", uses: "سكر الدم، الكوليسترول", side: "تهيج فم، تفاعل مع أدوية السكري", note: "الكمية الكبيرة قد تضر الكبد" },
  { ar: "الزعتر", en: "Thyme", uses: "السعال، التهاب الحلق، الهضم", side: "حساسية نادرة", note: "غرغرة بماء الزعتر مفيدة للحلق" },
  { ar: "الميرمية", en: "Sage", uses: "التهابات الفم، الهضم، التعرق", side: "كميات كبيرة قد تسبب تشنجات", note: "تُحذر في الحمل" },
  { ar: "اليانسون", en: "Anise", uses: "الغازات، الهضم، الرضاعة", side: "حساسية نادرة", note: "مفيد للرضاعة لكن باعتدال" },
  { ar: "الشمر", en: "Fennel", uses: "الغازات، الهضم، الرضاعة", side: "حساسية نادرة", note: "يشبه اليانسون في الفوائد" },
  { ar: "إكليل الجبل", en: "Rosemary", uses: "الذاكرة، الهضم، مضاد أكسدة", side: "تفاعل مع مميعات الدم وضغط الدم", note: "يُحذر مع أدوية الضغط" },
  { ar: "العرقسوس", en: "Licorice", uses: "المعدة، السعال", side: "ارتفاع ضغط الدم، نقص البوتاسيوم", note: "⛔ يُمنع مع أدوية الضغط والقلب والكلى" }
];
function renderHerbs() {
  var container = document.getElementById("herbsList");
  if (!container) return;
  container.innerHTML = HERBS.map(function(h) {
    return '<div class="vitals-card" style="padding:10px 12px;margin-bottom:8px;">' +
      '<div style="font-weight:700;">🌿 ' + escapeHtml(h.ar) + ' <span style="font-weight:400;color:var(--text-muted);font-size:0.8rem;">(' + escapeHtml(h.en) + ')</span></div>' +
      '<div style="font-size:0.82rem;margin-top:4px;"><strong>💊 الاستخدامات:</strong> ' + escapeHtml(h.uses) + '</div>' +
      '<div style="font-size:0.82rem;"><strong>⚠️ التحذيرات:</strong> ' + escapeHtml(h.side) + '</div>' +
      '<div style="font-size:0.78rem;color:var(--text-muted);">📝 ' + escapeHtml(h.note) + '</div></div>';
  }).join("");
}

/* ---------- دواء مخصص (يضيفه المستخدم) ---------- */
function getCustomDrugs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY + "_customDrugs") || "[]"); } catch (e) { return []; }
}
function saveCustomDrugs(list) {
  localStorage.setItem(STORAGE_KEY + "_customDrugs", JSON.stringify(list));
}
function addCustomDrug() {
  var ar = document.getElementById("customAr").value.trim();
  var en = document.getElementById("customEn").value.trim();
  var uses = document.getElementById("customUses").value.trim();
  var dosage = document.getElementById("customDosage").value.trim();
  if (!ar || !en) { showToast("أدخل الاسم العربي والإنجليزي على الأقل", "error"); return; }
  var list = getCustomDrugs();
  list.push({
    ar: ar, en: en, brands: [], cat: "دواء مخصص",
    uses: uses || "غير محدد", dosage: dosage || "حسب وصفة الطبيب",
    side: "غير محدد", contra: "استشر طبيبك", pregnancy: "N",
    children: "استشر طبيبك", elderly: "استشر طبيبك",
    interactions: "غير محدد", food: "غير محدد",
    dialects: { eg: ar, gulf: ar, lev: ar }
  });
  saveCustomDrugs(list);
  ["customAr", "customEn", "customUses", "customDosage"].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = "";
  });
  renderEncyclopedia();
  showToast("✓ تمت إضافة الدواء المخصص", "success");
}
function getFullEncyclopedia() {
  var base = (typeof DRUG_ENCYCLOPEDIA !== "undefined" ? DRUG_ENCYCLOPEDIA : []);
  return base.concat(getCustomDrugs()).map(function(d) {
    if (!Array.isArray(d.brands)) d.brands = [];
    return d;
  });
}

/* ---------- فتح موعد الطبيب في خرائط جوجل ---------- */
function openAppointmentMap(title) {
  var q = encodeURIComponent(title + " عيادة");
  window.open("https://www.google.com/maps/search/?api=1&query=" + q, "_blank");
}

/* ---------- حفظ إعدادات WebDAV (مع التشفير والمزامنة التلقائية) ---------- */
function saveWebdavSettings() {
  var s = {
    url: (document.getElementById("webdavUrl") || {}).value || "",
    user: (document.getElementById("webdavUser") || {}).value || "",
    pass: (document.getElementById("webdavPass") || {}).value || "",
    encPass: (document.getElementById("webdavEncPass") || {}).value || "",
    autoSync: !!(document.getElementById("webdavAuto") || {}).checked
  };
  localStorage.setItem(STORAGE_KEY + "_webdav", JSON.stringify(s));
}
function loadWebdavSettings() {
  try {
    var s = JSON.parse(localStorage.getItem(STORAGE_KEY + "_webdav") || "{}");
    var u = document.getElementById("webdavUrl");
    var user = document.getElementById("webdavUser");
    var p = document.getElementById("webdavPass");
    var ep = document.getElementById("webdavEncPass");
    var cb = document.getElementById("webdavAuto");
    if (u) u.value = s.url || "";
    if (user) user.value = s.user || "";
    if (p) p.value = s.pass || "";
    if (ep) ep.value = s.encPass || "";
    if (cb) cb.checked = !!s.autoSync;
  } catch (e) {}
}
