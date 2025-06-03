// =======================
// main.js (JavaScript General)
// =======================

document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) URL DE TU WEB APP (Apps Script)
  // ======================================
  // Pega aquí la URL EXACTA que te devuelve tu Apps Script (termina en /exec).
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyshr2Bqh1aCf9swF2ocYGXQMnvuey7GQ8EfCDjOFVMe3ym4xtuLfuOdFtjxre2r9rqKw/exec";

  // ============================
  // 1) JSONP REQUEST (para GET)
  // ============================
  // Inserta dinámicamente un <script> con callback para evitar CORS en GET
  function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
      const callbackName = "__cb_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      window[callbackName] = function(data) {
        resolve(data);
        delete window[callbackName];
        script.remove();
      };
      const script = document.createElement("script");
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
  let __clientsCache = null;      // Aquí guardaremos [{…}, {…}, …] de “Clientes”
  let __allCitasCache = null;     // Aquí guardaremos TODO el arreglo de “Citas” de la hoja
  let __appointmentsCount = {};   // Mapa { "YYYY-MM-DD": número_de_citas }

  /**
   * loadAllClients()
   * — Si ya existe __clientsCache, lo devuelve.
   * — Sino, hace JSONP a “?sheet=Clientes”, guarda en cache y devuelve.
   */
  async function loadAllClients() {
    if (Array.isArray(__clientsCache)) {
      return __clientsCache;
    }
    try {
      const url = GAS_BASE_URL + "?sheet=Clientes";
      const data = await jsonpRequest(url);
      // data: [ { "cliente Id":"1", "Nombre del propietario":"Juan …", … }, … ]
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
   * — Sino, hace JSONP a “?sheet=Citas”, guarda en cache, arma el mapa __appointmentsCount y devuelve.
   */
  async function loadAllCitas() {
    if (Array.isArray(__allCitasCache)) {
      return __allCitasCache;
    }
    try {
      const url = GAS_BASE_URL + "?sheet=Citas";
      const data = await jsonpRequest(url);
      // data: [ { "Fecha":"2025-06-05", "Hora":"10:30", "ID cliente":"2", "Nombre de la mascota":"Firulais", "Motivo":"Vacunas" }, … ]
      __allCitasCache = data;

      // Construir el mapa de conteo por fecha
      __appointmentsCount = {};
      data.forEach(cita => {
        const f = cita["Fecha"];
        if (!__appointmentsCount[f]) __appointmentsCount[f] = 0;
        __appointmentsCount[f]++;
      });

      return __allCitasCache;
    } catch (err) {
      console.error("Error cargando todas las citas:", err);
      return [];
    }
  }

  /**
   * getCountByDate(fecha)
   * — Retorna cuántas citas hay en esa fecha, usando el mapa __appointmentsCount.
   * — Si no existe, devuelve 0.
   */
  function getCountByDate(fecha) {
    return __appointmentsCount[fecha] || 0;
  }

  /**
   * addNewClient(clienteObj)
   * — Hace POST a “?sheet=Clientes” con el JSON de clienteObj.
   * — Recibe JSON { success:true, "cliente Id": nuevoId }.
   * — Invalida __clientsCache para la próxima vez.
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
      // data: { success:true, "cliente Id": 42 }
      __clientsCache = null; // invalidamos cache para que refresque
      return data;
    } catch (err) {
      console.error("Error agregando cliente:", err);
      throw err;
    }
  }

  /**
   * addNewAppointment(citaObj)
   * — Hace POST a “?sheet=Citas” con citaObj.
   * — Recibe JSON { success:true }.
   * — Invalida __allCitasCache para la próxima vez.
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
      const data = await resp.json(); // { success:true }
      // Invalidar cache de citas
      __allCitasCache = null;
      __appointmentsCount = {};
      return data;
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
   * — Muestra el calendario y oculta el formulario.
   * — Llama a loadAllCitas() UNA SOLA VEZ para poblar el mapa __appointmentsCount.
   * — Dibuja cada día del mes y le asigna clase (“full”, “medium”, “low”) según conteo.
   */
  async function renderCalendar() {
    document.getElementById("calendar").style.display = "block";
    reservationFormDiv.style.display = "none";

    // 1) Asegurarnos de cargar TODO el arreglo de “Citas” UNA SOLA VEZ
    await loadAllCitas();

    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    monthYearEl.textContent = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" });

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

      // Obtener cuántas citas hay para esa fecha (del mapa ya armado)
      const count = getCountByDate(dateStr);
      if (count >= 4) {
        dayCell.classList.add("full");      // 4 o más → sin espacio
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

  // Habilitar clic en cada día (que tenga data-date)
  function activateDateClicks() {
    document.querySelectorAll("#days div[data-date]").forEach(el => {
      el.addEventListener("click", () => {
        const selectedDate = el.dataset.date;
        document.getElementById("slot-date").textContent = selectedDate;
        flipToSlots(selectedDate);
      });
    });
  }

  // Animación “flip” para mostrar horario
  function flipToSlots(date) {
    card.classList.add("flipped1");
    setTimeout(() => loadSlots(date), 400);
  }

  /**
   * loadSlots(fecha)
   * — Obtiene del mapa __appointmentsCount las citas de todo el mes.
   * — Para la fecha “fecha” en concreto, reconstruye el mapa “hora→datosCita” localmente
   *   usando loadAllCitas() (que ya está en cache).
   * — Luego dibuja los <li> de 10:00 a 18:30; si la hora coincide con cita, la marca ocupada,
   *   si no, la deja clickeable para agendarla.
   */
  async function loadSlots(fecha) {
    slotListEl.innerHTML = "";
    const allCitas = await loadAllCitas();
    // Filtrar sólo las citas de este “fecha”
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
    // Opción de URGENCIAS
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
   * — Oculta el calendario y muestra el formulario para agendar.
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
   * — Asigna fecha/hora a los campos del formulario.
   * — Llama a populateClientPetFields(...) para rellenar <select id="mascota"> con todas las mascotas.
   * — Agrega listener a ese <select> para mostrar datos del dueño y habilitar “Corregir datos”.
   * — Si “Nueva mascota” está marcado, muestra el sub‐formulario completo para crear un cliente.
   */
  async function renderForm(fecha, hora) {
    formDate.value = fecha;
    formTime.value = hora;

    // Limpiar estado previo
    ownerInfoDiv.innerHTML = "";
    document.getElementById("edit-client-btn").style.display = "none";
    document.getElementById("edit-client-fields").style.display = "none";
    document.getElementById("edit-age").value = "";
    document.getElementById("edit-weight").value = "";
    document.getElementById("edit-email").value = "";

    // 1) Rellenar <select id="mascota"> con todas las mascotas existentes
    await populateClientPetFields(reservationFormDiv);

    // 2) Cuando el usuario elija una mascota, mostrar datos del dueño
    const selPet = document.getElementById("mascota");
    selPet.addEventListener("change", async () => {
      const petSeleccionada = selPet.value;
      if (!petSeleccionada) {
        ownerInfoDiv.innerHTML = "";
        document.getElementById("edit-client-btn").style.display = "none";
        return;
      }
      const clientes = await loadAllClients();
      // Encontrar la fila cuyo “Nombre de la mascota” coincide
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

    // 3) Ocultar “nueva mascota” si estaba marcado antes
    newChk.checked = false;
    newPetFields.style.display = "none";
    document.getElementById("new-pet-name").value = "";
    document.getElementById("new-pet-species").value = "";

    // Hacer scroll hasta el formulario
    reservationFormDiv.scrollIntoView({ behavior: "smooth" });
  }

  // Toggle “Nueva mascota” (mostrar/ocultar sub‐formulario de cliente)
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

  // Cancelar formulario y volver al calendario
  document.getElementById("cancel-form").addEventListener("click", () => {
    reservationFormDiv.style.display = "none";
    renderCalendar();
  });

  // Botón “Corregir datos cliente” → Mostrar inputs para editar Edad, Peso y Correo
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

  // “Guardar cambios cliente” → (POR AHORA) solamente hace un alert
  document.getElementById("save-client-changes").addEventListener("click", () => {
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

  // Enviar formulario de cita (tanto para mascota existente como nueva)
  document.getElementById("appointment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha = formDate.value;
    const hora = formTime.value;
    const nuevaMascota = newChk.checked;
    let clienteId, nombreMascota, motivo;

    if (nuevaMascota) {
      // 1) Recopilar datos del mini‐formulario de “Clientes”
      const propietario = document.getElementById("new-owner-name").value.trim();
      const telefono   = document.getElementById("new-owner-phone").value.trim();
      const correo     = document.getElementById("new-owner-email").value.trim();
      nombreMascota    = document.getElementById("new-pet-name").value.trim();
      const especie    = document.getElementById("new-pet-species").value.trim();
      const raza       = document.getElementById("new-pet-breed").value.trim();
      const edad       = document.getElementById("new-pet-age").value.trim();
      const peso       = document.getElementById("new-pet-weight").value.trim();
      const esterilizado= document.querySelector('input[name="new-pet-sterilizado"]:checked') 
                           ? document.querySelector('input[name="new-pet-sterilizado"]:checked').value 
                           : "";
      const observaciones = document.getElementById("new-pet-notes").value.trim();

      // Validaciones mínimas:
      if (!propietario || !telefono || !correo || !nombreMascota) {
        alert("Debe llenar todos los campos de propietario y nombre de mascota.");
        return;
      }
      // 2) Llamar a addNewClient para crear el cliente en la hoja “Clientes”
      try {
        const clienteObj = {
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
        const resp = await addNewClient(clienteObj);
        // resp = { success:true, "cliente Id": 123 }
        clienteId = resp["cliente Id"];
      } catch (err) {
        alert("Error al dar de alta el nuevo cliente: " + err.message);
        return;
      }
      motivo = prompt("Ingrese el motivo de la cita para " + nombreMascota + ":");
      if (!motivo) {
        alert("La cita debe tener un motivo.");
        return;
      }
    } else {
      // Mascota existente
      nombreMascota = document.getElementById("mascota").value;
      if (!nombreMascota) {
        alert("Seleccione primero una mascota existente o marque Nueva mascota.");
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
      if (!motivo) {
        alert("La cita debe tener un motivo.");
        return;
      }
    }

    // 3) Construir objeto para guardar en “Citas”
    const nuevaCita = {
      "Fecha": fecha,
      "Hora": hora,
      "ID cliente": clienteId + "",
      "Nombre de la mascota": nombreMascota,
      "Motivo": motivo
    };

    // 4) Enviar a Apps Script para que lo guarde en la hoja “Citas”
    try {
      await addNewAppointment(nuevaCita);
      alert("¡Cita guardada con éxito!");
      reservationFormDiv.style.display = "none";
      // Volver a cargar calendario para ver inmediatamente el cambio
      renderCalendar();
    } catch (err) {
      alert("Error al guardar la cita: " + err.message);
    }
  });

  // Navegar meses en el calendario
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
  // 5) poblarClientPetFields(container)
  //    — Rellena todos los <select class="pet-select"> y <select class="client-select"> dentro de un contenedor
  //    — En nuestro caso, solo nos importa el <select class="pet-select"> para “Nombre de la mascota”
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

  // ========================================
  // 6) getCountByDate(fecha) → Retorna #citas en esa fecha
  // ========================================
  function getCountByDate(fecha) {
    return __appointmentsCount[fecha] || 0;
  }

});
