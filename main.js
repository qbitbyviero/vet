// =======================
// main.js (JavaScript General)
// =======================

document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) CONFIGURACIÓN: URL DE TU WEB APP
  // ======================================
  // Sustituye esta URL por la que te devolvió tu Apps Script al hacer "Deploy → Web App"
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbwKIpSWIwBmr8dK-Lif9zI87sn0getjJOajYnv4eDcq42PfJ8Sp90gKdVQUX8OQ2Oj3/exec";

  // ============================
  // 1) AUXILIAR: JSONP REQUEST
  // ============================
  // Inserta un <script> que llama al servidor con ?callback=___
  function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
      const callbackName = "__cb_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      // Definimos la función global que recibirá la respuesta
      window[callbackName] = function(data) {
        resolve(data);
        delete window[callbackName];
        script.remove();
      };
      const script = document.createElement("script");
      // Asegurarse de no duplicar &callback= si ya existe
      const separator = url.includes("?") ? "&" : "?";
      script.src = url + separator + "callback=" + callbackName;
      script.onerror = () => {
        reject(new Error("JSONP request falló para " + url));
        delete window[callbackName];
        script.remove();
      };
      document.body.appendChild(script);
    });
  }

  // ============================
  // 2) CACHE PARA CLIENTES Y CITAS
  // ============================
  let __clientsCache = null;      // [{ "cliente Id", "Nombre del propietario", ..., "Esterilizado", ...}, ...]
  let __appointmentsCache = {};   // { "YYYY-MM-DD": [ { Fecha, Hora, "ID cliente", "Nombre de la mascota", Motivo}, ... ] }

  /**
   * loadAllClients()
   *  - Si __clientsCache ya tiene datos, los devuelve.
   *  - Si no, hace JSONP a GAS_BASE_URL + "?sheet=Clientes".
   *  - Guarda en cache y retorna.
   */
  async function loadAllClients() {
    if (Array.isArray(__clientsCache)) {
      return __clientsCache;
    }
    try {
      const url = GAS_BASE_URL + "?sheet=Clientes";
      const data = await jsonpRequest(url);
      // data será algo como:
      // [ { "cliente Id":"1", "Nombre del propietario":"Juan Pérez", "Número de Teléfono":"555-1234", "Correo":"juan@ejemplo.com",
      //     "Nombre de la mascota":"Firulais", "Especie":"Perro", "Raza":"Labrador", "Edad":"4", "Peso":"20", "Esterilizado":"Sí", "Observaciones":"" },
      //   {...}, ... ]
      __clientsCache = data;
      return __clientsCache;
    } catch (err) {
      console.error("Error cargando clientes:", err);
      return [];
    }
  }

  /**
   * loadAppointmentsByDate(fecha)
   *  - Recibe fecha en "YYYY-MM-DD".
   *  - Si ya existe __appointmentsCache[fecha], lo devuelve.
   *  - Si no, hace JSONP a GAS_BASE_URL + "?sheet=Citas", filtra por fecha, guarda en cache y devuelve.
   */
  async function loadAppointmentsByDate(fecha) {
    if (Array.isArray(__appointmentsCache[fecha])) {
      return __appointmentsCache[fecha];
    }
    try {
      const url = GAS_BASE_URL + "?sheet=Citas";
      const allCitas = await jsonpRequest(url);
      // allCitas: [ { "Fecha":"2025-06-05", "Hora":"10:30", "ID cliente":"2", "Nombre de la mascota":"Firulais", "Motivo":"Vacunas" }, ... ]
      const citasDelDia = allCitas.filter(cita => cita["Fecha"] === fecha);
      __appointmentsCache[fecha] = citasDelDia;
      return citasDelDia;
    } catch (err) {
      console.error("Error cargando citas:", err);
      return [];
    }
  }

  /**
   * addNewAppointment(citaObj)
   *  - Envía un POST (XHR normal, no JSONP) a GAS_BASE_URL + "?sheet=Citas"
   *  - citaObj = { "Fecha": "...", "Hora": "...", "ID cliente":"...", "Nombre de la mascota":"...", "Motivo":"..." }
   *  - Invalida cache para la fecha específica.
   */
  async function addNewAppointment(citaObj) {
    try {
      const url = GAS_BASE_URL + "?sheet=Citas";
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(citaObj)
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json(); 
      if (citaObj.Fecha) {
        delete __appointmentsCache[citaObj.Fecha];
      }
      return data; // { success: true }
    } catch (err) {
      console.error("Error agregando cita:", err);
      throw err;
    }
  }

  // ================================================
  // 3) MODAL OVERLAY + CARGA DINÁMICA DE MÓDULOS (HTML)
  // ================================================
  const overlay = document.getElementById("modal-overlay");
  function closeModal() {
    overlay.classList.remove("visible");
    overlay.innerHTML = "";
  }
  document.querySelectorAll('a[data-module]').forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const file = link.dataset.module.trim();
      overlay.innerHTML = `
        <div class="modal-overlay-content">
          <button id="close-modal" aria-label="Cerrar módulo">×</button>
          <div class="loading-msg">Cargando...</div>
        </div>
      `;
      overlay.classList.add("visible");
      overlay.addEventListener("click", ev => {
        if (ev.target === overlay) closeModal();
      });
      overlay.querySelector("#close-modal").addEventListener("click", closeModal);

      try {
        const html = await fetch(file).then(r => r.text());
        const container = overlay.querySelector(".modal-overlay-content");
        container.innerHTML = `<button id="close-modal" aria-label="Cerrar módulo">×</button>`;
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();

        // Extraer y remover scripts antes de inyectar el HTML
        const scripts = tpl.content.querySelectorAll("script");
        const fragment = tpl.content.cloneNode(true);
        fragment.querySelectorAll("script").forEach(s => s.remove());

        const contentDiv = document.createElement("div");
        contentDiv.appendChild(fragment);
        container.appendChild(contentDiv);

        // POBLAR AUTOMÁTICO DE SELECTS: clientes/mascotas
        await populateClientPetFields(container);

        // REINSERTAR TODOS LOS <script> PARA QUE SE EJECUTEN
        scripts.forEach(oldScript => {
          const newScript = document.createElement("script");
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          container.appendChild(newScript);
        });

        container.querySelector("#close-modal").addEventListener("click", closeModal);
      } catch (err) {
        const container = overlay.querySelector(".modal-overlay-content");
        container.innerHTML = `
          <button id="close-modal" aria-label="Cerrar módulo">×</button>
          <p style="padding:1em;color:#b71c1c;">Error al cargar el módulo.</p>
        `;
        container.querySelector("#close-modal").addEventListener("click", closeModal);
      }
    });
  });

  // ===================================
  // 4) LÓGICA DEL CALENDARIO + ANIMACIONES
  // ===================================
  let currentDate = new Date();
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

  /**
   * renderCalendar()
   *  - Muestra panel de calendario y oculta formulario.
   *  - Dibuja cada día del mes con data-date="YYYY-MM-DD".
   *  - Para cada día, llama loadAppointmentsByDate y asigna clase según #citas.
   */
  async function renderCalendar() {
    document.getElementById("calendar").style.display = "block";
    reservationFormDiv.style.display = "none";

    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    monthYearEl.textContent = currentDate.toLocaleString("es-ES", {
      month: "long",
      year: "numeric"
    });

    daysEl.innerHTML = "";
    const firstDayIndex = (new Date(y, m, 1).getDay() || 7);
    const totalDays = new Date(y, m + 1, 0).getDate();

    // Celdas vacías hasta el primer día real
    for (let i = 1; i < firstDayIndex; i++) {
      daysEl.appendChild(document.createElement("div"));
    }

    // Dibujar cada día
    for (let d = 1; d <= totalDays; d++) {
      const dayCell = document.createElement("div");
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      dayCell.textContent = d;
      dayCell.dataset.date = dateStr;

      // Pedir cuántas citas hay en esa fecha
      const citas = await loadAppointmentsByDate(dateStr);
      const count = citas.length;
      if (count >= 4) {
        dayCell.classList.add("full");      // 4 o más citas → sin espacio
      } else if (count === 3) {
        dayCell.classList.add("medium");    // 3 citas → pocas plazas
      } else if (count > 0) {
        dayCell.classList.add("low");       // 1 o 2 citas → espacios disponibles
      }
      if (count > 0) {
        dayCell.setAttribute("data-count", count);
      }

      // Marcar hoy
      if (dateStr === new Date().toISOString().slice(0, 10)) {
        dayCell.classList.add("today");
      }

      daysEl.appendChild(dayCell);
    }
    activateDateClicks();
  }

  // Habilitar clic en cada <div data-date>
  function activateDateClicks() {
    document.querySelectorAll("#days div[data-date]").forEach(el => {
      el.addEventListener("click", () => {
        const selectedDate = el.dataset.date;
        document.getElementById("slot-date").textContent = selectedDate;
        flipToSlots(selectedDate);
      });
    });
  }

  // Animación: voltear tarjeta para ver horarios
  function flipToSlots(date) {
    card.classList.add("flipped1");
    setTimeout(() => loadSlots(date), 400);
  }

  /**
   * loadSlots(fecha)
   *  - Trae citas de la fecha (JSONP).
   *  - Genera <li> 10:00–18:30 cada 30m; si hay cita, la marca como ocupada.
   */
  async function loadSlots(fecha) {
    slotListEl.innerHTML = "";
    const citas = await loadAppointmentsByDate(fecha);
    const mapaCitas = {};
    citas.forEach(cita => {
      mapaCitas[cita["Hora"]] = {
        mascota: cita["Nombre de la mascota"],
        motivo: cita["Motivo"],
        clienteId: cita["ID cliente"]
      };
    });

    for (let h = 10; h < 19; h++) {
      ["00", "30"].forEach(min => {
        const time = `${String(h).padStart(2, "0")}:${min}`;
        const li = document.createElement("li");
        if (mapaCitas[time]) {
          const data = mapaCitas[time];
          li.textContent = `${time}  ${data.mascota} → ${data.motivo}`;
          li.classList.add("occupied");
          li.style.cursor = "not-allowed";
          li.style.opacity = "0.7";
        } else {
          li.textContent = time;
          li.addEventListener("click", () => selectSlot(fecha, time));
        }
        slotListEl.appendChild(li);
      });
    }
    // URGENCIAS
    const urg = document.createElement("li");
    urg.textContent = "🚨 URGENCIAS";
    urg.addEventListener("click", () => selectSlot(fecha, "URGENCIAS"));
    slotListEl.appendChild(urg);
  }

  // Regresa del panel “back” al calendario
  backToCalendarBtn.addEventListener("click", () => {
    card.classList.remove("flipped1");
    renderCalendar();
  });

  /**
   * selectSlot(fecha, hora)
   *  - Oculta calendario y llama renderForm para mostrar el formulario.
   */
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

  /**
   * renderForm(fecha, hora)
   *  - Pone fecha/hora en el formulario.
   *  - Llama a populateClientPetFields para rellenar <select id="mascota">.
   *  - Al cambiar mascota, muestra datos del dueño y muestra “Corregir datos”.
   */
  async function renderForm(fecha, hora) {
    formDate.value = fecha;
    formTime.value = hora;

    // Limpiar estado previo
    ownerInfoDiv.innerHTML = "";
    document.getElementById("edit-client-btn").style.display = "none";
    document.getElementById("edit-client-fields").style.display = "none";

    // Llenar <select id="mascota">
    await populateClientPetFields(reservationFormDiv);

    // Al cambiar de mascota:
    const selPet = document.getElementById("mascota");
    selPet.addEventListener("change", async () => {
      const petSeleccionada = selPet.value;
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
        ownerInfoDiv.innerHTML = "<p style='color:red;'>Información del dueño no encontrada.</p>";
        document.getElementById("edit-client-btn").style.display = "none";
      }
    });

    // Ocultar nueva mascota si estaba marcada
    newChk.checked = false;
    newPetFields.style.display = "none";
    document.getElementById("new-pet-name").value = "";
    document.getElementById("new-pet-species").value = "";

    // Scroll hacia el formulario
    reservationFormDiv.scrollIntoView({ behavior: "smooth" });
  }

  // Toggle nueva mascota
  newChk.addEventListener("change", () => {
    if (newChk.checked) {
      newPetFields.style.display = "block";
      document.getElementById("mascota").disabled = true;
      document.getElementById("owner-info").innerHTML = "";
      document.getElementById("edit-client-btn").style.display = "none";
      document.getElementById("edit-client-fields").style.display = "none";
    } else {
      newPetFields.style.display = "none";
      document.getElementById("mascota").disabled = false;
    }
  });

  // Cancelar el formulario y volver al calendario
  document.getElementById("cancel-form").addEventListener("click", () => {
    reservationFormDiv.style.display = "none";
    renderCalendar();
  });

  // Botón “Corregir datos”: mostrar inputs de edición
  document.getElementById("edit-client-btn").addEventListener("click", async () => {
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

  // Guardar cambios del cliente (POR AHORA, MUESTRA UN ALERT. Para persistir, hay que implementar updateClient en Apps Script)
  document.getElementById("save-client-changes").addEventListener("click", async () => {
    const petSeleccionada = document.getElementById("mascota").value;
    const age = document.getElementById("edit-age").value;
    const weight = document.getElementById("edit-weight").value;
    const email = document.getElementById("edit-email").value;
    if (!petSeleccionada) return;

    alert(
      "Datos actualizados para '" + petSeleccionada + "':\n" +
      "Edad: " + age + "\n" +
      "Peso: " + weight + " kg\n" +
      "Correo: " + email +
      "\n\n(STUB: para guardar en la hoja “Clientes”, implementa updateClient en Apps Script)."
    );
    document.getElementById("edit-client-fields").style.display = "none";
  });

  // Manejar envío del formulario de cita
  document.getElementById("appointment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha = formDate.value;
    const hora = formTime.value;
    const nuevaMascota = newChk.checked;
    let clienteId, nombreMascota, motivo;

    if (nuevaMascota) {
      alert("Alta de nueva mascota aún no implementada en este formulario.");
      return;
    } else {
      nombreMascota = document.getElementById("mascota").value;
      const clientes = await loadAllClients();
      const fila = clientes.find(c => c["Nombre de la mascota"] === nombreMascota);
      if (!fila) {
        alert("No se encontró esa mascota en el sistema.");
        return;
      }
      clienteId = fila["cliente Id"];
      motivo = prompt("Ingrese el motivo de la cita para " + nombreMascota + ":");
      if (!motivo) {
        alert("La cita debe tener un motivo.");
        return;
      }
    }

    // Construir objeto para guardar en “Citas”
    const nuevaCita = {
      "Fecha": fecha,
      "Hora": hora,
      "ID cliente": clienteId,
      "Nombre de la mascota": nombreMascota,
      "Motivo": motivo
    };

    try {
      await addNewAppointment(nuevaCita);
      alert("¡Cita guardada con éxito!");
      reservationFormDiv.style.display = "none";
      renderCalendar();
    } catch (err) {
      alert("Error al guardar la cita: " + err.message);
    }
  });

  // Navegar meses
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Render inicial
  renderCalendar();

  // ========================================
  // 5) Función para poblar <select class="pet-select">
  // ========================================
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
        if (petName && petName.trim() !== "") {
          const opt = document.createElement("option");
          opt.value = petName;
          opt.textContent = petName;
          selectEl.appendChild(opt);
        }
      });
    });
  }

});
