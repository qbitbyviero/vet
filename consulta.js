// consulta.js (v15)
console.log("🩺 consulta.js activo v16");

// === URL de tu GAS ===
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbx6Up0O9--0fSItcQ83NfmTQdwHG3BWTIt3uySDfbuQ32OyDFHMvnoEkb9-l4EunRC9MQ/exec";

// — nodos —
const btnToggle       = document.getElementById('toggle-avanzado');
const seccionAvanzada = document.getElementById('seccion-avanzada');
const tipoRadios      = document.querySelectorAll('input[name="consultaType"]');
const divExistente    = document.getElementById('consulta-existente');
const divNueva        = document.getElementById('consulta-nueva');
const btnBuscar       = document.getElementById('buscar-consulta');
const resultadoDiv    = document.getElementById('consulta-result');
const clienteEdicion  = document.getElementById('cliente-edicion');
const btnActualizar   = document.getElementById('btn-actualizar-cliente');
const form            = document.getElementById('form-consulta');

// nodos tabla meds
const medTableBody = document.querySelector('#med-table tbody');
const medTotalSpan = document.getElementById('med-total');
const hiddenMeds   = document.getElementById('medicsuministrados');

let clientesData = [];    // cache de clientes
let seleccionado  = null; // cliente seleccionado

// 1) Alternar sección detallada
btnToggle.addEventListener('click', () => {
  seccionAvanzada.style.display =
    seccionAvanzada.style.display === 'none' ? 'block' : 'none';
});

// 2) Alternar existente / nueva
tipoRadios.forEach(radio => {
  radio.addEventListener('change', e => {
    divExistente.style.display  = e.target.value === 'existente' ? 'block':'none';
    divNueva.style.display       = e.target.value === 'nueva'     ? 'block':'none';
    clienteEdicion.style.display = 'none';
  });
});

// 3) Traer clientes al arrancar
window.loadAllClients()
  .then(data => { clientesData = data; console.log("🗄️ Clientes cargados:", data.length); })
  .catch(err => console.error("Error cargando clientes:", err));

// 4) Buscar coincidencias
btnBuscar.addEventListener('click', () => {
  const q = document.getElementById('consulta-petName').value.trim().toLowerCase();
  if (!q) {
    resultadoDiv.innerHTML = '<span style="color:red">⚠️ Ingrese un nombre válido</span>';
    return;
  }
  const matches = clientesData.filter(c =>
    (c["Nombre de la mascota"]||"").toLowerCase().includes(q)
  );
  if (!matches.length) {
    resultadoDiv.innerHTML = '<span style="color:orange">🚫 No hay coincidencias</span>';
    return;
  }
  resultadoDiv.innerHTML = '<ul>' + matches.map((c,i) =>
    `<li data-idx="${i}" class="button-86 small">
       🐶 ${c["Nombre de la mascota"]} — ${c["Nombre del propietario"]}
     </li>`
  ).join('') + '</ul>';
  resultadoDiv.querySelectorAll('li').forEach(li =>
    li.addEventListener('click', () => {
      seleccionado = matches[+li.dataset.idx];
      cargarEdicionCliente(seleccionado);
    })
  );
});

// 5) Cargar datos para editar
function cargarEdicionCliente(c) {
  console.log("📝 Cliente seleccionado:", c);
  document.getElementById('edit-ownerName').value  = c["Nombre del propietario"] || "";
  document.getElementById('edit-ownerPhone').value = c["Número de Teléfono"]    || "";
  document.getElementById('edit-ownerEmail').value = c["Correo"]                || "";
  document.getElementById('edit-petName').value     = c["Nombre de la mascota"]  || "";
  document.getElementById('edit-species').value    = c["Especie"]               || "";
  document.getElementById('edit-breed').value      = c["Raza"]                  || "";
  document.getElementById('edit-age').value        = c["Edad"]                  || "";
  document.getElementById('edit-weight').value     = c["Peso"]                  || "";
  document.getElementById('edit-sterilized').value = c["Esterilizado"]          || "Sí";
  document.getElementById('edit-notes').value      = c["Observaciones"]         || "";
  clienteEdicion.style.display = 'block';
}

