// =======================
// main.js (JavaScript General) - Versión Corregida
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) Configuración inicial
  // ======================================
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzBpu2EGoH1415ZCRA9f0SGDRRE-hw2Gx_WZeLNnfSTN-8KTCy9HCbHYUWJ1f-AePjvVA/exec";

  // Elementos del DOM - TODOS definidos al inicio
  const card = document.getElementById("card");
  const daysEl = document.getElementById("days");
  const monthYearEl = document.getElementById("month-year");
  const reservationFormDiv = document.getElementById("reservation-form");
  const formDate = document.getElementById("form-date");
  const formTime = document.getElementById("form-time");
  const ownerInfoDiv = document.getElementById("owner-info");
  const newChk = document.getElementById("new-pet"); // Definido correctamente
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

  function normalizeDate(dateStr) {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const d = new Date(dateStr);
    if (!isNaN(d)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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
      const timeParts = timeStr.split(' ');
      if (timeParts.length === 2) {
        const [time, period] = timeParts;
        const [hours, minutes] = time.split(':');
        
        let hours24 = parseInt(hours);
        if (period.toLowerCase() === 'p.m.' && hours24 < 12) {
          hours24 += 12;
        }
        if (period.toLowerCase() === 'a.m.' && hours24 === 12) {
          hours24 = 0;
        }
        
        return `${String(hours24).padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
    }
    
    return '';
  }

  // ============================
  // 2) Funciones de carga de datos
  // ============================

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
      
      __allCitasCache = data.map(cita => ({
        ...cita,
        Fecha: normalizeDate(cita.Fecha || cita.fecha || ''),
        Hora: normalizeTime(cita.Hora || cita.hora || '')
      }));
      
      __appointmentsCount = {};
      __allCitasCache.forEach(cita => {
        if (cita.Fecha) {
          __appointmentsCount[cita.Fecha] = (__appointmentsCount[cita.Fecha] || 0) + 1;
        }
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

  // ============================
  // 3) Funciones del calendario
  // ============================

  async function renderCalendar() {
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
      const dateStr = `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      dayCell.textContent = d;
      dayCell.dataset.date = dateStr;

      const count = getCountByDate(dateStr);
      if (count >= 4) {
        dayCell.classList.add("full");
      } else if (count === 3) {
        dayCell.classList.add("medium");
      } else if (count > 0) {
        dayCell.classList.add("low");
      }
      if (count > 0) {
        dayCell.setAttribute("data-count", count);
      }
      if (dateStr === new Date().toISOString().slice(0,10)) {
        dayCell.classList.add("today");
      }

      daysEl.appendChild(dayCell);
    }
    activateDateClicks();
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

  async function loadSlots(fecha) {
    console.log(`Cargando slots para: ${fecha}`);
    slotListEl.innerHTML = '<div class="loading">Cargando horarios...</div>';
    
    try {
      const allCitas = await loadAllCitas();
      const citasDelDia = allCitas.filter(cita => cita.Fecha === fecha);
      
      const horasOcupadas = {};
      citasDelDia.forEach(cita => {
        if (cita.Hora) {
          horasOcupadas[cita.Hora] = {
            mascota: cita['Nombre de la mascota'] || 'Sin nombre',
            motivo: cita.Motivo || 'Sin motivo'
          };
        }
      });
      
      slotListEl.innerHTML = '';
      for (let h = 10; h < 19; h++) {
        for (let m = 0; m < 60; m += 30) {
          const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          const li = document.createElement('li');
          li.className = 'slot-line';
          
          if (horasOcupadas[hora]) {
            const cita = horasOcupadas[hora];
            li.innerHTML = `
              <span class="hora">${hora}</span>
              <span class="separador">----></span>
              <span class="mascota">${cita.mascota}</span>
              <span class="separador">----></span>
              <span class="motivo">${cita.motivo}</span>
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

  function selectSlot(fecha, hora) {
    const backPanel = document.querySelector(".back");
    backPanel.style.transition = "opacity 0.3s ease";
    backPanel.style.opacity = "0";
    setTimeout(() => {
      document.getElementById("calendar").style.display = "none";
      renderForm(fecha, hora);
      reservationFormDiv.style.opacity = "0";
      reservationFormDiv.style.display = "block";
      setTimeout(() => {
        reservationFormDiv.style.transition = "opacity 0.4s ease";
        reservationFormDiv.style.opacity = "1";
      }, 50);
      backPanel.style.opacity = "1";
    }, 300);
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

  // Event listeners para módulos
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

  // Iniciar aplicación
  renderCalendar();

  // Exponer funciones globales si es necesario
  window.loadAllCitas = loadAllCitas;
  window.__appointmentsCount = __appointmentsCount;
});
