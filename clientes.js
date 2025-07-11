// clientes.js funcional, limpio y con console.log para depuración

console.log("🚦 clientes.js cargado correctamente.");

(async () => {
  // Comprobación de existencia de window.loadAllClients
  if (typeof window.loadAllClients !== "function") {
    console.error("❌ Error: window.loadAllClients no está definido. Verifica que main.js esté cargado antes que clientes.js.");
    return;
  }

  // Obtener referencias a elementos de UI
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
    console.log("✅ Clientes cargados:", clientes);

    clientes.forEach((c, idx) => {
      if (c["Nombre de la mascota"]) {
        const opt = document.createElement("option");
        opt.value = c["Nombre de la mascota"];
        opt.textContent = `${c["Nombre de la mascota"]} (${c["Nombre del propietario"]})`;
        searchPet.appendChild(opt);
        console.log(`➕ Cliente agregado al selector [${idx}]:`, opt.textContent);
      }
    });

    searchPet.addEventListener("change", () => {
      console.log("🔍 Mascota seleccionada:", searchPet.value);
      const selected = clientes.find(c => c["Nombre de la mascota"] === searchPet.value);
      if (!selected) {
        console.warn("⚠️ Mascota no encontrada en clientes");
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
      console.log("✅ Formulario poblado correctamente");
    });
  }

  function actualizarRazas(especie) {
    console.log("🔄 Actualizando razas para:", especie);
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
    console.log("🐾 Cambio manual de especie:", especieSelect.value);
    actualizarRazas(especieSelect.value);
    diagramaImg.src = especieImg[especieSelect.value] || "svg/placeholder.png";
  });

  razaSelect.addEventListener("change", () => {
    console.log("🧬 Cambio de raza:", razaSelect.value);
    razaOther.style.display = razaSelect.value === "Otro" ? "block" : "none";
  });

  // Inicializar carga de clientes
  await cargarClientes();
})();