// 6) Actualizar cliente
btnActualizar.addEventListener('click', () => {
  if (!seleccionado) return;
  const params = new URLSearchParams({
    sheet:      'Clientes',
    actualizar: 'true',
    rowNumber:  seleccionado.rowNumber
  });
  [
    'Nombre del propietario','Número de Teléfono','Correo',
    'Nombre de la mascota','Especie','Raza','Edad','Peso',
    'Esterilizado','Observaciones'
  ].forEach(col => {
    const el = document.querySelector(`[name="${col}"]`);
    if (el) params.append(col, el.value);
  });

  window.jsonpRequest(`${GAS_BASE_URL}?${params}`)
    .then(res => {
      if (!res.success) throw new Error(res.error||'Error al actualizar');
      return window.loadAllClients();
    })
    .then(data => {
      clientesData = data;
      seleccionado = clientesData.find(c => c.rowNumber===+params.get('rowNumber'));
      cargarEdicionCliente(seleccionado);
      alert('✅ Cliente actualizado correctamente');
    })
    .catch(err => {
      console.error(err);
      alert('❌ No se pudo actualizar cliente:\n'+err.message);
    });
});

// 7) Lógica de tabla de medicamentos

// recalcula total de precios
function recalcularTotal() {
  let total = 0;
  medTableBody.querySelectorAll('.med-price').forEach(inp => {
    total += parseFloat(inp.value) || 0;
  });
  medTotalSpan.textContent = total.toFixed(2);
}

// añade una fila nueva
function addMedRow() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="med-name" placeholder="Medicamento" /></td>
    <td><input type="number" class="med-qty" placeholder="Cantidad" min="0" step="1" /></td>
    <td><input type="number" class="med-price" placeholder="Precio" min="0" step="0.01" /></td>
    <td>
      <button type="button" class="button-86 small btn-remove-med">−</button>
      <button type="button" class="button-86 small btn-add-med">+</button>
    </td>`;
  medTableBody.appendChild(tr);

  // listeners
  tr.querySelector('.med-price').addEventListener('input', recalcularTotal);
  tr.querySelector('.btn-remove-med').addEventListener('click', () => {
    tr.remove(); recalcularTotal();
  });
  tr.querySelector('.btn-add-med').addEventListener('click', addMedRow);
}

// engancha el +
medTableBody.querySelector('.btn-add-med').addEventListener('click', addMedRow);

// 8) Guardar consulta
form.addEventListener('submit', e => {
  e.preventDefault();

  // 8.1) serializar medicamentos + total
  const lines = Array.from(medTableBody.querySelectorAll('tr')).map(tr => {
    const n = tr.querySelector('.med-name').value.trim();
    const q = tr.querySelector('.med-qty').value.trim();
    const p = tr.querySelector('.med-price').value.trim();
    if (!n) return null;
    return `${n}|${q}|${p}`;
  }).filter(x=>x);
  const total = medTotalSpan.textContent;
  hiddenMeds.value = lines.join(';') + `;Total:${total}`;

  // 8.2) preparar y enviar JSONP
  const fd = new FormData(form);
  const consultaParams = new URLSearchParams({ sheet:'Consulta', nuevo:'true' });
  fd.forEach((v,k)=>consultaParams.append(k,v));

  window.jsonpRequest(`${GAS_BASE_URL}?${consultaParams}`)
    .then(res => {
      if (!res.success) throw new Error(res.error||'Error al guardar');
      alert('✅ Consulta guardada en hoja “Consulta”');
      form.reset();
      divNueva.style.display        = 'none';
      divExistente.style.display    = 'block';
      seccionAvanzada.style.display = 'none';
      clienteEdicion.style.display  = 'none';
      resultadoDiv.innerHTML        = '';
      // reset meds tabla
      medTableBody.innerHTML = `
        <tr>
          <td><input type="text" class="med-name" placeholder="Medicamento" /></td>
          <td><input type="number" class="med-qty" placeholder="Cantidad" min="0" step="1" /></td>
          <td><input type="number" class="med-price" placeholder="Precio" min="0" step="0.01" /></td>
          <td><button type="button" class="button-86 small btn-add-med">+</button></td>
        </tr>`;
      medTotalSpan.textContent = '0.00';
      // reenganchar +
      medTableBody.querySelector('.btn-add-med').addEventListener('click', addMedRow);
    })
    .catch(err => {
      console.error(err);
      alert('❌ No se pudo guardar la consulta:\n'+err.message);
    });
});

console.log("✅ consulta.js v15 inicializado correctamente.");
