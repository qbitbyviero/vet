console.log("✂️ estetica.js cargado correctamente.");

let clienteActual = null;

document.addEventListener("DOMContentLoaded", () => {
  const selectMascota = document.getElementById("estetica-searchPet");
  const infoMascota = document.getElementById("estetica-pet-info");
  const form = document.getElementById("form-estetica");
  const btnLimpiar = document.getElementById("btn-limpiar-estetica");
  const tabla = document.getElementById("tabla-productos").querySelector("tbody");
  const totalSpan = document.getElementById("total-estetica");

  // Cargar clientes al iniciar
  (async () => {
    try {
      const clientes = await window.loadAllClients();
      console.log("🔁 Clientes cargados para estética:", clientes);

      clientes.forEach(cliente => {
        const nombre = cliente["Nombre de la mascota"];
        if (nombre) {
          const option = document.createElement("option");
          option.value = nombre;
          option.textContent = nombre;
          selectMascota.appendChild(option);
        }
      });

      // Escuchar cambios en el select
      selectMascota.addEventListener("change", () => {
        const selected = selectMascota.value;
        const cliente = clientes.find(c => c["Nombre de la mascota"] === selected);
        if (cliente) {
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
          infoMascota.innerHTML = "<p>No se encontró la mascota</p>";
        }
      });

    } catch (error) {
      console.error("❌ Error al cargar clientes:", error);
    }
  })();

  // Guardar estética
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!clienteActual) {
      alert("Debes seleccionar una mascota registrada.");
      return;
    }

    const productos = [];
    tabla.querySelectorAll("tr").forEach(row => {
      const producto = row.querySelector('input[name="producto[]"]').value.trim();
      const cantidad = row.querySelector('input[name="cantidad[]"]').value.trim();
      const precio = row.querySelector('input[name="precio[]"]').value.trim();
      if (producto && cantidad && precio) {
        productos.push(`${producto} x${cantidad} @${precio}`);
      }
    });

    const data = new URLSearchParams();
    data.append("sheet", "Estetica");
    data.append("nuevo", "true");
    data.append("Nombre del propietario", clienteActual["Nombre del propietario"]);
    data.append("Nombre de la mascota", clienteActual["Nombre de la mascota"]);
    data.append("Productos", productos.join(" | "));
    data.append("Total", totalSpan.textContent);

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
    if (confirm("¿Limpiar formulario? Se perderán los datos no guardados.")) {
      limpiarModalEstetica();
    }
  });

  // Calcular totales en tiempo real
  tabla.addEventListener("input", () => {
    let total = 0;
    tabla.querySelectorAll("tr").forEach(row => {
      const cantidad = parseFloat(row.querySelector('input[name="cantidad[]"]').value) || 0;
      const precio = parseFloat(row.querySelector('input[name="precio[]"]').value) || 0;
      const subtotal = cantidad * precio;
      row.querySelector(".subtotal").textContent = `$${subtotal.toFixed(2)}`;
      total += subtotal;
    });
    totalSpan.textContent = total.toFixed(2);
  });

  // Eliminar fila
  tabla.addEventListener("click", e => {
    if (e.target.classList.contains("btn-remove")) {
      e.target.closest("tr").remove();
      tabla.dispatchEvent(new Event("input")); // recalcular
    }
  });

  // Añadir nueva fila
  document.getElementById("add-producto").addEventListener("click", () => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" name="producto[]" placeholder="Producto" /></td>
      <td><input type="number" name="cantidad[]" value="1" min="1" /></td>
      <td><input type="number" name="precio[]" value="0.00" step="0.01" /></td>
      <td class="subtotal">$0.00</td>
      <td><button type="button" class="button-86 btn-remove">Eliminar</button></td>`;
    tabla.appendChild(row);
  });

  function limpiarModalEstetica() {
    selectMascota.value = "";
    infoMascota.innerHTML = "";
    clienteActual = null;
    tabla.innerHTML = "";
    document.getElementById("preview-antes").src = "";
    document.getElementById("preview-despues").src = "";
    totalSpan.textContent = "0.00";
    document.getElementById("add-producto").click(); // al menos una fila
  }
});
