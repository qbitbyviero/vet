// clientes.js funcional, limpio y con console.log para depuración ordenada

console.log("🚦 clientes.js cargado correctamente.");

(async () => {
  // Verificar existencia de loadAllClients para evitar error en modal
  if (typeof window.loadAllClients !== "function") {
    console.warn("⚠️ Aviso: window.loadAllClients no está definido aún.");
    console.warn("🩹 Este archivo requiere que 'main.js' o el contenedor padre cargue loadAllClients ANTES de abrir este modal.");
    return; // Termina aquí si no existe, evitando romper el modal
  }

  // Obtener referencias
  const especieSelect = document.getElementById("pet-species");
  const razaSelect = document.getElementById("breed");
  const razaOther = document.getElementById("breed-other");
  const diagramaImg = document.getElementById("diagrama-img");
  const searchPet = document.getElementById("searchPet");

  console.log("📌 Elementos encontrados:", {
    especieSelect, razaSelect, razaOther, diagramaImg, searchPet
  });

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

  async function cargarClientes() {
    console.log("🔄 Solicitando clientes desde GAS...");
    const clientes = await window.loadAllClients();
    console.log("✅ Clientes recibidos:", clientes);

    clientes.forEach((c, idx) => {
      if (c["Nombre de la mascota"]) {
        const opt = document.createElement("option");
        opt.value = c["Nombre de la mascota"];
        opt.textContent = `${c["Nombre de la mascota"]} (${c["Nombre del propietario"]})`;
        searchPet.appendChild(opt);
        console.log(`➕ Cliente agregado [${idx}]: ${opt.textContent}`);
      }
    });

    searchPet.addEventListener("change", () => {
      console.log("🔍 Mascota seleccionada:", searchPet.value);
      const selected = clientes.find(c => c["Nombre de la mascota"] === searchPet.value);
      if (!selected) {
        console.warn("⚠️ Mascota no encontrada entre clientes.");
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

      console.log("✅ Formulario poblado correctamente con cliente seleccionado.");
    });
  }

  function actualizarRazas(especie) {
    console.log("🔄 Actualizando razas para especie:", especie);
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
    console.log("🐾 Cambio manual de especie a:", especieSelect.value);
    actualizarRazas(especieSelect.value);
    diagramaImg.src = especieImg[especieSelect.value] || "svg/placeholder.png";
  });

  razaSelect.addEventListener("change", () => {
    console.log("🧬 Cambio de raza a:", razaSelect.value);
    razaOther.style.display = razaSelect.value === "Otro" ? "block" : "none";
  });

  await cargarClientes();
})();
