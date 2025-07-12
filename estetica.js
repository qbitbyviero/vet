// estetica.js — v2, encapsulado en IIFE para evitar dobles declaraciones
console.log("✂️ estetica.js cargado correctamente.");

(() => {
  // Variable local para persistir mientras el modal está abierto
  let clienteActual = null;

  // Referencias DOM
  const selectMascota = document.getElementById("estetica-searchPet");
  const infoMascota    = document.getElementById("estetica-pet-info");
  const form           = document.getElementById("form-estetica");
  const btnLimpiar     = document.getElementById("btn-limpiar-estetica");
  const tabla          = document.querySelector("#tabla-productos tbody");
  const totalSpan      = document.getElementById("total-estetica");

  if (!selectMascota) {
    console.warn("⚠️ estetica.js: no encontré #estetica-searchPet, abortando inicialización.");
    return;
  }

  // 1) Carga inicial de clientes en el <select>
  (async () => {
    try {
      const clientes = await window.loadAllClients();
      console.log("🔁 Clientes cargados para estética:", clientes);

      clientes.forEach(c => {
        const nombre = c["Nombre de la mascota"];
        if (nombre) {
          const opt = document.createElement("option");
          opt.value       = nombre;
          opt.textContent = nombre + " (" + c["Nombre del propietario"] + ")";
          selectMascota.appendChild(opt);
        }
      });
    } catch (err) {
      console.error("❌ Error al cargar clientes:", err);
    }
  })();

  // 2) Al seleccionar mascota -> muestro datos
  selectMascota.addEventListener("change", () => {
    const sel = selectMascota.value;
    if (!sel) {
      clienteActual = null;
      infoMascota.innerHTML = "";
      return;
    }
    window.loadAllClients().then(clientes => {
      const cli = clientes.find(c => c["Nombre de la mascota"] === sel);
      if (cli) {
        clienteActual = cli;
        infoMascota.innerHTML = `
          <p><strong>Mascota:</strong> ${cli["Nombre de la mascota"]}</p>
          <p><strong>Propietario:</strong> ${cli["Nombre del propietario"]}</p>
          <p><strong>Teléfono:</strong> ${cli["Número de Teléfono"]}</p>
          <p><strong>Correo:</strong> ${cli["Correo"]}</p>
          <p><strong>Especie:</strong> ${cli["Especie"]}</p>
          <p><strong>Raza:</strong> ${cli["Raza"]}</p>
          <p><em>Datos cargados correctamente ✅</em></p>`;
      } else {
        clienteActual = null;
        infoMascota.innerHTML = "<p>No se encontró la mascota</p>";
      }
    });
  });

  // 3) Calcular subtotales y total en todo cambio de cantidad/precio
  tabla.addEventListener("input", () => {
    let total = 0;
    tabla.querySelectorAll("tr").forEach(row => {
      const qty   = parseFloat(row.querySelector('input[name="cantidad[]"]').value) || 0;
      const price = parseFloat(row.querySelector('input[name="precio[]"]').value)  || 0;
      const sub   = qty * price;
      row.querySelector(".subtotal").textContent = `$${sub.toFixed(2)}`;
      total += sub;
    });
    totalSpan.textContent = total.toFixed(2);
  });

  // 4) Botón "Eliminar" por delegación
  tabla.addEventListener("click", e => {
    if (e.target.classList.contains("btn-remove")) {
      e.target.closest("tr").remove();
      tabla.dispatchEvent(new Event("input"));
    }
  });

  // 5) "Añadir producto"
  document.getElementById("add-producto").addEventListener("click", () => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text"   name="producto[]" placeholder="Producto" /></td>
      <td><input type="number" name="cantidad[]"  value="1" min="1" /></td>
      <td><input type="number" name="precio[]"    value="0.00" step="0.01" /></td>
      <td class="subtotal">$0.00</td>
      <td><button type="button" class="button-86 btn-remove">Eliminar</button></td>`;
    tabla.appendChild(row);
  });

  // 6) Guardar estética
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!clienteActual) {
      alert("Debes seleccionar una mascota registrada.");
      return;
    }
    // arma lista de productos
    const productos = [];
    tabla.querySelectorAll("tr").forEach(r => {
      const prod = r.querySelector('input[name="producto[]"]').value.trim();
      const qty  = r.querySelector('input[name="cantidad[]"]').value.trim();
      const pr   = r.querySelector('input[name="precio[]"]').value.trim();
      if (prod && qty && pr) productos.push(`${prod} x${qty} @${pr}`);
    });

    const params = new URLSearchParams({
      sheet: "Estetica",
      nuevo: "true",
      "Nombre del propietario": clienteActual["Nombre del propietario"],
      "Nombre de la mascota":   clienteActual["Nombre de la mascota"],
      Productos: productos.join(" | "),
      Total: totalSpan.textContent
    });

    try {
      const url = `${GAS_BASE_URL}?${params.toString()}`;
      const res = await window.jsonpRequest(url);
      if (res.success) {
        alert("✅ Estética guardada correctamente.");
        limpiar();
      } else {
        alert("❌ Error al guardar: " + (res.error || "Sin detalle"));
      }
    } catch (err) {
      console.error("❌ Error al guardar estética:", err);
      alert("Error al guardar estética: " + err.message);
    }
  });

  // 7) Limpiar formulario
  btnLimpiar.addEventListener("click", () => {
    if (confirm("¿Limpiar formulario? Se perderán los datos no guardados.")) limpiar();
  });

  function limpiar() {
    selectMascota.value = "";
    infoMascota.innerHTML = "";
    clienteActual = null;
    // restauro una sola fila
    tabla.innerHTML = `
      <tr>
        <td><input type="text"   name="producto[]" placeholder="Shampoo" /></td>
        <td><input type="number" name="cantidad[]"  value="1" min="1" /></td>
        <td><input type="number" name="precio[]"    value="0.00" step="0.01" /></td>
        <td class="subtotal">$0.00</td>
        <td><button type="button" class="button-86 btn-remove">Eliminar</button></td>
      </tr>`;
    totalSpan.textContent = "0.00";
    document.getElementById("preview-antes").src = "";
    document.getElementById("preview-despues").src = "";
  }
})();
