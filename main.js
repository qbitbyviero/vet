// =======================
// main.js (JavaScript General)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) URL DE TU WEB APP (Apps Script)
  // ======================================
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzb-UdlFaau_szrGZkksMaAwbufH5fIduVkCRNGnKCszSJrMJnf9LqIOhfcZtYcEG2brA/exec";

  // ============================
  // 1) JSONP REQUEST (para evitar CORS)
  // ============================
  function jsonpRequest(urlSansCallback) {
    return new Promise((resolve, reject) => {
      const callbackName = "__cb_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      window[callbackName] = function(data) {
        resolve(data);
        delete window[callbackName];
        script.remove();
      };
      const separator = urlSansCallback.includes("?") ? "&" : "?";
      const script = document.createElement("script");
      script.src = urlSansCallback + separator + "callback=" + callbackName;
      script.onerror = () => {
        reject(new Error("JSONP request falló para " + script.src));
        delete window[callbackName];
        script.remove();
      };
      document.body.appendChild(script);
    });
  }

  // ============================
  // 2) CACHE PARA CLIENTES Y CITAS
  // ============================
  let __clientsCache = null;
  let __allCitasCache = null;
  let __appointmentsCount = {};

  function normalizeDate(dateStr) {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    if (dateStr instanceof Date) {
      return dateStr.toISOString().split('T')[0];
    }
    
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    
    return "";
  }

  async function loadAllClients() {
    if (Array.isArray(__clientsCache)) return __clientsCache;
    try {
      const url = GAS_BASE_URL + "?sheet=Clientes";
      const data = await jsonpRequest(url);
      __clientsCache = data;
      return __clientsCache;
    } catch (err) {
      console.error("Error cargando clientes:", err);
      return [];
    }
  }

  async function loadAllCitas() {
    if (Array.isArray(__allCitasCache)) return __allCitasCache;
    try {
      const url = GAS_BASE_URL + "?sheet=Citas";
      const data = await jsonpRequest(url);
      __allCitasCache = data;
      __appointmentsCount = {};

      data.forEach(cita => {
        const rawFecha = normalizeDate(String(cita["Fecha"]).trim());
        cita["Fecha"] = rawFecha;

        let rawHora = cita["Hora"];
        if (rawHora instanceof Date) {
          rawHora = `${String(rawHora.getHours()).padStart(2, "0")}:${String(rawHora.getMinutes()).padStart(2, "0")}`;
        } else {
          rawHora = String(rawHora).trim().slice(0, 5);
        }
        cita["Hora"] = rawHora;

        if (!__appointmentsCount[rawFecha]) __appointmentsCount[rawFecha] = 0;
        __appointmentsCount[rawFecha]++;
      });

      return __allCitasCache;
    } catch (err) {
      console.error("Error cargando citas:", err);
      return [];
    }
  }

  function getCountByDate(fecha) {
    return __appointmentsCount[fecha] || 0;
  }

  // ===================================
  // 3) LÓGICA DEL CALENDARIO
  // ===================================
  let currentDate = new Date();
  const card = document.getElementById("card");
  const daysEl = document.getElementById("days");
  const monthYearEl = document.getElementById("month-year");
  const reservationFormDiv = document.getElementById("reservation-form");
  const formDate = document.getElementById("form-date");
  const formTime = document.getElementById("form-time");
  const slotListEl = document.getElementById("slot-list");

  function activateDateClicks() {
    document.querySelectorAll("#days div[data-date]").forEach(el => {
      el.addEventListener("click", () => {
        const selectedDate = el.dataset.date;
        document.getElementById("slot-date").textContent = selectedDate;
        flipToSlots(selectedDate);
      });
    });
  }

  async function renderCalendar() {
    console.log("Renderizando calendario...");
    document.getElementById("calendar").style.display = "block";
    reservationFormDiv.style.display = "none";

    await loadAllCitas();

    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    monthYearEl.textContent = currentDate.toLocaleString("es-ES", {
      month: "long",
      year: "numeric"
    });

    daysEl.innerHTML = "";
    const firstDayIndex = new Date(y, m, 1).getDay() || 7;
    const totalDays = new Date(y, m + 1, 0).getDate();

    for (let i = 1; i < firstDayIndex; i++) {
      daysEl.appendChild(document.createElement("div"));
    }

    for (let d = 1; d <= totalDays; d++) {
      const dayCell = document.createElement("div");
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      dayCell.textContent = d;
      dayCell.dataset.date = dateStr;

      const count = getCountByDate(dateStr);
      if (count >= 4) dayCell.classList.add("full");
      else if (count === 3) dayCell.classList.add("medium");
      else if (count > 0) dayCell.classList.add("low");
      
      if (count > 0) dayCell.setAttribute("data-count", count);
      if (dateStr === new Date().toISOString().slice(0, 10)) dayCell.classList.add("today");

      daysEl.appendChild(dayCell);
    }
    activateDateClicks();
  }

  function flipToSlots(date) {
    card.classList.add("flipped1");
    setTimeout(() => loadSlots(date), 400);
  }

  async function loadSlots(fecha) {
    slotListEl.innerHTML = "";
    const allCitas = await loadAllCitas();
    const citasDelDia = allCitas.filter(c => normalizeDate(c["Fecha"]) === fecha);

    const mapaCitas = {};
    citasDelDia.forEach(cita => {
      let hora = String(cita["Hora"]).trim().slice(0, 5);
      if (hora.length === 4) hora = "0" + hora;
      mapaCitas[hora] = {
        mascota: String(cita["Nombre de la mascota"] || "").trim(),
        motivo: String(cita["Motivo"] || "").trim()
      };
    });

    for (let h = 10; h < 19; h++) {
      ["00", "30"].forEach(min => {
        const time = `${String(h).padStart(2, "0")}:${min}`;
        const li = document.createElement("li");
        li.classList.add("slot-line");

        const timeSpan = document.createElement("span");
        timeSpan.textContent = time;
        timeSpan.classList.add("slot-time");

        const detailSpan = document.createElement("span");
        detailSpan.classList.add("slot-detail");

        if (mapaCitas[time]) {
          detailSpan.textContent = `${mapaCitas[time].mascota} → ${mapaCitas[time].motivo}`;
          li.classList.add("ocupado");
        } else {
          detailSpan.textContent = "Disponible";
          li.addEventListener("click", () => selectSlot(fecha, time));
        }

        li.appendChild(timeSpan);
        li.appendChild(detailSpan);
        slotListEl.appendChild(li);
      });
    }

    const urg = document.createElement("li");
    urg.textContent = "🚨 URGENCIAS";
    urg.classList.add("urgencia");
    urg.addEventListener("click", () => selectSlot(fecha, "URGENCIAS"));
    slotListEl.appendChild(urg);
  }

  function selectSlot(fecha, hora) {
    const backPanel = document.querySelector(".back");
    backPanel.style.transition = "opacity 0.3s ease";
    backPanel.style.opacity = "0";
    setTimeout(() => {
      document.getElementById("calendar").style.display = "none";
      renderForm(fecha, hora);
      reservationFormDiv.style.display = "block";
      setTimeout(() => {
        reservationFormDiv.style.opacity = "1";
      }, 50);
    }, 300);
  }

  // ===================================
  // 4) INICIALIZACIÓN
  // ===================================
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Iniciar calendario
  renderCalendar();
});
