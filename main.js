// =======================
// main.js (JavaScript General)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // ======================================
  // 0) URL DE TU WEB APP (Apps Script)
  // ======================================
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbz5DFuZiy27bHUANMDyDcPSpZzGmMNovTQUzzfFAi9qnnNvVaP-HwJivg2YgXAlr2WyQQ/exec";

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
    if (parts.length !== 3) return "";
    const [day, month, year] = parts;
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

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

  async function loadAllCitas() {
    if (Array.isArray(__allCitasCache)) {
      return __allCitasCache;
    }
    try {
      const url  = GAS_BASE_URL + "?sheet=Citas";
      const data = await jsonpRequest(url);
      __allCitasCache     = data;
      __appointmentsCount = {};
      data.forEach(cita => {
        let rawFecha = cita["Fecha"];
        rawFecha = normalizeDate(String(rawFecha).trim());
        cita["Fecha"] = rawFecha;
        let rawHora = cita["Hora"];
        if (rawHora instanceof Date) {
          const hh = String(rawHora.getHours()).padStart(2, "0");
          const mm = String(rawHora.getMinutes()).padStart(2, "0");
          rawHora = `${hh}:${mm}`;
        } else {
          rawHora = String(rawHora).trim().slice(0, 5);
        }
        cita["Hora"] = rawHora;
        if (!__appointmentsCount[rawFecha]) {
          __appointmentsCount[rawFecha] = 0;
        }
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
        const html      = await fetch(file).then(r => r.text());
        const container = overlay.querySelector(".modal-overlay-content");
        container.innerHTML = `<button id="close-modal" aria-label="Cerrar módulo">×</button>`;
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();
        const scripts  = tpl.content.querySelectorAll("script");
        const fragment = tpl.content.cloneNode(true);
        fragment.querySelectorAll("script").forEach(s => s.remove());
        const contentDiv = document.createElement("div");
        contentDiv.appendChild(fragment);
        container.appendChild(contentDiv);
        scripts.forEach(oldScript => {
          const newScript = document.createElement("script");
          newScript.type = "text/javascript";
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.text = oldScript.textContent;
          }
          document.body.appendChild(newScript);
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

  // Exponer funciones globales necesarias
  window.loadAllClients = loadAllClients;
  window.loadAllCitas = loadAllCitas;
  window.__appointmentsCount = __appointmentsCount;
});
