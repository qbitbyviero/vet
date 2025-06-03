// =======================
// main.js (JavaScript General)
// =======================

document.addEventListener("DOMContentLoaded", () => {

  // ======================================
  // 0) CONFIGURACIÓN: URL de tu Web App
  // ======================================
  // Sustituye esta URL por la que te proporcionó tu Apps Script al hacer "Deploy → Web App"
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyROj2914A5Gv5BEuMuDAJ4NwehwuRQjMEZZo7hmU9UOl6HSoR0JXeE3BM591TJYZ8m/exec";

  // ============================
  // 1) CACHE PARA CLIENTES Y MASCOTAS
  // ============================
  // Almacenará en memoria el arreglo de clientes/mascotas para no pedirlo repetidamente
  let __clientsCache = null;

  /**
   * loadAllClients()
   *   - Si ya hemos cargado antes la lista de clientes, la devuelve del cache.
   *   - Si no, hace una petición GET a GAS_BASE_URL para obtener el JSON de todos los clientes.
   *   - Guarda el resultado en __clientsCache y lo retorna.
   *   - En caso de error, devuelve un arreglo vacío.
   */
  async function loadAllClients() {
    if (Array.isArray(__clientsCache)) {
      return __clientsCache;
    }
    try {
      const resp = await fetch(GAS_BASE_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      // data debe ser un array de objetos: [{ ID, "Nombre completo", "Nombre mascota", … }, …]
      __clientsCache = data;
      return __clientsCache;
    } catch (err) {
      console.error("Error cargando clientes desde Apps Script:", err);
      return [];
    }
  }

  /**
   * populateClientPetFields(container)
   *   - Busca, dentro de `container` (un elemento HTML), todos los <select> con clase "client-select"
   *     y los rellena con las opciones de “Nombre completo” de los clientes.
   *   - Busca todos los <select> con clase "pet-select" y los rellena con las opciones de “Nombre mascota”,
   *     concatenando entre paréntesis el nombre del dueño para que sea más legible.
   *   - Esta función invoca loadAllClients() y espera a que el JSON esté disponible.
   */
  async function populateClientPetFields(container) {
    const clients = await loadAllClients(); // Obtener el arreglo de clientes (cache)

    // ===== 1. Rellenar <select class="client-select"> =====
    container.querySelectorAll("select.client-select").forEach(selectEl => {
      // Limpiar cualquier opción previa
      selectEl.innerHTML = "";
      // Opción placeholder
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Seleccione un cliente";
      selectEl.appendChild(placeholder);

      // Agregar una <option> por cada cliente
      clients.forEach(cliente => {
        const opt = document.createElement("option");
        // Como value podemos usar el ID (si existe) o el nombre completo
        opt.value = cliente["ID"] || cliente["Nombre completo"];
        opt.textContent = cliente["Nombre completo"];
        selectEl.appendChild(opt);
      });
    });

    // ===== 2. Rellenar <select class="pet-select"> =====
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
          // Value podría ser simplemente el nombre de la mascota,
          // o si quieres distinguir duplicados,: `${cliente["ID"]}|${petName}`
          opt.value = petName;
          // Mostrar, por ejemplo, “Luna (dueño: Ana Martínez)”
          opt.textContent = `${petName} (dueño: ${cliente["Nombre completo"]})`;
          selectEl.appendChild(opt);
        }
      });
    });
  }

  /**
   * addNewClient(clienteObj)
   *   - Envía un POST a GAS_BASE_URL para agregar un nuevo cliente en la hoja de cálculo.
   *   - clienteObj debe tener exactamente las mismas claves que los encabezados en la hoja “Clientes”.
   *   - Ejemplo de clienteObj:
   *     {
   *       "ID": "5",
   *       "Nombre completo": "Pedro López",
   *       "Teléfono": "555-123-456",
   *       "Correo electrónico": "pedro@example.com",
   *       "Nombre mascota": "Toby",
   *       "Especie mascota": "perro",
   *       "Raza mascota": "Beagle",
   *       "Edad mascota": "3",
   *       "Peso mascota": "10.2",
   *       "Esterilizado": "Sí"
   *     }
   *   - Invalida el cache para que la próxima vez que llamemos a loadAllClients()
   *     recargue la lista completa.
   */
  async function addNewClient(clienteObj) {
    try {
      const resp = await fetch(GAS_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clienteObj)
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      // Invalida cache para forzar recarga en próximas llamadas
      __clientsCache = null;
      return data; // Debe devolver { success: true } o un objeto con error
    } catch (err) {
      console.error("Error agregando cliente:", err);
      throw err;
    }
  }

  // ================================================
  // 2) MODAL OVERLAY + CARGA DINÁMICA DE MÓDULOS (HTML)
  // ================================================
  const overlay = document.getElementById("modal-overlay");

  // Función para cerrar el modal
  function closeModal() {
    overlay.classList.remove("visible");
    overlay.innerHTML = "";
  }

  // Cada vez que se hace clic en <a data-module="archivo.html">, cargamos ese HTML en el overlay
  document.querySelectorAll('a[data-module]').forEach(link => {
    link.addEventListener("click", async e => {
      e.preventDefault();

      // Ruta al archivo HTML a cargar. Ajusta si tu carpeta es distinta.
      // Por ejemplo, si tu index.html está en la raíz y los modulos están junto a él:
      const file = link.dataset.module.trim();

      // 1) Mostrar overlay con indicador de carga y botón de cierre
      overlay.innerHTML = `
        <div class="modal-overlay-content">
          <button id="close-modal" aria-label="Cerrar módulo">×</button>
          <div class="loading-msg">Cargando...</div>
        </div>
      `;
      overlay.classList.add("visible");

      // 2) Cerrar si hacen clic en el fondo oscuro
      overlay.addEventListener("click", ev => {
        if (ev.target === overlay) closeModal();
      });
      // 3) Cerrar si hacen clic en la “×”
      overlay.querySelector("#close-modal").addEventListener("click", closeModal);

      try {
        // 4) Traer el HTML del módulo (clientes.html, consulta.html, etc.)
        const html = await fetch(file).then(r => r.text());
        const container = overlay.querySelector(".modal-overlay-content");

        // Sustituir “Cargando...” por un contenedor vacío + botón de cierre
        container.innerHTML = `<button id="close-modal" aria-label="Cerrar módulo">×</button>`;

        // Parsear el HTML en un TEMPLATE
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();

        // Extraer todos los scripts para agregarlos más tarde
        const scripts = tpl.content.querySelectorAll("script");
        // Clonar el contenido sin scripts
        const fragment = tpl.content.cloneNode(true);
        fragment.querySelectorAll("script").forEach(s => s.remove());

        // 5) Crear un DIV que contendrá todo el HTML del módulo (sin los <script>)
        const contentDiv = document.createElement("div");
        contentDiv.appendChild(fragment);
        // Insertarlo en el overlay
        container.appendChild(contentDiv);

        // 6) ¡Populate automático de selects! (clientes/mascotas)
        await populateClientPetFields(container);

        // 7) Ahora reinsertamos todos los <script> que estaban en el módulo,
        //    para que se ejecuten su lógica interna (event listeners, etc.)
        scripts.forEach(oldScript => {
          const newScript = document.createElement("script");
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          container.appendChild(newScript);
        });

        // 8) Reagregar listener de cierre al nuevo botón “×”
        container.querySelector("#close-modal").addEventListener("click", closeModal);
      } catch (err) {
        // Si hay error al cargar el archivo HTML
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
  const newChk = document.getElementById("new-pet");
  const newPetFields = document.getElementById("new-pet-fields");
  const backToCalendarBtn = document.getElementById("back-to-calendar");
  const slotListEl = document.getElementById("slot-list");

  // Renderizar calendario
  function renderCalendar() {
    document.getElementById("calendar").style.display = "block";
    reservationFormDiv.style.display = "none";
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    monthYearEl.textContent = currentDate.toLocaleString("es-ES", {
      month: "long",
      year: "numeric"
    });
    daysEl.innerHTML = "";
    const firstDayIndex = new Date(y, m, 1).getDay() || 7; // Lunes=1 … Domingo=7
    const totalDays = new Date(y, m + 1, 0).getDate();
    // Celdas vacías hasta el primer día
    for (let i = 1; i < firstDayIndex; i++) {
      daysEl.appendChild(document.createElement("div"));
    }
    // Dibujar cada día
    for (let d = 1; d <= totalDays; d++) {
      const dayCell = document.createElement("div");
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      dayCell.textContent = d;
      dayCell.dataset.date = dateStr;
      // Marcar hoy
      if (dateStr === new Date().toISOString().slice(0, 10)) {
        dayCell.classList.add("today");
      }
      daysEl.appendChild(dayCell);
    }
    activateDateClicks();
  }

  // Habilitar clic en cada celda de fecha
  function activateDateClicks() {
    document.querySelectorAll("#days div[data-date]").forEach(el => {
      el.addEventListener("click", () => {
        const selectedDate = el.dataset.date;
        document.getElementById("slot-date").textContent = selectedDate;
        flipToSlots(selectedDate);
      });
    });
  }

  //
