// =======================
// main.js (JavaScript General)
// =======================

document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) CONFIGURACIÓN: URL DE TU WEB APP
  // ======================================
  // Sustituye esta URL por la que te devolvió tu Apps Script al hacer "Deploy → Web App"
  const GAS_BASE_URL = "https://script.google.com/macros/s/XXXXXXXXXX/exec";

  // ============================
  // 1) CACHE PARA CLIENTES Y CITAS
  // ============================
  let __clientsCache = null;      // guardará [{ID,...,"Nombre mascota",...}, ...]
  let __appointmentsCache = {};   // map { "YYYY-MM-DD": [ { hora:"10:30", mascota:"Fido", motivo:"Vacunas", clienteId:"3" }, ... ] }

  /**
   * loadAllClients()
   *  - Si ya tenemos __clientsCache (array), lo devolvemos.
   *  - Si no, hacemos un fetch GET a GAS_BASE_URL + "?sheet=Clientes" (o sin params si tu Apps Script ya devuelve clientes por defecto).
   *  - Guardamos la respuesta (arreglo de objetos) en __clientsCache y la retornamos.
   */
  async function loadAllClients() {
    if (Array.isArray(__clientsCache)) {
      return __clientsCache;
    }
    try {
      // Si tu Apps Script está configurado para devolver "Clientes" por defecto en doGet(), basta con usar GAS_BASE_URL.
      // Si en tu Apps Script haces switch por parámetro sheet=Clientes o sheet=Citas, entonces harías:
      // const url = GAS_BASE_URL + "?sheet=Clientes";
      const url = GAS_BASE_URL + "?sheet=Clientes";
      const resp = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      __clientsCache = data; // Guarda [{ID, "Nombre completo", "Nombre mascota", ...}, ...]
      return __clientsCache;
    } catch (err) {
      console.error("Error cargando clientes:", err);
      return [];
    }
  }

  /**
   * loadAppointmentsByDate(fecha)
   *  - Fecha en formato "YYYY-MM-DD".
   *  - Si ya está en __appointmentsCache[fecha], devolvemos ese arreglo.
   *  - Si no, hacemos fetch GET a GAS_BASE_URL+"?sheet=Citas" y filtramos solo las citas de esa fecha.
   *  - Guardamos en cache por fecha y devolvemos el arreglo de citas para ese día.
   *  - Cada cita debe tener al menos: { fecha: "YYYY-MM-DD", hora:"HH:MM", mascota:"NombreMascota", motivo:"Texto", clienteId:"3" }
   */
  async function loadAppointmentsByDate(fecha) {
    if (Array.isArray(__appointmentsCache[fecha])) {
      return __appointmentsCache[fecha];
    }
    try {
      const url = GAS_BASE_URL + "?sheet=Citas";
      const resp = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const allCitas = await resp.json(); 
      // Esperamos que allCitas sea algo como:
      // [ { "Fecha": "2025-06-05", "Hora": "10:30", "ID cliente": "2", "Nombre mascota": "Firulais", "Motivo": "Vacunas" }, ... ]
      // Filtramos solo fecha = parametro
      const citasDelDia = allCitas.filter(cita => cita["Fecha"] === fecha);
      __appointmentsCache[fecha] = citasDelDia;
      return citasDelDia;
    } catch (err) {
      console.error("Error cargando citas:", err);
      return [];
    }
  }

  /**
   * addNewClient(clienteObj)
   *  - Envía un POST a GAS_BASE_URL con sheet=Clientes para agregar un cliente nuevo.
   *  - clienteObj debe tener exactamente las mismas claves que los encabezados en la hoja "Clientes".
   *  - Invalida __clientsCache para que la próxima llamada recargue desde la hoja.
   */
  async function addNewClient(clienteObj) {
    try {
      const url = GAS_BASE_URL + "?sheet=Clientes";
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clienteObj)
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      __clientsCache = null;
      return data; // { success: true } o { error: "mensaje" }
    } catch (err) {
      console.error("Error agregando cliente:", err);
      throw err;
    }
  }

  /**
   * addNewAppointment(citaObj)
   *  - Envía un POST a GAS_BASE_URL con sheet=Citas para agregar una cita nueva.
   *  - citaObj debe tener claves: "Fecha", "Hora", "ID cliente", "Nombre mascota", "Motivo"
   *  - Invalida __appointmentsCache para la fecha afectada
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
      // Invalida cache solo para esa fecha
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
  // 2) MODAL OVERLAY + CARGA DINÁMICA DE MÓDULOS (HTML)
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
  // 3) LÓGICA DEL CALENDARIO + ANIMACIONES
  // ===================================
  let currentDate = new Date();
  const card = document.getElementById("card");
  const daysEl = document.getElementById("days");
  const monthYearEl = document.getElementById("month-year");
  const reservationFormDiv = document.getElementById("reservation-form");
  const formDate = document.getElementById("form-date");
  const formTime = document.getElementById("form-time");
  const petSelect = document.getElementById("mascota");
  const ownerInfoDiv = document.getElementById("owner-info");
  const newChk = document.getElementById("new-pet");
  const newPetFields = document.getElementById("new-pet-fields");
  const backToCalendarBtn = document.getElementById("back-to-calendar");
  const slotListEl = document.getElementById("slot-list");

  /**
   * renderCalendar()
   *  - Muestra el panel de calendario y oculta el formulario de reserva.
   *  - Dibuja cada día del mes con su data-date="YYYY-MM-DD".
   *  - Llama a loadAppointmentsByDate(fecha) para contar cuántas citas hay ese día
   *    y asigna la clase correspondiente (.low / .medium / .full).
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
    const firstDayIndex = new Date(y, m, 1).getDay() || 7;
    const totalDays = new Date(y, m + 1, 0).getDate();

    // Espacios vacíos hasta el primer día
    for (let i = 1; i < firstDayIndex; i++) {
      daysEl.appendChild(document.createElement("div"));
    }

    // Dibujar cada día
    for (let d = 1; d <= totalDays; d++) {
      const dayCell = document.createElement("div");
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      dayCell.textContent = d;
      dayCell.dataset.date = dateStr;

      // Pedir cuántas citas hay ese día
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

  // Cada día clickable que tenga data-date
  function activateDateClicks() {
    document.querySelectorAll("#days div[data-date]").forEach(el => {
      el.addEventListener("click", async () => {
        const selectedDate = el.dataset.date;
        document.getElementById("slot-date").textContent = selectedDate;
        flipToSlots(selectedDate);
      });
    });
  }

  // Animación: voltear la tarjeta para mostrar horarios
  function flipToSlots(date) {
    card.classList.add("flipped1");
    setTimeout(() => loadSlots(date), 400);
  }

  /**
   * loadSlots(fecha)
   *  - Pide todas las citas de ese día con loadAppointmentsByDate(fecha).
   *  - Genera la lista de horarios desde las 10:00 hasta las 18:30 cada 30 min.
   *  - Si una hora coincide con una cita, la pintamos con un texto “Mascota → Motivo”.
   *  - Si no hay cita, dejamos la hora “libre” y clickable para agendar.
   */
  async function loadSlots(fecha) {
    slotListEl.innerHTML = "";
    // Obtener las citas de ese día
    const citas = await loadAppointmentsByDate(fecha);
    // Construimos un mapa { "10:00": {mascota, motivo, clienteId}, ... }
    const mapaCitas = {};
    citas.forEach(cita => {
      mapaCitas[cita["Hora"]] = {
        mascota: cita["Nombre mascota"],
        motivo: cita["Motivo"],
        clienteId: cita["ID cliente"]
      };
    });

    // Horarios de 10:00 a 18:30
    for (let h = 10; h < 19; h++) {
      ["00", "30"].forEach(min => {
        const time = `${String(h).padStart(2, "0")}:${min}`;
        const li = document.createElement("li");
        if (mapaCitas[time]) {
          // Ya hay cita en esta hora: mostrar “Mascota → Motivo” y no permitir seleccionarlo
          const data = mapaCitas[time];
          li.textContent = `${time}  ${data.mascota} → ${data.motivo}`;
          li.classList.add("occupied"); 
          li.style.cursor = "not-allowed";
          li.style.opacity = "0.7";
        } else {
          // Hora disponible: clickable para elegir ese slot
          li.textContent = time;
          li.addEventListener("click", () => selectSlot(fecha, time));
        }
        slotListEl.appendChild(li);
      });
    }
    // Última opción de “URGENCIAS”
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
   *  - Al elegir un horario libre, ocultamos el calendario y mostramos el formulario.
   *  - Luego llamamos a renderForm(fecha, hora).
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
   *  - Rellena el formulario de cita con la fecha/hora seleccionadas.
   *  - Llama a populateClientPetFields(reservationFormDiv) para cargar la lista completa de mascotas.
   *  - Adjunta un listener al <select id="mascota"> para que, al cambiar de mascota, muestre los datos del dueño.
   */
  async function renderForm(fecha, hora) {
    formDate.value = fecha;
    formTime.value = hora;

    // Limpiar información previa
    ownerInfoDiv.innerHTML = "";

    // Llenar el <select id="mascota" class="pet-select">
    await populateClientPetFields(reservationFormDiv);

    // Cuando el usuario elija una mascota, mostrar datos del dueño
    const selPet = document.getElementById("mascota");
    selPet.addEventListener("change", async () => {
      const petSeleccionada = selPet.value;
      if (!petSeleccionada) {
        ownerInfoDiv.innerHTML = "";
        return;
      }
      // Buscar en el arreglo global de clientes la mascota seleccionada
      const clientes = await loadAllClients();
      // Puede haber varias filas con la misma mascota, pero asumimos que cada mascota es única.
      const fila = clientes.find(c => c["Nombre mascota"] === petSeleccionada);
      if (fila) {
        ownerInfoDiv.innerHTML = `
          <p><strong>Dueño:</strong> ${fila["Nombre completo"]}</p>
          <p><strong>Teléfono:</strong> ${fila["Teléfono"]}</p>
          <p><strong>Correo:</strong> ${fila["Correo electrónico"]}</p>
        `;
      } else {
        ownerInfoDiv.innerHTML = "<p style='color:red;'>Información de dueño no encontrada.</p>";
      }
    });

    // Ocultar “nueva mascota” si estaba marcado antes
    newChk.checked = false;
    newPetFields.style.display = "none";
    document.getElementById("new-pet-name").value = "";
    document.getElementById("new-pet-species").value = "";

    // Llevar el scroll hasta el formulario
    reservationFormDiv.scrollIntoView({ behavior: "smooth" });
  }

  // Toggle de “nueva mascota”
  newChk.addEventListener("change", () => {
    if (newChk.checked) {
      newPetFields.style.display = "block";
      petSelect.disabled = true;
    } else {
      newPetFields.style.display = "none";
      petSelect.disabled = false;
    }
  });

  // Cancelar formulario y volver al calendario
  document.getElementById("cancel-form").addEventListener("click", () => {
    reservationFormDiv.style.display = "none";
    renderCalendar();
  });

  // Manejar envío de formulario de cita
  document.getElementById("appointment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha = formDate.value;
    const hora = formTime.value;
    const nuevaMascota = newChk.checked;
    let clienteId, nombreMascota, motivo;

    if (nuevaMascota) {
      // Si es una nueva mascota, pedimos al usuario que capture también:
      // - Nombre completo del dueño
      // - Teléfono, correo
      // - Datos de la mascota (Nombre, especie, raza, edad, peso, esterilizado)
      // Para simplificar, aquí solo vamos a alertar que “no se implementa alta de nueva mascota aún”.
      alert("Dar de alta nueva mascota no está implementado en este formulario.");
      return;
    } else {
      // Mascota existente: tomamos el valor del <select id="mascota"> (es “Nombre mascota”)
      nombreMascota = document.getElementById("mascota").value;
      // Encontrar el cliente en la lista global
      const clientes = await loadAllClients();
      const fila = clientes.find(c => c["Nombre mascota"] === nombreMascota);
      if (!fila) {
        alert("No se encontró esa mascota en el sistema.");
        return;
      }
      clienteId = fila["ID"];
      // Pedimos el “motivo” de la cita al usuario (puedes reemplazarlo por un campo en el formulario si lo deseas)
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
      "Nombre mascota": nombreMascota,
      "Motivo": motivo
    };

    try {
      await addNewAppointment(nuevaCita);
      alert("¡Cita guardada con éxito!");
      reservationFormDiv.style.display = "none";
      // Luego de guardar, recargamos el calendario para actualizar colores y slots
      renderCalendar();
    } catch (err) {
      alert("Error al guardar la cita: " + err.message);
    }
  });

  // Navegar meses anterior/siguiente
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Render inicial del calendario al cargar la página
  renderCalendar();

  // ========================================
  // 4) Función para poblar select cliente/pet
  // ========================================
  async function populateClientPetFields(container) {
    const clients = await loadAllClients();

    // 4.1) Rellenar <select class="client-select">
    container.querySelectorAll("select.client-select").forEach(selectEl => {
      selectEl.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Seleccione un cliente";
      selectEl.appendChild(placeholder);
      clients.forEach(cliente => {
        const opt = document.createElement("option");
        opt.value = cliente["ID"] || cliente["Nombre completo"];
        opt.textContent = cliente["Nombre completo"];
        selectEl.appendChild(opt);
      });
    });

    // 4.2) Rellenar <select class="pet-select">
    container.querySelectorAll("select.pet-select").forEach(selectEl => {
      selectEl.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Seleccione una mascota";
      selectEl.appendChild(placeholder);
      clients.forEach(cliente => {
        const petName = cliente["Nombre mascota"];
        if (petName && petName.trim() !== "") {
          const opt = document.createElement("option");
          opt.value = petName;
          opt.textContent = `${petName} (dueño: ${cliente["Nombre completo"]})`;
          selectEl.appendChild(opt);
        }
      });
    });
  }

});
