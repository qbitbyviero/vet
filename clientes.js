// ==============================
// clientes.js actualizado para guardar cliente nuevo o actualizar existente
// ==============================

console.log("🚦 clientes.js cargado correctamente.");

(async () => {
  if (typeof window.loadAllClients !== "function") {
    console.warn("⚠️ window.loadAllClients no está definido aún. Se requiere que 'main.js' cargue primero.");
    return;
  }

  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzb-UdlFaau_szrGZkksMaAwbufH5fIduVkCRNGnKCszSJrMJnf9LqIOhfcZtYcEG2brA/exec";

  // Referencias
  const especieSelect = document.getElementById("pet-species");
  const razaSelect = document.getElementById("breed");
  const razaOther = document.getElementById("breed-other");
  const diagramaImg = document.getElementById("diagrama-img");
  const searchPet = document.getElementById("searchPet");
  const btnGuardar = document.querySelector(".button-86");

  console.log("📌 Elementos encontrados:", { especieSelect, razaSelect, razaOther, diagramaImg, searchPet, btnGuardar });

  const especiesRazas = {
    perro: ["Criollo", "Bulldog", "Chihuahua", "Pastor Alemán", "Labrador", "Pug", "Otro"],
    gato: ["Criollo", "Persa", "Siamés", "Maine Coon", "Bengala", "Otro"],
    ave: ["Canario", "Periquito", "Loro", "Cotorra", "Otro"],
    tortuga: ["Orejas Rojas", "Caja", "Leopardo", "Sulcata", "Otro"],
    serpiente: ["Pitón", "Boa", "Maíz", "Otro"],
    lagarto: ["Iguana", "Gecko", "Otro"],
    pez: ["Betta", "Goldfish", "Otro"],
    roedor: ["Hámster", "Cuy", "Ratón", "Conejo", "Otro"]
  };

  const especieImg = {
    perro: "svg/perro.png",
    gato: "svg/felino.svg",
    ave: "svg/ave.png",
    tortuga: "svg/tortuga.svg",
    serpiente: "svg/serpiente.svg",
    lagarto: "svg/lagarto.png",
    pez: "svg/pez.svg",
    roedor: "svg/roedor.svg"
  };

  let clientes = [];

  async function cargarClientes() {
    console.log("🔄 Cargando clientes desde GAS...");
    clientes = await window.loadAllClients();
    console.log("✅ Clientes recibidos:", clientes);

    searchPet.innerHTML = `<option value="">-- Buscar mascota existente --</option>`;
    clientes.forEach((c, idx) => {
      if (c["Nombre de la mascota"]) {
        const opt = document.createElement("option");
        opt.value = c["Nombre de la mascota"];
        opt.textContent = `${c["Nombre de la mascota"]} (${c["Nombre del propietario"]})`;
        searchPet.appendChild(opt);
      }
    });
  }

  searchPet.addEventListener("change", () => {
    const selected = clientes.find(c => c["Nombre de la mascota"] === searchPet.value);
    if (!selected) {
      console.log("🔍 Sin cliente seleccionado, limpiando campos.");
      limpiarCampos();
      return;
    }
    console.log("✅ Cliente encontrado:", selected);
    document.getElementById("ownerName").value = selected["Nombre del propietario"] || "";
    document.getElementById("ownerPhone").value = selected["Número de Teléfono"] || "";
    document.getElementById("ownerEmail").value = selected["Correo"] || "";
    document.getElementById("petName").value = selected["Nombre de la mascota"] || "";
    document.getElementById("age").value = selected["Edad"] || "";
    document.getElementById("weight").value = selected["Peso"] || "";
    document.getElementById("observations").value = selected["Observaciones"] || "";

    const especie = selected["Especie"]?.toLowerCase();
    especieSelect.value = especie || "";
    actualizarRazas(especie);
    razaSelect.value = selected["Raza"] || "";
    diagramaImg.src = especieImg[especie] || "svg/placeholder.png";

    const est = (selected["Esterilizado"] || "").toLowerCase();
    document.querySelector(`input[name='sterilized'][value='${(est === "sí" || est === "si") ? "si" : "no"}']`).checked = true;
  });

  function actualizarRazas(especie) {
    razaSelect.innerHTML = `<option value="">-- Selecciona raza --</option>`;
    if (!especie || !especiesRazas[especie]) return;
    especiesRazas[especie].forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      razaSelect.appendChild(opt);
    });
  }

  especieSelect.addEventListener("change", () => {
    actualizarRazas(especieSelect.value);
    diagramaImg.src = especieImg[especieSelect.value] || "svg/placeholder.png";
  });

  razaSelect.addEventListener("change", () => {
    razaOther.style.display = razaSelect.value === "Otro" ? "block" : "none";
  });

  btnGuardar.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("💾 Guardando cliente...");

    const data = {
      "Nombre del propietario": document.getElementById("ownerName").value.trim(),
      "Número de Teléfono": document.getElementById("ownerPhone").value.trim(),
      "Correo": document.getElementById("ownerEmail").value.trim(),
      "Nombre de la mascota": document.getElementById("petName").value.trim(),
      "Especie": document.getElementById("pet-species").value.trim(),
      "Raza": razaSelect.value.trim() === "Otro" ? razaOther.value.trim() : razaSelect.value.trim(),
      "Edad": document.getElementById("age").value.trim(),
      "Peso": document.getElementById("weight").value.trim(),
      "Esterilizado": document.querySelector("input[name='sterilized']:checked")?.value === "si" ? "Sí" : "No",
      "Observaciones": document.getElementById("observations").value.trim()
    };

    const isNew = !searchPet.value; // si no hay mascota seleccionada es nuevo
    const params = new URLSearchParams();
    params.append("sheet", "Clientes");

    if (isNew) {
      params.append("nuevo", "true");
    } else {
      const cliente = clientes.find(c => c["Nombre de la mascota"] === searchPet.value);
      if (!cliente) {
        alert("⚠️ Cliente no encontrado, intente de nuevo.");
        return;
      }
      params.append("update", "true");
      params.append("id", cliente["ID fila"] || cliente["ID cliente"]);
    }

    Object.entries(data).forEach(([key, val]) => params.append(key, val));

    try {
      const url = `${GAS_BASE_URL}?${params.toString()}`;
      console.log("📡 Enviando datos a GAS:", url);

      await jsonpRequest(url);

      alert(`✅ Cliente ${isNew ? "guardado" : "actualizado"} exitosamente.`);
      await cargarClientes();

    } catch (error) {
      console.error("❌ Error al guardar cliente:", error);
      alert("Error al guardar cliente, revisa la consola.");
    }
  });

  function limpiarCampos() {
    document.getElementById("ownerName").value = "";
    document.getElementById("ownerPhone").value = "";
    document.getElementById("ownerEmail").value = "";
    document.getElementById("petName").value = "";
    document.getElementById("pet-species").value = "";
    actualizarRazas("");
    razaSelect.value = "";
    razaOther.value = "";
    razaOther.style.display = "none";
    document.getElementById("age").value = "";
    document.getElementById("weight").value = "";
    document.getElementById("observations").value = "";
    document.querySelectorAll("input[name='sterilized']").forEach(r => r.checked = false);
    diagramaImg.src = "svg/placeholder.png";
  }

  async function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
      const callbackName = "jsonp_" + Math.random().toString(36).substring(2, 15);
      window[callbackName] = data => {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      const script = document.createElement("script");
      script.src = url + `&callback=${callbackName}`;
      script.onerror = () => {
        delete window[callbackName];
        document.body.removeChild(script);
        reject(new Error("Error de conexión JSONP"));
      };
      document.body.appendChild(script);
    });
  }

  // Inicializar clientes al abrir
  await cargarClientes();
})();
