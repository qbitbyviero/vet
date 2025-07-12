// ========================
// estetica.js
// ========================

console.log("✂️ estetica.js cargado correctamente.");

let clienteActual = null; // 🩶 Para mantener persistencia durante el modal abierto

document.addEventListener("DOMContentLoaded", () => {
  const btnBuscar = document.getElementById("buscar-mascota");
  const inputNombre = document.getElementById("estetica-petName");
  const infoMascota = document.getElementById("estetica-pet-info");
  const form = document.getElementById("form-estetica");
  const btnLimpiar = document.createElement("button");
  btnLimpiar.textContent = "Limpiar";
  btnLimpiar.type = "button";
  btnLimpiar.className = "button-86";
  form.appendChild(btnLimpiar);

  // Buscar mascota real
  btnBuscar.addEventListener("click", async () => {
    const nombre = inputNombre.value.trim();
    if (!nombre) {
      infoMascota.innerHTML = "<p>Ingresa un nombre válido</p>";
      return;
    }
    const clientes = await window.loadAllClients();
    const cliente = clientes.find(c => c["Nombre de la mascota"].toLowerCase() === nombre.toLowerCase());
    if (cliente) {
      clienteActual = cliente; // Guardar cliente actual
      infoMascota.innerHTML = `
        <p><strong>Mascota:</strong> ${cliente["Nombre de la mascota"]}</p>
        <p><strong>Propietario:</strong> ${cliente["Nombre del propietario"]}</p>
        <p><strong>Teléfono:</strong> ${cliente["Número de Teléfono"]}</p>
        <p><strong>Correo:</strong> ${cliente["Correo"]}</p>
        <p><strong>Especie:</strong> ${cliente["Especie"]}</p>
        <p><strong>Raza:</strong> ${cliente["Raza"]}</p>
        <p><em>Datos cargados correctamente ✅</em></p>`;
    } else {
      infoMascota.innerHTML = "<p>No se encontró la mascota</p>";
    }
  });

  // Mantener última búsqueda si existe
  if (clienteActual) {
    inputNombre.value = clienteActual["Nombre de la mascota"];
    btnBuscar.click();
  }

  // Guardar estética
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!clienteActual) {
      alert("Busca y selecciona primero una mascota antes de guardar.");
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

  // Botón limpiar
  btnLimpiar.addEventListener("click", () => {
    if (confirm("¿Seguro que deseas limpiar el formulario? Se perderán los datos no guardados.")) {
      limpiarModalEstetica();
    }
  });

  function limpiarModalEstetica() {
    inputNombre.value = "";
    infoMascota.innerHTML = "";
    clienteActual = null;
    document.querySelectorAll('#tabla-productos tbody tr').forEach((row, idx) => {
      if (idx === 0) {
        row.querySelectorAll('input').forEach(inp => inp.value = idx === 0 ? inp.value : "");
      } else {
        row.remove();
      }
    });
    document.getElementById("total-estetica").textContent = "0.00";
    document.getElementById("preview-antes").src = "";
    document.getElementById("preview-despues").src = "";
  }
});
