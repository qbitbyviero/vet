// =======================
// main.js (JavaScript General) - Versión Corregida y Completa
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) Configuración inicial
  // ======================================
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzb-UdlFaau_szrGZkksMaAwbufH5fIduVkCRNGnKCszSJrMJnf9LqIOhfcZtYcEG2brA/exec";

  // Elementos del DOM
  const card = document.getElementById("card");
  const daysEl = document.getElementById("days");
  const monthYearEl = document.getElementById("month-year");
  const reservationFormDiv = document.getElementById("reservation-form");
  const formDate = document.getElementById("form-date");
  const formTime = document.getElementById("form-time");
  const ownerInfoDiv = document.getElementById("owner-info");
  const newChk = document.getElementById("new-pet");
  const newPetFields = document.getElementById("new-pet-fields");
  const backToCalendarBtn = document.getElementById("back-to-calendar");
  const slotListEl = document.getElementById("slot-list");
  const mascotaSelect = document.getElementById("mascota");
  const overlay = document.getElementById("modal-overlay");

  // Variables de estado
  let currentDate = new Date();
  let __clientsCache = null;
  let __allCitasCache = null;
  let __appointmentsCount = {};

  // ============================
  // 1) Funciones auxiliares
  // ============================

  function jsonpRequest(urlSansCallback) {
    return new Promise((resolve, reject) => {
      const callbackName = 'cb_' + Date.now();
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Tiempo de espera agotado'));
      }, 10000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      window[callbackName] = function(data) {
        cleanup();
        if (data && data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
      };

      const script = document.createElement('script');
      script.src = urlSansCallback + (urlSansCallback.includes('?') ? '&' : '?') + 
                 'callback=' + callbackName;
      
      script.onerror = () => {
        cleanup();
        reject(new Error('Error de red al cargar los datos'));
      };

      document.body.appendChild(script);
    });
  }

  function normalizeDate(dateStr) {
    if (!dateStr) return "";
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    try {
      const d = new Date(dateStr);
      if (!isNaN(d)) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {}
    
    const parts = dateStr.split(/[/-]/);
    if (parts.length === 3) {
      let day, month, year;
      if (parts[0].length === 4) {
        [year, month, day] = parts;
      } else if (parts[2].length === 4) {
        if (parseInt(parts[0]) > 12) {
          [day, month, year] = parts;
        } else {
          [month, day, year] = parts;
        }
      }
      
      if (day && month && year) {
        return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    
    return "";
  }

  function normalizeTime(timeStr) {
    if (!timeStr) return '';
    
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    
    if (timeStr instanceof Date) {
      return `${String(timeStr.getHours()).padStart(2, '0')}:${String(timeStr.getMinutes()).padStart(2, '0')}`;
    }
    
    if (typeof timeStr === 'string') {
      timeStr = timeStr.trim().toUpperCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ');
      
      const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (match) {
        let hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const period = match[3];
        
        if (period) {
          if (/PM/i.test(period) && hours < 12) hours += 12;
          if (/AM/i.test(period) && hours === 12) hours = 0;
        }
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
    
    return '';
  }

  // ======================================
  // Función para activar clicks en fechas
  // ======================================
  function activateDateClicks() {
    document.querySelectorAll("#days div[data-date]").forEach(day => {
      day.addEventListener("click", async () => {
        const fechaSeleccionada = day.dataset.date;
        console.log("Fecha seleccionada:", fechaSeleccionada);
        
        // Mostrar el formulario de reservación
        reservationFormDiv.style.display = "block";
        card.style.display = "none";
        
        // Cargar los slots disponibles para esta fecha
        await loadSlots(fechaSeleccionada);
      });
    });
  }

  async function loadSlots(fecha) {
    console.log(`Cargando slots para: ${fecha}`);
    slotListEl.innerHTML = '<div class="loading">Cargando horarios...</div>';
    
    try {
      const allCitas = await loadAllCitas();
      console.log('Todas las citas:', allCitas);
      
      const citasDelDia = allCitas.filter(cita => {
        const fechaCita = normalizeDate(cita.Fecha);
        console.log(`Comparando: ${fechaCita} con ${fecha}`);
        return fechaCita === fecha;
      });
      
      console.log('Citas del día:', citasDelDia);

      citasDelDia.sort((a, b) => {
        const horaA = normalizeTime(a.Hora);
        const horaB = normalizeTime(b.Hora);
        return horaA.localeCompare(horaB);
      });

      slotListEl.innerHTML = '';
      
      for (let h = 10; h < 19; h++) {
        for (let m = 0; m < 60; m += 30) {
          const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          const li = document.createElement('li');
          li.className = 'slot-line';
          
          const cita = citasDelDia.find(c => {
            const horaCita = normalizeTime(c.Hora);
            return horaCita === hora;
          });
          
          if (cita) {
            li.innerHTML = `
              <span class="hora">${hora}</span>
              <span class="separador">----></span>
              <span class="mascota">${cita['Nombre de la mascota'] || 'Sin nombre'}</span>
              <span class="separador">----></span>
              <span class="motivo">${cita.Motivo || 'Sin motivo'}</span>
            `;
            li.classList.add('ocupado');
          } else {
            li.innerHTML = `
              <span class="hora">${hora}</span>
              <span class="separador">----></span>
              <span class="disponible">Disponible</span>
            `;
            li.classList.add('disponible');
            li.addEventListener('click', () => selectSlot(fecha, hora));
          }
          
          slotListEl.appendChild(li);
        }
      }
      
      const urgLi = document.createElement('li');
      urgLi.innerHTML = '<span class="urgencia">🚨 URGENCIAS</span>';
      urgLi.classList.add('slot-urgencia');
      urgLi.addEventListener('click', () => selectSlot(fecha, 'URGENCIAS'));
      slotListEl.appendChild(urgLi);
      
    } catch (error) {
      console.error('Error en loadSlots:', error);
      slotListEl.innerHTML = `
        <div class="error">
          Error al cargar horarios
          <button onclick="window.location.reload()">Reintentar</button>
        </div>
      `;
    }
  }

  function updateCalendarStyles() {
    document.querySelectorAll("#days div[data-date]").forEach(day => {
      const date = day.dataset.date;
      const count = __appointmentsCount[date] || 0;
      
      day.classList.remove('full', 'medium', 'low');
      
      if (count >= 4) {
        day.classList.add('full');
      } else if (count === 3) {
        day.classList.add('medium');
      } else if (count > 0) {
        day.classList.add('low');
      }
      
      day.title = `${count} citas este día`;
    });
  }

  // ============================
  // 2) Funciones de carga de datos
  // ============================

  async function loadAllClients() {
    if (Array.isArray(__clientsCache)) {
      console.log("Usando caché de clientes");
      return __clientsCache;
    }
    
    try {
      const url = `${GAS_BASE_URL}?sheet=Clientes&nocache=${Date.now()}`;
      console.log("Cargando clientes desde:", url);
      
      const data = await jsonpRequest(url);
      console.log("Datos de clientes recibidos:", data);
      
      if (!data || !Array.isArray(data)) {
        throw new Error("Formato de datos de clientes inválido");
      }
      
      __clientsCache = data;
      return __clientsCache;
    } catch (err) {
      console.error("Error cargando clientes:", err);
      return [];
    }
  }

  async function loadAllCitas() {
    if (Array.isArray(__allCitasCache)) {
      console.log("Usando caché de citas");
      return __allCitasCache;
    }
    
    try {
      const url = `${GAS_BASE_URL}?sheet=Citas&nocache=${Date.now()}`;
      console.log("Cargando citas desde:", url);
      
      const data = await jsonpRequest(url);
      console.log("Datos recibidos:", data);
      
      if (!data || !Array.isArray(data)) {
        throw new Error("Formato de datos inválido");
      }
      
      __allCitasCache = data.map(cita => ({
        ...cita,
        Fecha: cita.Fecha || '',
        Hora: cita.Hora || '',
        'Nombre de la mascota': cita['Nombre de la mascota'] || 'Sin nombre',
        Motivo: cita.Motivo || 'Sin motivo'
      }));
      
      __appointmentsCount = {};
      __allCitasCache.forEach(cita => {
        if (cita.Fecha) {
          __appointmentsCount[cita.Fecha] = (__appointmentsCount[cita.Fecha] || 0) + 1;
        }
      });
      
      console.log("Citas procesadas:", __allCitasCache);
      return __allCitasCache;
    } catch (err) {
      console.error("Error cargando citas:", err);
      showGlobalError("Error al cargar las citas. Recarga la página.");
      return [];
    }
  }

  // ============================
  // 3) Funciones del calendario
  // ============================

  async function renderCalendar() {
    try {
      console.log("Iniciando renderCalendar...");
      
      __allCitasCache = null;
      __appointmentsCount = {};
      
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
        const dateStr = `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        dayCell.textContent = d;
        dayCell.dataset.date = dateStr;

        const count = __appointmentsCount[dateStr] || 0;
        
        dayCell.classList.toggle("full", count >= 4);
        dayCell.classList.toggle("medium", count === 3);
        dayCell.classList.toggle("low", count > 0 && count < 3);
        dayCell.classList.toggle("today", dateStr === new Date().toISOString().slice(0,10));
        
        if (count > 0) {
          dayCell.setAttribute("data-count", count);
        }

        daysEl.appendChild(dayCell);
      }
      
      activateDateClicks();
      updateCalendarStyles();
      
    } catch (err) {
      console.error("Error en renderCalendar:", err);
      showGlobalError("Error al mostrar el calendario");
    }
  }

  // ============================
  // 4) Funciones del formulario
  // ============================

  async function renderForm(fecha, hora) {
    formDate.value = fecha;
    formTime.value = hora;

    ownerInfoDiv.innerHTML = "";
    document.getElementById("edit-client-btn").style.display = "none";
    document.getElementById("edit-client-fields").style.display = "none";
    document.getElementById("edit-age").value = "";
    document.getElementById("edit-weight").value = "";
    document.getElementById("edit-email").value = "";

    await populateClientPetFields(reservationFormDiv);

    if (mascotaSelect) {
      mascotaSelect.addEventListener("change", async () => {
        const petSeleccionada = mascotaSelect.value;
        if (!petSeleccionada) {
          ownerInfoDiv.innerHTML = "";
          document.getElementById("edit-client-btn").style.display = "none";
          return;
        }
        const clientes = await loadAllClients();
        const fila = clientes.find(c => c["Nombre de la mascota"] === petSeleccionada);
        if (fila) {
          ownerInfoDiv.innerHTML = `
            <p><strong>Dueño:</strong> ${fila["Nombre del propietario"]}</p>
            <p><strong>Teléfono:</strong> ${fila["Número de Teléfono"]}</p>
            <p><strong>Correo:</strong> ${fila["Correo"]}</p>
            <p><strong>Edad:</strong> ${fila["Edad"]} años</p>
            <p><strong>Peso:</strong> ${fila["Peso"]} kg</p>
            <p><strong>Esterilizado:</strong> ${fila["Esterilizado"]}</p>
          `;
          document.getElementById("edit-client-btn").style.display = "inline-block";
        } else {
          ownerInfoDiv.innerHTML = "<p style='color:red;'>Dueño no encontrado.</p>";
          document.getElementById("edit-client-btn").style.display = "none";
        }
      });
    }

    if (newChk) {
      newChk.checked = false;
      newPetFields.style.display = "none";
    }
    
    document.getElementById("new-owner-name").value = "";
    document.getElementById("new-owner-phone").value = "";
    document.getElementById("new-owner-email").value = "";
    document.getElementById("new-pet-name").value = "";
    document.getElementById("new-pet-species").value = "";
    document.getElementById("new-pet-breed").value = "";
    document.getElementById("new-pet-age").value = "";
    document.getElementById("new-pet-weight").value = "";
    document.querySelectorAll('input[name="new-pet-sterilizado"]').forEach(r => r.checked = false);
    document.getElementById("new-pet-notes").value = "";

    reservationFormDiv.scrollIntoView({ behavior: "smooth" });
  }

  function selectSlot(fecha, hora) {
    console.log(`Slot seleccionado - Fecha: ${fecha}, Hora: ${hora}`);
    
    formDate.value = fecha;
    formTime.value = hora;
    reservationFormDiv.style.display = "block";
    slotListEl.style.display = "none";
    renderForm(fecha, hora);
  }

  // ============================
  // 5) Event Listeners
  // ============================

  if (newChk && newPetFields && mascotaSelect) {
    newChk.addEventListener("change", () => {
      if (newChk.checked) {
        newPetFields.style.display = "block";
        mascotaSelect.disabled = true;
        ownerInfoDiv.innerHTML = "";
        document.getElementById("edit-client-btn").style.display = "none";
        document.getElementById("edit-client-fields").style.display = "none";
      } else {
        newPetFields.style.display = "none";
        mascotaSelect.disabled = false;
      }
    });
  }

  document.getElementById("edit-client-btn")?.addEventListener("click", async () => {
    const petSeleccionada = document.getElementById("mascota").value;
    if (!petSeleccionada) return;
    const clientes = await loadAllClients();
    const fila = clientes.find(c => c["Nombre de la mascota"] === petSeleccionada);
    if (!fila) return;

    document.getElementById("edit-age").value = fila["Edad"] || "";
    document.getElementById("edit-weight").value = fila["Peso"] || "";
    document.getElementById("edit-email").value = fila["Correo"] || "";

    document.getElementById("edit-client-fields").style.display = "block";
  });

  document.getElementById("save-client-changes")?.addEventListener("click", () => {
    const petSeleccionada = document.getElementById("mascota").value;
    const age = document.getElementById("edit-age").value;
    const weight = document.getElementById("edit-weight").value;
    const email = document.getElementById("edit-email").value;
    if (!petSeleccionada) return;

    alert(
      "DATOS CLIENTE ACTUALIZADOS (simulado):\n" +
      "Mascota: " + petSeleccionada + "\n" +
      "Edad: " + age + " años\n" +
      "Peso: " + weight + " kg\n" +
      "Correo: " + email + "\n\n" +
      "(Para que esto realmente modifique la hoja, implementa un endpoint 'updateCliente' en Apps Script)."
    );
    document.getElementById("edit-client-fields").style.display = "none";
  });

  document.getElementById("cancel-form")?.addEventListener("click", () => {
    reservationFormDiv.style.display = "none";
    renderCalendar();
  });

  document.getElementById("appointment-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha = formDate.value;
    const hora = formTime.value;
    const nuevaMascota = newChk?.checked || false;
    let clienteId, nombreMascota, motivo;

    if (nuevaMascota) {
      const propietario = document.getElementById("new-owner-name").value.trim();
      const telefono = document.getElementById("new-owner-phone").value.trim();
      const correo = document.getElementById("new-owner-email").value.trim();
      nombreMascota = document.getElementById("new-pet-name").value.trim();
      const especie = document.getElementById("new-pet-species").value.trim();
      const raza = document.getElementById("new-pet-breed").value.trim();
      const edad = document.getElementById("new-pet-age").value.trim();
      const peso = document.getElementById("new-pet-weight").value.trim();
      const esterilizado = document.querySelector('input[name="new-pet-sterilizado"]:checked')
                         ? document.querySelector('input[name="new-pet-sterilizado"]:checked').value
                         : "";
      const observaciones = document.getElementById("new-pet-notes").value.trim();

      if (!propietario || !telefono || !correo || !nombreMascota) {
        alert("Por favor completa todos los campos de 'Datos del propietario' y 'Nombre de la mascota'.");
        return;
      }

      const paramsCliente = {
        sheet: "Clientes",
        nuevo: "true",
        "Nombre del propietario": propietario,
        "Número de Teléfono": telefono,
        "Correo": correo,
        "Nombre de la mascota": nombreMascota,
        "Especie": especie,
        "Raza": raza,
        "Edad": edad,
        "Peso": peso,
        "Esterilizado": esterilizado,
        "Observaciones": observaciones
      };
      const qsPartsCliente = Object.entries(paramsCliente)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      
      try {
        const respCliente = await jsonpRequest(`${GAS_BASE_URL}?${qsPartsCliente}`);
        if (!respCliente.success) {
          alert("Error al dar de alta el cliente: " + (respCliente.error || "desconocido"));
          return;
        }
        clienteId = respCliente["ID fila"];
      } catch (err) {
        alert("Error al crear cliente: " + err.message);
        return;
      }

      motivo = prompt("Ingrese el motivo de la cita para " + nombreMascota + ":");
      if (!motivo?.trim()) {
        alert("La cita debe tener un motivo.");
        return;
      }
    } else {
      nombreMascota = mascotaSelect?.value;
      if (!nombreMascota) {
        alert("Seleccione primero una mascota existente o marque 'Nueva mascota'.");
        return;
      }
      const clientes = await loadAllClients();
      const fila = clientes.find(c => c["Nombre de la mascota"] === nombreMascota);
      if (!fila) {
        alert("No se encontró esa mascota en el sistema.");
        return;
      }
      clienteId = fila["cliente Id"];
      motivo = prompt("Ingrese el motivo de la cita para " + nombreMascota + ":");
      if (!motivo?.trim()) {
        alert("La cita debe tener un motivo.");
        return;
      }
    }

    const paramsCita = {
      sheet: "Citas",
      nuevo: "true",
      "Fecha": fecha,
      "Hora": hora,
      "ID cliente": clienteId,
      "Nombre de la mascota": nombreMascota,
      "Motivo": motivo
    };
    const qsPartsCita = Object.entries(paramsCita)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    try {
      const respCita = await jsonpRequest(`${GAS_BASE_URL}?${qsPartsCita}`);
      if (!respCita.success) {
        alert("Error al guardar la cita: " + (respCita.error || "desconocido"));
        return;
      }
      alert("¡Cita guardada con éxito!");
      __allCitasCache = null;
      __appointmentsCount = {};
      reservationFormDiv.style.display = "none";
      renderCalendar();
    } catch (err) {
      alert("Error al guardar la cita: " + err.message);
    }
  });

  document.getElementById("prev-month")?.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("next-month")?.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // ============================
  // 6) Funciones auxiliares
  // ============================

  async function populateClientPetFields(container) {
    const clients = await loadAllClients();
    container.querySelectorAll("select.pet-select").forEach(selectEl => {
      selectEl.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Seleccione una mascota";
      selectEl.appendChild(placeholder);
      clients.forEach(cliente => {
        const petName = cliente["Nombre de la mascota"];
        if (petName?.trim()) {
          const opt = document.createElement("option");
          opt.value = petName;
          opt.textContent = petName;
          selectEl.appendChild(opt);
        }
      });
    });
  }

  // ============================
  // 7) Inicialización
  // ============================

  document.querySelectorAll('a[data-module]').forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const file = link.dataset.module.trim();

      overlay.innerHTML = `
        <div class="modal-overlay-content">
          <button id="close-modal" aria-label="Cerrar módulo">×</button>
          <div class="loading-msg">Cargando…</div>
        </div>`;
      overlay.classList.add("visible");

      overlay.addEventListener("click", ev => {
        if (ev.target === overlay) closeModal();
      });
      overlay.querySelector("#close-modal")?.addEventListener("click", closeModal);

      try {
        const html = await fetch(file).then(r => r.text());
        const container = overlay.querySelector(".modal-overlay-content");
        container.innerHTML = `<button id="close-modal" aria-label="Cerrar módulo">×</button>`;
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();

        const scripts = tpl.content.querySelectorAll("script");
        const fragment = tpl.content.cloneNode(true);
        fragment.querySelectorAll("script").forEach(s => s.remove());

        const contentDiv = document.createElement("div");
        contentDiv.appendChild(fragment);
        container.appendChild(contentDiv);

        await populateClientPetFields(container);

        scripts.forEach(oldScript => {
          const newScript = document.createElement("script");
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          container.appendChild(newScript);
        });

        container.querySelector("#close-modal")?.addEventListener("click", closeModal);
      } catch (err) {
        const container = overlay.querySelector(".modal-overlay-content");
        container.innerHTML = `
          <button id="close-modal" aria-label="Cerrar módulo">×</button>
          <p style="padding:1em;color:#b71c1c;">Error al cargar el módulo.</p>
        `;
        container.querySelector("#close-modal")?.addEventListener("click", closeModal);
      }
    });
  });

  function closeModal() {
    overlay.classList.remove("visible");
    overlay.innerHTML = "";
  }

  function showGlobalError(message) {
    const existingError = document.getElementById("global-error");
    if (existingError) {
      existingError.remove();
    }
    
    const errorDiv = document.createElement("div");
    errorDiv.id = "global-error";
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ffebee;
      color: #b71c1c;
      padding: 15px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 80%;
      text-align: center;
      border: 1px solid #ffcdd2;
    `;
    
    errorDiv.innerHTML = `
      <p style="margin: 0 0 10px 0; font-weight: bold;">⚠️ Error</p>
      <p style="margin: 0 0 15px 0;">${message}</p>
      <button onclick="location.reload()" style="
        background: #b71c1c;
        color: white;
        border: none;
        padding: 8px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Reintentar</button>
    `;
    
    document.body.appendChild(errorDiv);
  }

  // Iniciar aplicación
  renderCalendar();

  // Exponer funciones globales
  window.loadAllCitas = loadAllCitas;
  window.__appointmentsCount = __appointmentsCount;
});
