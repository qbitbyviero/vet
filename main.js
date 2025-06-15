// =======================
// main.js (Versión Corregida y Comprobada)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 1. CONFIGURACIÓN INICIAL
  // ======================================
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzb-UdlFaau_szrGZkksMaAwbufH5fIduVkCRNGnKCszSJrMJnf9LqIOhfcZtYcEG2brA/exec";
  let __clientsCache = null;
  let __allCitasCache = null;
  let __appointmentsCount = {};
  let currentDate = new Date();

  // ======================================
  // 2. FUNCIONES BÁSICAS
  // ======================================
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
        reject(new Error("JSONP request falló"));
        delete window[callbackName];
        script.remove();
      };
      document.body.appendChild(script);
    });
  }

  function normalizeDate(dateStr) {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr instanceof Date) return dateStr.toISOString().split('T')[0];
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return "";
  }

  // ======================================
  // 3. FUNCIONES DE DATOS
  // ======================================
  async function loadAllClients() {
    if (Array.isArray(__clientsCache)) return __clientsCache;
    try {
      const data = await jsonpRequest(GAS_BASE_URL + "?sheet=Clientes");
      __clientsCache = data;
      return data;
    } catch (err) {
      console.error("Error cargando clientes:", err);
      return [];
    }
  }

  async function loadAllCitas() {
    if (Array.isArray(__allCitasCache)) return __allCitasCache;
    try {
      const data = await jsonpRequest(GAS_BASE_URL + "?sheet=Citas");
      __allCitasCache = data;
      __appointmentsCount = {};

      data.forEach(cita => {
        const fecha = normalizeDate(String(cita["Fecha"]).trim());
        cita["Fecha"] = fecha;

        let hora = cita["Hora"];
        if (hora instanceof Date) {
          hora = `${String(hora.getHours()).padStart(2, "0")}:${String(hora.getMinutes()).padStart(2, "0")}`;
        } else {
          hora = String(hora).trim().slice(0, 5);
        }
        cita["Hora"] = hora;

        if (!__appointmentsCount[fecha]) __appointmentsCount[fecha] = 0;
        __appointmentsCount[fecha]++;
      });

      return __allCitasCache;
    } catch (err) {
      console.error("Error cargando citas:", err);
      return [];
    }
  }

  // ======================================
  // 4. FUNCIONES DE INTERFAZ
  // ======================================
  const card = document.getElementById("card");
  const daysEl = document.getElementById("days");
  const monthYearEl = document.getElementById("month-year");
  const reservationFormDiv = document.getElementById("reservation-form");
  const slotListEl = document.getElementById("slot-list");

  async function renderCalendar() {
    console.log("[DEBUG] Renderizando calendario...");
    try {
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

      // Días vacíos iniciales
      for (let i = 1; i < firstDayIndex; i++) {
        daysEl.appendChild(document.createElement("div"));
      }

      // Días del mes
      for (let d = 1; d <= totalDays; d++) {
        const dayCell = document.createElement("div");
        const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        dayCell.textContent = d;
        dayCell.dataset.date = dateStr;

        const count = __appointmentsCount[dateStr] || 0;
        if (count >= 4) dayCell.classList.add("full");
        else if (count === 3) dayCell.classList.add("medium");
        else if (count > 0) dayCell.classList.add("low");
        
        if (count > 0) dayCell.setAttribute("data-count", count);
        if (dateStr === new Date().toISOString().slice(0, 10)) {
          dayCell.classList.add("today");
        }

        daysEl.appendChild(dayCell);
      }

      activateDateClicks();
      console.log("[DEBUG] Calendario renderizado correctamente");
    } catch (error) {
      console.error("[ERROR] Fallo en renderCalendar:", error);
    }
  }

  function activateDateClicks() {
    document.querySelectorAll("#days div[data-date]").forEach(el => {
      el.addEventListener("click", () => {
        const selectedDate = el.dataset.date;
        document.getElementById("slot-date").textContent = selectedDate;
        flipToSlots(selectedDate);
      });
    });
  }

  function flipToSlots(date) {
    card.classList.add("flipped1");
    setTimeout(() => loadSlots(date), 400);
  }

  async function loadSlots(date) {
    try {
      slotListEl.innerHTML = "";
      const allCitas = await loadAllCitas();
      const citasDelDia = allCitas.filter(c => c["Fecha"] === date);

      const mapaCitas = {};
      citasDelDia.forEach(cita => {
        let hora = String(cita["Hora"]).trim().slice(0, 5);
        if (hora.length === 4) hora = "0" + hora;
        mapaCitas[hora] = {
          mascota: String(cita["Nombre de la mascota"] || "").trim(),
          motivo: String(cita["Motivo"] || "").trim()
        };
      });

      // Horarios disponibles
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
            li.addEventListener("click", () => selectSlot(date, time));
          }

          li.appendChild(timeSpan);
          li.appendChild(detailSpan);
          slotListEl.appendChild(li);
        });
      }

      // Opción de urgencias
      const urg = document.createElement("li");
      urg.textContent = "🚨 URGENCIAS";
      urg.classList.add("urgencia");
      urg.addEventListener("click", () => selectSlot(date, "URGENCIAS"));
      slotListEl.appendChild(urg);

    } catch (error) {
      console.error("[ERROR] Fallo en loadSlots:", error);
    }
  }

  function selectSlot(fecha, hora) {
    const backPanel = document.querySelector(".back");
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

  // ======================================
  // 5. MANEJO DEL FORMULARIO
  // ======================================
  async function renderForm(fecha, hora) {
    try {
      document.getElementById("form-date").value = fecha;
      document.getElementById("form-time").value = hora;
      document.getElementById("new-pet").checked = false;
      document.getElementById("new-pet-fields").style.display = "none";

      const mascotaSelect = document.getElementById("mascota");
      mascotaSelect.innerHTML = '<option value="">Cargando mascotas...</option>';
      mascotaSelect.disabled = false;

      const clientes = await loadAllClients();
      mascotaSelect.innerHTML = '<option value="">Seleccione una mascota</option>';
      
      clientes.forEach(cliente => {
        if (cliente["Nombre de la mascota"]) {
          const option = document.createElement("option");
          option.value = cliente["Nombre de la mascota"];
          option.textContent = cliente["Nombre de la mascota"];
          mascotaSelect.appendChild(option);
        }
      });

      // Configurar eventos
      setupFormEvents();
      console.log("[DEBUG] Formulario renderizado correctamente");

    } catch (error) {
      console.error("[ERROR] Fallo en renderForm:", error);
    }
  }

  function setupFormEvents() {
    // Botón Volver en horarios
    document.getElementById("back-to-calendar").addEventListener("click", resetCalendarView);

    // Botón Cancelar en formulario
    document.getElementById("cancel-form").addEventListener("click", resetCalendarView);

    // Toggle nueva mascota
    document.getElementById("new-pet").addEventListener("change", function() {
      const newPetFields = document.getElementById("new-pet-fields");
      const mascotaSelect = document.getElementById("mascota");
      
      if (this.checked) {
        newPetFields.style.display = "block";
        mascotaSelect.disabled = true;
        document.getElementById("owner-info").innerHTML = "";
      } else {
        newPetFields.style.display = "none";
        mascotaSelect.disabled = false;
      }
    });

    // Cambio de mascota seleccionada
    document.getElementById("mascota").addEventListener("change", async function() {
      const mascota = this.value;
      const ownerInfo = document.getElementById("owner-info");
      
      if (!mascota) {
        ownerInfo.innerHTML = "";
        return;
      }

      const clientes = await loadAllClients();
      const cliente = clientes.find(c => c["Nombre de la mascota"] === mascota);
      
      if (cliente) {
        ownerInfo.innerHTML = `
          <p><strong>Dueño:</strong> ${cliente["Nombre del propietario"]}</p>
          <p><strong>Teléfono:</strong> ${cliente["Número de Teléfono"]}</p>
          <p><strong>Correo:</strong> ${cliente["Correo"]}</p>
        `;
      } else {
        ownerInfo.innerHTML = "<p>Dueño no encontrado</p>";
      }
    });

    // Envío del formulario
    document.getElementById("appointment-form").addEventListener("submit", async function(e) {
      e.preventDefault();
      
      const fecha = document.getElementById("form-date").value;
      const hora = document.getElementById("form-time").value;
      const isNewPet = document.getElementById("new-pet").checked;
      let clienteId, nombreMascota;

      try {
        if (isNewPet) {
          // Proceso para nueva mascota
          const propietario = document.getElementById("new-owner-name").value.trim();
          const telefono = document.getElementById("new-owner-phone").value.trim();
          nombreMascota = document.getElementById("new-pet-name").value.trim();

          if (!propietario || !telefono || !nombreMascota) {
            alert("Complete todos los campos obligatorios");
            return;
          }

          // Registrar nuevo cliente
          const paramsCliente = new URLSearchParams();
          paramsCliente.append("sheet", "Clientes");
          paramsCliente.append("nuevo", "true");
          paramsCliente.append("Nombre del propietario", propietario);
          paramsCliente.append("Número de Teléfono", telefono);
          paramsCliente.append("Nombre de la mascota", nombreMascota);

          const responseCliente = await jsonpRequest(`${GAS_BASE_URL}?${paramsCliente.toString()}`);
          if (!responseCliente.success) throw new Error(responseCliente.error);
          clienteId = responseCliente["ID fila"];
        } else {
          // Mascota existente
          nombreMascota = document.getElementById("mascota").value;
          if (!nombreMascota) {
            alert("Seleccione una mascota");
            return;
          }

          const clientes = await loadAllClients();
          const cliente = clientes.find(c => c["Nombre de la mascota"] === nombreMascota);
          if (!cliente) throw new Error("Mascota no encontrada");
          clienteId = cliente["ID fila"] || cliente["ID cliente"];
        }

        // Pedir motivo
        const motivo = prompt("Motivo de la cita para " + nombreMascota + ":");
        if (!motivo) return;

        // Registrar cita
        const paramsCita = new URLSearchParams();
        paramsCita.append("sheet", "Citas");
        paramsCita.append("nuevo", "true");
        paramsCita.append("Fecha", fecha);
        paramsCita.append("Hora", hora);
        paramsCita.append("ID cliente", clienteId);
        paramsCita.append("Nombre de la mascota", nombreMascota);
        paramsCita.append("Motivo", motivo);

        const responseCita = await jsonpRequest(`${GAS_BASE_URL}?${paramsCita.toString()}`);
        if (!responseCita.success) throw new Error(responseCita.error);

        alert("¡Cita agendada con éxito!");
        resetCalendarView();

      } catch (error) {
        console.error("[ERROR] Fallo al guardar cita:", error);
        alert("Error: " + error.message);
      }
    });
  }

  function resetCalendarView() {
    console.log("[DEBUG] Reseteando vista...");
    
    // Ocultar formulario
    reservationFormDiv.style.opacity = "0";
    setTimeout(() => {
      reservationFormDiv.style.display = "none";
      
      // Mostrar calendario
      document.getElementById("calendar").style.display = "block";
      document.getElementById("calendar").style.opacity = "1";
      
      // Resetear tarjeta
      if (card.classList.contains("flipped1")) {
        card.classList.remove("flipped1");
      }
      
      // Recargar datos
      currentDate = new Date();
      __allCitasCache = null;
      __appointmentsCount = {};
      renderCalendar();
    }, 300);
  }

  // ======================================
  // 6. INICIALIZACIÓN
  // ======================================
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Iniciar
  renderCalendar();
});
