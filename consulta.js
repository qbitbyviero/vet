// consulta.js (v14)
console.log("🩺 consulta.js activo v14");

// === URL de tu GAS (idéntica a main.js) ===
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

let clientesData = [];    // cache de clientes
let seleccionado  = null; // cliente seleccionado

// 1) Alternar sección detallada
btnToggle.addEventListener('click', () => {
  const show = seccionAvanzada.style.display === 'none';
  seccionAvanzada.style.display = show ? 'block' : 'none';
});

// 2) Alternar existente / nueva
tipoRadios.forEach(radio => {
  radio.addEventListener('change', e => {
    const tipo = e.target.value;
    divExistente.style.display   = (tipo === 'existente') ? 'block' : 'none';
    divNueva.style.display        = (tipo === 'nueva')     ? 'block' : 'none';
    clienteEdicion.style.display  = 'none';
  });
});

// 3) Traer clientes al arrancar
window.loadAllClients()
  .then(data => {
    clientesData = data;
    console.log("🗄️ Clientes cargados:", data.length);
  })
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
  resultadoDiv.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      seleccionado = matches[+li.dataset.idx];
      cargarEdicionCliente(seleccionado);
    });
  });
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

// 6) Actualizar cliente en “Clientes”
btnActualizar.addEventListener('click', () => {
  if (!seleccionado) return;

  // 1) Preparamos params con rowNumber
  const params = new URLSearchParams();
  params.append('sheet',      'Clientes');
  params.append('actualizar', 'true');
  params.append('rowNumber',  seleccionado.rowNumber);

  // 2) Agregamos TODOS los campos editables tal y como definiste name="…"
  [
    'Nombre del propietario',
    'Número de Teléfono',
    'Correo',
    'Nombre de la mascota',
    'Especie',
    'Raza',
    'Edad',
    'Peso',
    'Esterilizado',
    'Observaciones'
  ].forEach(col => {
    const el = document.querySelector(`[name="${col}"]`);
    if (el) params.append(col, el.value);
  });

  // 3) Lanzamos JSONP y comprobamos res.success
  window.jsonpRequest(`${GAS_BASE_URL}?${params.toString()}`)
    .then(res => {
      console.log('🔄 respuesta update →', res);
      if (!res.success) throw new Error(res.error||'Error desconocido al actualizar');
      // 4) recargamos cache
      return window.loadAllClients();
    })
    .then(data => {
      clientesData = data;
      // 5) localizar la fila nuevamente en el nuevo cache
      seleccionado = clientesData.find(c => c.rowNumber === Number(params.get('rowNumber')));
      if (!seleccionado) throw new Error('No se encontró la fila recargada');
      // 6) recargamos el formulario con los valores actualizados
      cargarEdicionCliente(seleccionado);
      alert('✅ Cliente actualizado correctamente');
    })
    .catch(err => {
      console.error('❌ fallo update →', err);
      alert('❌ No se pudo actualizar cliente:\n' + err.message);
    });
});

// 7) Guardar toda la consulta en la hoja “Consulta”
form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const consultaParams = new URLSearchParams();
  consultaParams.append('sheet', 'Consulta');
  consultaParams.append('nuevo', 'true');
  fd.forEach((val,key) => consultaParams.append(key,val));

  window.jsonpRequest(`${GAS_BASE_URL}?${consultaParams.toString()}`)
    .then(res => {
      if (!res.success) throw new Error(res.error||'Error desconocido');
      alert('✅ Consulta guardada en hoja “Consulta”');
      form.reset();
      divNueva.style.display        = 'none';
      divExistente.style.display    = 'block';
      seccionAvanzada.style.display = 'none';
      clienteEdicion.style.display  = 'none';
      resultadoDiv.innerHTML        = '';
      seleccionado = null;
    })
    .catch(err => {
      console.error(err);
      alert('❌ No se pudo guardar la consulta:\n' + err.message);
    });
});

console.log("✅ consulta.js v14 inicializado correctamente.");
