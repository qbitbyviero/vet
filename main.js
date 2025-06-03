// =======================
// main.js (JavaScript General)
// =======================

document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) URL DE TU WEB APP (Apps Script)
  // ======================================
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbwmKOasmVtpKEuUFD2r3IAG_mbOL87W-7b_r2q_h5wL1hiz0k0ja6m4G7ZqHQJoxj_NaQ/exec";

  // ============================
  // 1) JSONP REQUEST (para GET)
  //    — Evita cualquier problema de CORS
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
  let __clientsCache = null;      // [ { "cliente Id":"CID: 000050", "Nombre del propietario":"…", … }, … ]
  let __allCitasCache = null;     // [ { "Fecha":"2025-06-04","Hora":"11:30","ID cliente":"CID: 000050","Nombre de la mascota":"Firulais","Motivo":"Vacunas" }, … ]
  let __appointmentsCount = {};   // { "2025-06-04": 1, "2025-06-05": 2, … }

  /**
   * loadAllClients()
   * — Si ya existe __clientsCache, lo devuelve.
   * — Si no, hace JSONP GET a “?sheet=Clientes”.
   */
  async function loadAllClients() {
    if (Array.isArray(__clientsCache)) {
      return __clientsCache;
    }
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

  /**
   * loadAllCitas()
   * — Si ya existe __allCitasCache, lo devuelve.
   * — Si no, hace JSONP GET a “?sheet=Citas” y arma __appointmentsCount.
   */
  async function loadAllCitas() {
    if (Array.isArray(__allCitasCache)) {
      return __allCitasCache;
    }
    try {
      const url = GAS_BASE_URL + "?sheet=Citas";
      const data = await jsonpRequest(url);
      __allCitasCache = data;
      __appointmentsCount = {};
      data.forEach(cita => {
        const f = cita["Fecha"];
        if (!__appointmentsCount[f]) __appointmentsCount[f] = 0;
        __appointmentsCount[f]++;
      });
      return __allCitasCache;
    } catch (err) {
      console.error("Error cargando citas:", err);
      return [];
    }
  }

  /**
   * getCountByDate(fecha)
   * — Retorna cuántas citas hay en “fecha” (YYYY-MM-DD) o 0 si no existe.
   */
  function getCountByDate(fecha) {
    return __appointmentsCount[fecha] || 0;
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
          <div class="loading-msg">Cargando…</div>
        </div>`;
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
   * — Carga TODAS las citas UNA sola vez y arma __appointmentsCount.
   * — Dibuja cada día del mes con la clase (.full, .medium, .low) según cuántas citas haya.
   */
  async function renderCalendar() {
    document.getElementById("calendar").style.display = "block";
    reservationFormDiv.style.display = "none";

    // 1) Cargar TODO el listado de citas (solo la primera vez)
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

      // Contar cuántas citas hay para esa fecha
      const count = getCountByDate(dateStr);
      if (count >= 4) {
        dayCell.classList.add("full");     // 4 o más → sin espacio
      } else if (count === 3) {
        dayCell.classList.add("medium");   // 3 citas → pocas plazas
      } else if (count > 0) {
        dayCell.classList.add("low");      // 1 o 2 citas → espacios disponibles
      }
      if (count > 0) {
        dayCell.setAttribute("data-count", count);
      }
      // Marcar “hoy”
      if (dateStr === new Date().toISOString().slice(0, 10)) {
        dayCell.classList.add("today");
      }

      daysEl.appendChild(dayCell);
    }
    activateDateClicks();
  }

  // Habilitar clic en cada día (con data-date)
  function activateDateClicks() {
    document.querySelectorAll("#days div[data-date]").forEach(el => {
      el.addEventListener("click", () => {
        const selectedDate = el.dataset.date;
        document.getElementById("slot-date").textContent = selectedDate;
        flipToSlots(selectedDate);
      });
    });
  }

  // Animación “voltear” para mostrar horarios
  function flipToSlots(date) {
    card.classList.add("flipped1");
    setTimeout(() => loadSlots(date), 400);
  }

  /**
   * loadSlots(fecha)
   * — Filtra en memoria las citas de “fecha” y arma mapa “hora→datosCita”.
   * — Dibuja cada <li> desde 10:00 hasta 18:30; si la hora está ocupada, la marca,
   *   si no, deja onclick para selectSlot().
   */
  async function loadSlots(fecha) {
    slotListEl.innerHTML = "";
    const allCitas = await loadAllCitas();
    const citasDelDia = allCitas.filter(c => c["Fecha"] === fecha);
    const mapaCitas = {};
    citasDelDia.forEach(cita => {
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
    // Opción “URGENCIAS”
    const urg = document.createElement("li");
    urg.textContent = "🚨 URGENCIAS";
    urg.addEventListener("click", () => selectSlot(fecha, "URGENCIAS"));
    slotListEl.appendChild(urg);
  }

  // Regresa del “back” al calendario
  backToCalendarBtn.addEventListener("click", () => {
    card.classList.remove("flipped1");
    renderCalendar();
  });

  /**
   * selectSlot(fecha, hora)
   * — Oculta el calendario y muestra el formulario
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
   * — Rellena inputs de fecha/hora.
   * — Hace populateClientPetFields(..) para llenar <select id="mascota" class="pet-select">.
   * — Agrega listener a <select id="mascota"> para mostrar datos del dueño y botón “Corregir datos”.
   * — Si marcó “Nueva mascota”, despliega sub‐formulario para crear cliente completo.
   */
  async function renderForm(fecha, hora) {
    formDate.value = fecha;
    formTime.value = hora;

    // Limpiar estado previo:
    ownerInfoDiv.innerHTML = "";
    document.getElementById("edit-client-btn").style.display = "none";
    document.getElementById("edit-client-fields").style.display = "none";
    document.getElementById("edit-age").value = "";
    document.getElementById("edit-weight").value = "";
    document.getElementById("edit-email").value = "";

    // 1) Rellenar <select id="mascota" class="pet-select">
    await populateClientPetFields(reservationFormDiv);

    // 2) Cuando el usuario elija mascota existente, mostrar datos
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
        ownerInfoDiv.innerHTML = "<p style='color:red;'>Dueño no encontrado.</p>";
        document.getElementById("edit-client-btn").style.display = "none";
      }
    });

    // 3) Ocultar “nueva mascota” si venía marcado de antes
    newChk.checked = false;
    newPetFields.style.display = "none";
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

  // Toggle “Nueva mascota”
  newChk.addEventListener("change", () => {
    if (newChk.checked) {
      newPetFields.style.display = "block";
      document.getElementById("mascota").disabled = true;
      ownerInfoDiv.innerHTML = "";
      document.getElementById("edit-client-btn").style.display = "none";
      document.getElementById("edit-client-fields").style.display = "none";
    } else {
      newPetFields.style.display = "none";
      document.getElementById("mascota").disabled = false;
    }
  });

  // “Corregir datos cliente” (solo simulado; no modifica hoja por ahora)
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

  // “Guardar cambios cliente” (simulado; lanza alert)
  document.getElementById("save-client-changes").addEventListener("click", () => {
    const petSeleccionada = document.getElementById("mascota").value;
    const age    = document.getElementById("edit-age").value;
    const weight = document.getElementById("edit-weight").value;
    const email  = document.getElementById("edit-email").value;
    if (!petSeleccionada) return;

    alert(
      "DATOS CLIENTE ACTUALIZADOS (simulado):\n" +
      "Mascota: " + petSeleccionada + "\n" +
      "Edad: " + age + " años\n" +
      "Peso: " + weight + " kg\n" +
      "Correo: " + email + "\n\n" +
      "(Para que esto realmente modifique la hoja, implementa `updateClient` en Apps Script)."
    );
    document.getElementById("edit-client-fields").style.display = "none";
  });

  // Cancelar formulario y volver al calendario
  document.getElementById("cancel-form").addEventListener("click", () => {
    reservationFormDiv.style.display = "none";
    renderCalendar();
  });

  /**
   * Al enviar el formulario “Guardar cita”:
   * — Si es “Nueva mascota”, primero crea el cliente nuevo vía JSONP GET.
   * — Luego, crea la cita (también vía JSONP GET).
   */
  document.getElementById("appointment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha = formDate.value;
    const hora = formTime.value;
    const nuevaMascota = newChk.checked;
    let clienteId, nombreMascota, motivo;

    if (nuevaMascota) {
      // 1) Recoger datos del mini‐formulario “new client”
      const propietario   = document.getElementById("new-owner-name").value.trim();
      const telefono      = document.getElementById("new-owner-phone").value.trim();
      const correo        = document.getElementById("new-owner-email").value.trim();
      nombreMascota       = document.getElementById("new-pet-name").value.trim();
      const especie       = document.getElementById("new-pet-species").value.trim();
      const raza          = document.getElementById("new-pet-breed").value.trim();
      const edad          = document.getElementById("new-pet-age").value.trim();
      const peso          = document.getElementById("new-pet-weight").value.trim();
      const esterilizado  = document.querySelector('input[name="new-pet-sterilizado"]:checked')
                             ? document.querySelector('input[name="new-pet-sterilizado"]:checked').value
                             : "";
      const observaciones = document.getElementById("new-pet-notes").value.trim();

      if (!propietario || !telefono || !correo || !nombreMascota) {
        alert("Por favor completa todos los campos de “Datos del propietario” y “Nombre de la mascota”.");
        return;
      }

      // 2) Crear cliente nuevo via JSONP GET
      const params = {
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
      const qsParts = [];
      Object.keys(params).forEach(k => {
        qsParts.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
      });
      const urlCrearCliente = GAS_BASE_URL + "?" + qsParts.join("&");
      let respCliente;
      try {
        respCliente = await jsonpRequest(urlCrearCliente);
        if (!respCliente.success) {
          alert("Error al dar de alta el cliente: " + (respCliente.error || "desconocido"));
          return;
        }
        clienteId = respCliente["cliente Id"]; // Ej. "CID: 000051"
      } catch (err) {
        alert("Error al crear cliente: " + err.message);
        return;
      }

      // 3) Pedir motivo de la cita
      motivo = prompt("Ingrese el motivo de la cita para " + nombreMascota + ":");
      if (!motivo || motivo.trim() === "") {
        alert("La cita debe tener un motivo.");
        return;
      }
    } else {
      // Mascota existente
      nombreMascota = document.getElementById("mascota").value;
      if (!nombreMascota) {
        alert("Seleccione primero una mascota existente o marque “Nueva mascota”.");
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
      if (!motivo || motivo.trim() === "") {
        alert("La cita debe tener un motivo.");
        return;
      }
    }

    // 4) Crear la cita vía JSONP GET
    const paramsCita = {
      sheet: "Citas",
      nuevo: "true",
      "Fecha": fecha,
      "Hora": hora,
      "ID cliente": clienteId + "",
      "Nombre de la mascota": nombreMascota,
      "Motivo": motivo
    };
    const qsPartsCita = [];
    Object.keys(paramsCita).forEach(k => {
      qsPartsCita.push(encodeURIComponent(k) + "=" + encodeURIComponent(paramsCita[k]));
    });
    const urlCrearCita = GAS_BASE_URL + "?" + qsPartsCita.join("&");
    try {
      const respCita = await jsonpRequest(urlCrearCita);
      if (!respCita.success) {
        alert("Error al guardar la cita: " + (respCita.error || "desconocido"));
        return;
      }
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
  // 5) populateClientPetFields(container)
  //    — Rellena todos los <select class="pet-select"> dentro de un contenedor
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
