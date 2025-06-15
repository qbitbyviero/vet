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

  async function renderForm(fecha, hora) {
    // Mostrar el formulario
    document.getElementById("reservation-form").style.display = "block";
    document.getElementById("form-date").value = fecha;
    document.getElementById("form-time").value = hora;

    // Configurar el formulario para nueva cita
    const mascotaSelect = document.getElementById("mascota");
    mascotaSelect.innerHTML = '<option value="">Cargando mascotas...</option>';
    
    // Cargar clientes y poblar el select
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

    // Manejar cambio de selección
    mascotaSelect.addEventListener("change", async function() {
        const mascotaSeleccionada = this.value;
        const ownerInfo = document.getElementById("owner-info");
        
        if (!mascotaSeleccionada) {
            ownerInfo.innerHTML = "";
            return;
        }

        const cliente = clientes.find(c => c["Nombre de la mascota"] === mascotaSeleccionada);
        if (cliente) {
            ownerInfo.innerHTML = `
                <p><strong>Dueño:</strong> ${cliente["Nombre del propietario"]}</p>
                <p><strong>Teléfono:</strong> ${cliente["Número de Teléfono"]}</p>
                <p><strong>Correo:</strong> ${cliente["Correo"]}</p>
            `;
        }
    });

    // Manejar nueva mascota
    document.getElementById("new-pet").addEventListener("change", function() {
        const newPetFields = document.getElementById("new-pet-fields");
        if (this.checked) {
            newPetFields.style.display = "block";
            mascotaSelect.disabled = true;
        } else {
            newPetFields.style.display = "none";
            mascotaSelect.disabled = false;
        }
    });

    // Configurar el botón de cancelar
    document.getElementById("cancel-form").addEventListener("click", function() {
        document.getElementById("reservation-form").style.display = "none";
        renderCalendar();
    });

    // Configurar el envío del formulario
    document.getElementById("appointment-form").addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const fecha = document.getElementById("form-date").value;
        const hora = document.getElementById("form-time").value;
        const isNewPet = document.getElementById("new-pet").checked;
        let clienteId, nombreMascota;

        if (isNewPet) {
            // Proceso para nueva mascota
            const propietario = document.getElementById("new-owner-name").value.trim();
            const telefono = document.getElementById("new-owner-phone").value.trim();
            const correo = document.getElementById("new-owner-email").value.trim();
            nombreMascota = document.getElementById("new-pet-name").value.trim();

            if (!propietario || !telefono || !nombreMascota) {
                alert("Por favor complete todos los campos obligatorios");
                return;
            }

            // Crear nuevo cliente
            try {
                const params = new URLSearchParams();
                params.append("sheet", "Clientes");
                params.append("nuevo", "true");
                params.append("Nombre del propietario", propietario);
                params.append("Número de Teléfono", telefono);
                params.append("Correo", correo);
                params.append("Nombre de la mascota", nombreMascota);
                // Agrega aquí los demás campos necesarios

                const response = await jsonpRequest(`${GAS_BASE_URL}?${params.toString()}`);
                if (!response.success) throw new Error(response.error);
                
                clienteId = response["ID fila"];
            } catch (error) {
                alert("Error al registrar el cliente: " + error.message);
                return;
            }
        } else {
            // Proceso para mascota existente
            nombreMascota = mascotaSelect.value;
            if (!nombreMascota) {
                alert("Seleccione una mascota");
                return;
            }

            const cliente = clientes.find(c => c["Nombre de la mascota"] === nombreMascota);
            if (!cliente) {
                alert("No se encontró la mascota seleccionada");
                return;
            }
            clienteId = cliente["ID fila"] || cliente["ID cliente"];
        }

        // Pedir motivo de la cita
        const motivo = prompt("Ingrese el motivo de la cita:");
        if (!motivo || !motivo.trim()) {
            alert("Debe especificar un motivo para la cita");
            return;
        }

        // Crear la cita
        try {
            const params = new URLSearchParams();
            params.append("sheet", "Citas");
            params.append("nuevo", "true");
            params.append("Fecha", fecha);
            params.append("Hora", hora);
            params.append("ID cliente", clienteId);
            params.append("Nombre de la mascota", nombreMascota);
            params.append("Motivo", motivo);

             const response = await jsonpRequest(`${GAS_BASE_URL}?${params.toString()}`);
        if (!response.success) throw new Error(response.error);
        
        alert("¡Cita agendada con éxito!");
        
        // Limpiar caché
        __allCitasCache = null;
        __appointmentsCount = {};
        
        // Ocultar formulario con animación
        reservationFormDiv.style.opacity = "0";
        setTimeout(() => {
            reservationFormDiv.style.display = "none";
            
            // Mostrar calendario con animación
            document.getElementById("calendar").style.display = "block";
            document.getElementById("calendar").style.opacity = "0";
            setTimeout(() => {
                document.getElementById("calendar").style.opacity = "1";
                
                // Voltear la tarjeta si estaba en modo horarios
                if (card.classList.contains("flipped1")) {
                    card.classList.remove("flipped1");
                }
                
                // Recargar el calendario
                renderCalendar();
            }, 50);
        }, 300);
        
    } catch (error) {
        alert("Error al agendar la cita: " + error.message);
    }
});

// Y añade esta función auxiliar para resetear la vista
function resetCalendarView() {
    // Ocultar formulario
    reservationFormDiv.style.display = "none";
    
    // Mostrar calendario principal
    document.getElementById("calendar").style.display = "block";
    
    // Voltear la tarjeta si estaba en modo horarios
    if (card.classList.contains("flipped1")) {
        card.classList.remove("flipped1");
    }
    
    // Recargar datos
    __allCitasCache = null;
    __appointmentsCount = {};
    renderCalendar();
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
