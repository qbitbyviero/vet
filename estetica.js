// ========================
// estetica.js
// ========================

console.log("✂️ estetica.js cargado correctamente.");

let clienteActual = null; // 🩶 Para mantener persistencia durante el modal abierto

document.addEventListener("DOMContentLoaded", () => {
  const selectMascota = document.getElementById("estetica-searchPet");
  const infoMascota = document.getElementById("estetica-pet-info");
  const form = document.getElementById("form-estetica");
  const btnLimpiar = document.getElementById("btn-limpiar-estetica");

  // 1️⃣ Cargar clientes desde GAS y llenar el select
  window.loadAllClients().then(clientes => {
    console.log("📦 Clientes para estética:", clientes.length);
    clientes.forEach(c => {
      const option = document.createElement("option");
      option.value = c["Nombre de la mascota"];
      option.textContent = `${c["Nombre de la mascota"]} - ${c["Nombre del propietario"]}`;
      option.dataset.info = JSON.stringify(c);
      selectMascota.appendChild(option);
    });

    // Si hay una selección previa
    if (clienteActual) {
      selectMascota.value = clienteActual["Nombre de la mascota"];
      selectMascota.dispatchEvent(new Event("change"));
    }
  });

  // 2️⃣ Al seleccionar una mascota, mostrar los datos
  selectMascota.addEventListener("change", () => {
    const selected = selectMascota.selectedOptions[0];
    if (selected && selected.dataset.info) {
      const cliente = JSON.parse(selected.dataset.info);
      clienteActual = cliente;
      infoMascota.innerHTML = `
        <p><strong>Mascota:</strong> ${cliente["Nombre de la mascota"]}</p>
        <p><strong>Propietario:</strong> ${cliente["Nombre del propietario"]}</p>
        <p><strong>Teléfono:</strong> ${cliente["Número de Teléfono"]}</p>
        <p><strong>Correo:</strong> ${cliente["Correo"]}</p>
        <p><strong>Especie:</strong> ${cliente["Especie"]}</p>
        <p><strong>Raza:</strong> ${cliente["Raza"]}</p>
        <p><em>Datos cargados correctamente ✅</em></p>`;
    } else {
      clienteActual = null;
      infoMascota.innerHTML = "<p>Selecciona una mascota válida.</p>";
    }
  });

  // 3️⃣ Guardar estética
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!clienteActual) {
      alert("Selecciona primero una mascota válida antes de guardar.");
      return;
    }

    // Obtener productos
    const productos = [];
    document.querySelectorAll('#tabla-productos tbody tr').forEach(row => {
      const producto = row.querySelector('input[name="producto[]"]').value.trim();
      const cantidad = row.querySelector('input[name="cantidad[]"]').value.trim();
      const precio = row.querySelector('input[name="precio[]"]').value.trim();
      if (producto && cantidad && precio) {
        productos.push(`${producto} x${cantidad} @${precio}`);
      }
    });

    // Preparar datos
    const data = new URLSearchParams();
    data.append("sheet", "Estetica");
    data.append("nuevo", "true");
    data.append("Nombre del propietario", clienteActual["Nombre del propietario"]);
    data.append("Nombre de la mascota", clienteActual["Nombre de la mascota"]);
    data.append("Productos", productos.join(" | "));
    data.append("Total", document.getElementById("total-estetica").textContent);

    try {
      const url = `https://script.google.com/macros/s/AKfycbzb-UdlFaau_szrGZkksMaAwbufH5fIduVkCRNGnKCszSJrMJnf9LqIOhfcZtYcEG2brA/exec?${data.toString()}`;
      const res = await jsonpRequest(url);
      console.log("✅ Respuesta de GAS estética:", res);

      if (res.success) {
        alert("✅ Estética guardada correctamente.");
        limpiarModalEstetica();
      } else {
        alert("❌ Error al guardar: " + (res.error || "Sin detalle"));
      }
    } catch (error) {
      console.error("❌ Error al guardar estética:", error);
      alert("Error al guardar estética: " + error.message);
    }
  });

  // 4️⃣ Botón limpiar
  btnLimpiar.addEventListener("click", () => {
    if (confirm("¿Seguro que deseas limpiar el formulario? Se perderán los datos no guardados.")) {
      limpiarModalEstetica();
    }
  });

  function limpiarModalEstetica() {
    selectMascota.value = "";
    infoMascota.innerHTML = "";
    clienteActual = null;
    document.querySelectorAll('#tabla-productos tbody tr').forEach((row, idx) => {
      if (idx === 0) {
        row.querySelectorAll('input').forEach(inp => inp.value = "");
        row.querySelector('.subtotal').textContent = "$0.00";
      } else {
        row.remove();
      }
    });
    document.getElementById("total-estetica").textContent = "0.00";
    document.getElementById("preview-antes").src = "";
    document.getElementById("preview-despues").src = "";
  }
});
