// =======================More actions
// main.js (JavaScript General)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) URL DE TU WEB APP (Apps Script)
  // ======================================
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyvuC-GaO0Kqwpn2sDPy090B2M2tICugaBcgzhPkioYaRFZr6YkPxhXeZuOYzvWuFwOHg/exec";

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
let __clientsCache      = null;  // Array de clientes
let __allCitasCache     = null;  // Array de citas
let __appointmentsCount = {};    // Conteo por fecha

/**
 * normalizeDate(dateStr)
 * Convierte fechas tipo dd/mm/yyyy a YYYY-MM-DD
 */
function normalizeDate(dateStr) {
  if (!dateStr) return "";
  // Si ya está en formato YYYY-MM-DD, devuélvelo tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const d = new Date(dateStr);
  if (!isNaN(d)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * loadAllClients()
 * — Si está en cache, lo devuelve.
 * — Si no, hace jsonpRequest(GAS_BASE_URL + "?sheet=Clientes").
 */
async function loadAllClients() {
  if (Array.isArray(__clientsCache)) {
    return __clientsCache;
  }
  try {
    const url  = GAS_BASE_URL + "?sheet=Clientes";
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
 * — Si está en cache, lo devuelve.
 * — Si no, hace jsonpRequest(GAS_BASE_URL + "?sheet=Citas"),
 *   construye __appointmentsCount y guarda en cache.
 */
/**
 * Función mejorada para normalizar horas
 */
function normalizeTime(timeStr) {
  if (!timeStr) return '';
  
  // Si ya está en formato HH:MM
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  
  // Si es un objeto Date
  if (timeStr instanceof Date) {
    return `${String(timeStr.getHours()).padStart(2, '0')}:${String(timeStr.getMinutes()).padStart(2, '0')}`;
  }
  
  // Para formato "5:00:00 p.m."
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

/**
 * Versión mejorada de loadAllCitas
 */
async function loadAllCitas() {
  if (Array.isArray(__allCitasCache)) {
    return __allCitasCache;
  }
  
  try {
    const url = GAS_BASE_URL + "?sheet=Citas";
    const data = await jsonpRequest(url);
    console.log('Datos crudos de citas:', data);
    
    __allCitasCache = data.map(cita => {
      return {
        ...cita,
        Fecha: normalizeDate(cita.Fecha || cita.fecha || ''),
        Hora: normalizeTime(cita.Hora || cita.hora || '')
      };
    });
    
    // Actualizar conteo
    __appointmentsCount = {};
    __allCitasCache.forEach(cita => {
      if (cita.Fecha) {
        __appointmentsCount[cita.Fecha] = (__appointmentsCount[cita.Fecha] || 0) + 1;
      }
    });
    
    return __allCitasCache;
  } catch (err) {
    console.error('Error cargando citas:', err);
    return [];
  }
}
async function loadSlots(fecha) {
  console.log(`Cargando slots para: ${fecha}`);
  slotListEl.innerHTML = '<div class="loading">Cargando horarios...</div>';
  
  try {
    const allCitas = await loadAllCitas();
    const citasDelDia = allCitas.filter(cita => cita.Fecha === fecha);
    console.log('Citas del día:', citasDelDia);
    
    // Mapear horas ocupadas
    const horasOcupadas = {};
    citasDelDia.forEach(cita => {
      if (cita.Hora) {
        horasOcupadas[cita.Hora] = {
          mascota: cita['Nombre de la mascota'] || 'Sin nombre',
          motivo: cita.Motivo || 'Sin motivo'
        };
      }
    });
    
    // Generar slots de 10:00 a 18:30 cada 30 minutos
    slotListEl.innerHTML = '';
    for (let h = 10; h < 19; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const li = document.createElement('li');
        li.className = 'slot-line';
        
        if (horasOcupadas[hora]) {
          // Slot ocupado
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
          // Slot disponible
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
    
    // Añadir urgencias
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
  /**
   * loadSlots(fecha)
   * — Toma todas las citas ya cargadas en memoria (loadAllCitas),
   *   filtra solo las de `fecha` y construye un mapa hora→datosCita.
   * — Luego dibuja cada <li> desde 10:00 hasta 18:30. Si coincide con una cita,
   *   lo marca “ocupado” (no clickable). El resto, libre y sí clickable.
   */
async function loadSlots(fecha) {
  console.log(`[DEBUG] Cargando slots para: ${fecha}`);
  slotListEl.innerHTML = '<div class="loading">Cargando horarios...</div>';

  try {
    // 1. Cargar y normalizar citas
    const allCitas = await loadAllCitas();
    console.log('[DEBUG] Total citas:', allCitas);
    
    // 2. Filtrar y normalizar para esta fecha
    const citasDelDia = allCitas.filter(cita => {
      // Normalizar fecha de la cita
      const fechaCita = normalizeDate(cita.Fecha || cita.fecha || '');
      console.log(`[DEBUG] Comparando: ${fechaCita} con ${fecha}`);
      return fechaCita === fecha;
    });
    
    console.log('[DEBUG] Citas del día:', citasDelDia);

    // 3. Mapear horas ocupadas
    const horasOcupadas = {};
    citasDelDia.forEach(cita => {
      let hora = cita.Hora || cita.hora || '';
      
      // Normalizar formato de hora
      if (typeof hora === 'string') {
        hora = hora.trim();
        
        // Convertir "9:30" -> "09:30"
        if (/^\d:\d{2}$/.test(hora)) {
          hora = '0' + hora;
        }
        
        // Asegurar formato HH:MM
        hora = hora.substring(0, 5);
      } else if (hora instanceof Date) {
        // Si es objeto Date, convertirlo a HH:MM
        hora = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
      }
      
      if (/^\d{2}:\d{2}$/.test(hora)) {
        horasOcupadas[hora] = {
          mascota: cita['Nombre de la mascota'] || cita.mascota || 'Sin nombre',
          motivo: cita.Motivo || cita.motivo || 'Sin motivo'
        };
      }
    });

    console.log('[DEBUG] Horas ocupadas:', horasOcupadas);

    // 4. Generar slots
    slotListEl.innerHTML = '';
    
    // Crear horarios de 10:00 a 18:30 cada 30 minutos
    const slots = [];
    for (let h = 10; h < 19; h++) {
      for (let m = 0; m < 60; m += 30) {
        const horaFormateada = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slots.push(horaFormateada);
      }
    }

    // Mostrar cada slot
    slots.forEach(hora => {
      const li = document.createElement('li');
      li.className = 'slot-line';
      
      if (horasOcupadas[hora]) {
        // Slot ocupado
        const cita = horasOcupadas[hora];
        li.innerHTML = `
          <span class="slot-time">${hora}</span>
          <span class="slot-separator">----></span>
          <span class="slot-pet">${cita.mascota}</span>
          <span class="slot-separator">----></span>
          <span class="slot-reason">${cita.motivo}</span>
        `;
        li.classList.add('ocupado');
      } else {
        // Slot disponible
        li.innerHTML = `
          <span class="slot-time">${hora}</span>
          <span class="slot-separator">----></span>
          <span class="slot-available">Disponible</span>
        `;
        li.classList.add('disponible');
        li.addEventListener('click', () => selectSlot(fecha, hora));
      }
      
      slotListEl.appendChild(li);
    });

    // 5. Añadir opción de urgencias
    const urgLi = document.createElement('li');
    urgLi.innerHTML = `
      <span class="urgent-slot">🚨 URGENCIAS (Haz clic aquí)</span>
    `;
    urgLi.classList.add('urgencia');
    urgLi.addEventListener('click', () => selectSlot(fecha, 'URGENCIAS'));
    slotListEl.appendChild(urgLi);

  } catch (error) {
    console.error('[ERROR] loadSlots:', error);
    slotListEl.innerHTML = `
      <div class="error">
        Error al cargar horarios. Recarga la página.
        <button onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}
  /**
   * selectSlot(fecha, hora)
   * — Oculta el calendario y muestra el formulario para “Agendar cita”,
   *   luego llama a renderForm(fecha, hora).
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
        reservationFormDiv.style.opacity    = "1";
      }, 50);
      backPanel.style.opacity = "1";
    }, 300);
  }

  /**
   * renderForm(fecha, hora)
   * — Rellena inputs de fecha/hora.
   * — Invoca populateClientPetFields para llenar <select id="mascota" class="pet-select">.
   * — Añade listener a <select id="mascota"> para mostrar datos del dueño y habilitar “Corregir datos”.
   * — Controla “Nueva mascota” para mostrar sub-formulario.
   */
  async function renderForm(fecha, hora) {
    formDate.value = fecha;
    formTime.value = hora;

    // Limpiar estado previo
    ownerInfoDiv.innerHTML = "";
    document.getElementById("edit-client-btn").style.display    = "none";
    document.getElementById("edit-client-fields").style.display = "none";
    document.getElementById("edit-age").value   = "";
    document.getElementById("edit-weight").value= "";
    document.getElementById("edit-email").value = "";

    // 1) Llenar <select id="mascota" class="pet-select">
    await populateClientPetFields(reservationFormDiv);

    // 2) Listener al cambiar mascota
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

    // 3) Ocultar sub-formulario de “nueva mascota” (si quedó marcado)
    newChk.checked = false;
    newPetFields.style.display = "none";
    document.getElementById("new-owner-name").value  = "";
    document.getElementById("new-owner-phone").value = "";
    document.getElementById("new-owner-email").value= "";
    document.getElementById("new-pet-name").value    = "";
    document.getElementById("new-pet-species").value = "";
    document.getElementById("new-pet-breed").value   = "";
    document.getElementById("new-pet-age").value     = "";
    document.getElementById("new-pet-weight").value  = "";
    document.querySelectorAll('input[name="new-pet-sterilizado"]').forEach(r => r.checked = false);
    document.getElementById("new-pet-notes").value   = "";

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

  // “Corregir datos cliente” (solo muestra inputs; no modifica hoja en esta versión)
  document.getElementById("edit-client-btn").addEventListener("click", async () => {
    const petSeleccionada = document.getElementById("mascota").value;
    if (!petSeleccionada) return;
    const clientes = await loadAllClients();
    const fila = clientes.find(c => c["Nombre de la mascota"] === petSeleccionada);
    if (!fila) return;

    document.getElementById("edit-age").value    = fila["Edad"]   || "";
    document.getElementById("edit-weight").value = fila["Peso"]   || "";
    document.getElementById("edit-email").value  = fila["Correo"] || "";

    document.getElementById("edit-client-fields").style.display = "block";
  });

  // “Guardar cambios cliente” (solo alerta; no modifica hoja en esta versión)
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
      "(Para que esto realmente modifique la hoja, implementa un endpoint “updateCliente” en Apps Script)."
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
   * — Si es “Nueva mascota”, primero crea el cliente nuevo (JSONP GET con `nuevo=true`).
   * — Luego, crea la cita (JSONP GET con `nuevo=true`).
   * — Tras guardarla, vacía el cache de citas y vuelve a renderCalendar().
   */
  document.getElementById("appointment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha        = formDate.value;
    const hora         = formTime.value;
    const nuevaMascota = newChk.checked;
    let clienteId, nombreMascota, motivo;

    if (nuevaMascota) {
      // 1) Recoger datos del sub-formulario de cliente
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

      // 2) Crear cliente nuevo vía JSONP GET
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
      const qsPartsCliente = [];
      Object.keys(paramsCliente).forEach(k => {
        qsPartsCliente.push(encodeURIComponent(k) + "=" + encodeURIComponent(paramsCliente[k]));
      });
      const urlCrearCliente = GAS_BASE_URL + "?" + qsPartsCliente.join("&");
      let respCliente;
      try {
        respCliente = await jsonpRequest(urlCrearCliente);
        if (!respCliente.success) {
          alert("Error al dar de alta el cliente: " + (respCliente.error || "desconocido"));
          return;
        }
        clienteId = respCliente["ID fila"]; // ID fila generada
      } catch (err) {
        alert("Error al crear cliente: " + err.message);
        return;
      }

      // 3) Pedir motivo de la cita
      motivo = prompt("Ingrese el motivo de la cita para " + nombreMascota + ":");
      if (!motivo || !motivo.trim()) {
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
      if (!motivo || !motivo.trim()) {
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
      "ID cliente": clienteId,
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
      // —👉 LIMPIAR la caché para forzar recarga
      __allCitasCache     = null;
      __appointmentsCount = {};
      reservationFormDiv.style.display = "none";
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

  // Render inicial
  renderCalendar();

  // =========================================
  // 5) populateClientPetFields(container)
  //    — Rellena TODOS los <select class="pet-select"> dentro de un contenedor
  // =========================================
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
window.loadAllCitas = loadAllCitas;
window.__appointmentsCount = __appointmentsCount;
});
