// consulta.js v15
console.log("🩺 consulta.js activo v19");

// === URL de tu GAS ===
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzb-UdlFaau_szrGZkksMaAwbufH5fIduVkCRNGnKCszSJrMJnf9LqIOhfcZtYcEG2brA/exec";

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
const addMedicBtn     = document.getElementById('add-medicamento');
const medsBody        = document.getElementById('meds-cuerpo');
const medsTotalSpan   = document.getElementById('meds-total');

// Cache y selección
let clientesData = [];
let seleccionado  = null;

// Mapa de diagramas
const mapaDiagramas = {
  "perro":    'svg/perro.png',
  "canino":   'svg/perro.png',
  "gato":     'svg/felino.svg',
  "felino":   'svg/felino.svg',
  "ave":      'svg/ave.png',
  "tortuga":  'svg/tortuga.svg',
  "serpiente":'svg/serpiente.svg',
  "lagarto":  'svg/lagarto.png',
  "pez":      'svg/pez.svg',
  "roedor":   'svg/roedor.svg'
};

// -------------------------
// Tabla de Medicamentos
// -------------------------
function addMedicRow() {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="med-nombre" placeholder="Medicamento"></td>
    <td><input type="text" class="med-cantidad" placeholder="Cantidad/Forma"></td>
    <td><input type="number" class="med-precio" step="0.01" value="0"></td>
    <td><button type="button" class="button-86 small remove-med">✖️</button></td>
  `;
  medsBody.appendChild(tr);
  updateTotal();
}

function updateTotal() {
  const precios = Array.from(document.querySelectorAll('.med-precio'))
    .map(i => parseFloat(i.value) || 0);
  const total = precios.reduce((a,b) => a + b, 0).toFixed(2);
  medsTotalSpan.textContent = total;
}

addMedicBtn.addEventListener('click', addMedicRow);
medsBody.addEventListener('click', e => {
  if (e.target.matches('.remove-med')) {
    e.target.closest('tr').remove();
    updateTotal();
  }
});
medsBody.addEventListener('input', e => {
  if (e.target.matches('.med-precio')) updateTotal();
});

// -------------------------
// Diagrama de Mascota
// -------------------------
function updateDiagrama(especie) {
  const img = document.getElementById('diagrama-img');
  const cont = document.getElementById('cliente-diagrama');
  img.src = mapaDiagramas[especie.toLowerCase()] || 'svg/placeholder.png';
  cont.style.display = 'block';
}

// -------------------------
// Toggle Avanzado
// -------------------------
btnToggle.addEventListener('click', () => {
  const show = seccionAvanzada.style.display === 'none';
  seccionAvanzada.style.display = show ? 'block' : 'none';
});

// -------------------------
// Alternar Existente/Nueva
// -------------------------
tipoRadios.forEach(radio => {
  radio.addEventListener('change', e => {
    const tipo = e.target.value;
    divExistente.style.display   = (tipo === 'existente') ? 'block' : 'none';
    divNueva.style.display        = (tipo === 'nueva')     ? 'block' : 'none';
    clienteEdicion.style.display  = 'none';
    document.getElementById('cliente-diagrama').style.display = 'none';
  });
});

// -------------------------
// Cargar Clientes
// -------------------------
window.loadAllClients()
  .then(data => { clientesData = data; console.log('🗄️ Clientes cargados:', data.length); })
  .catch(err => console.error('Error cargando clientes:', err));

// -------------------------
// Buscar Coincidencias
// -------------------------
btnBuscar.addEventListener('click', () => {
  const q = document.getElementById('consulta-petName').value.trim().toLowerCase();
  if (!q) {
    resultadoDiv.innerHTML = '<span style="color:red">⚠️ Ingrese un nombre válido</span>';
    return;
  }
  const matches = clientesData.filter(c =>
    (c['Nombre de la mascota']||'').toLowerCase().includes(q)
  );
  if (!matches.length) {
    resultadoDiv.innerHTML = '<span style="color:orange">🚫 No hay coincidencias</span>';
    return;
  }
  resultadoDiv.innerHTML = '<ul>' + matches.map((c,i) =>
    `<li data-idx="${i}" class="button-86 small">🐶 ${c['Nombre de la mascota']} — ${c['Nombre del propietario']}</li>`
  ).join('') + '</ul>';
  resultadoDiv.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      seleccionado = matches[+li.dataset.idx];
      cargarEdicionCliente(seleccionado);
    });
  });
});

// -------------------------
// Cargar para Edición
// -------------------------
function cargarEdicionCliente(c) {
  document.getElementById('edit-ownerName').value  = c['Nombre del propietario'] || '';
  document.getElementById('edit-ownerPhone').value = c['Número de Teléfono']    || '';
  document.getElementById('edit-ownerEmail').value = c['Correo']                || '';
  document.getElementById('edit-petName').value    = c['Nombre de la mascota']  || '';
  document.getElementById('edit-species').value    = c['Especie']               || '';
  document.getElementById('edit-breed').value      = c['Raza']                  || '';
  document.getElementById('edit-age').value        = c['Edad']                  || '';
  document.getElementById('edit-weight').value     = c['Peso']                  || '';
  document.getElementById('edit-sterilized').value = c['Esterilizado']          || 'Sí';
  document.getElementById('edit-notes').value      = c['Observaciones']         || '';
  clienteEdicion.style.display = 'block';
  updateDiagrama(c['Especie'] || '');
}

// -------------------------
// Actualizar Cliente
// -------------------------
btnActualizar.addEventListener('click', () => {
  if (!seleccionado) return;
  const params = new URLSearchParams();
  params.append('sheet', 'Clientes');
  params.append('actualizar', 'true');
  params.append('rowNumber', seleccionado.rowNumber);
  ['Nombre del propietario','Número de Teléfono','Correo','Nombre de la mascota',
   'Especie','Raza','Edad','Peso','Esterilizado','Observaciones']
  .forEach(col => {
    const el = document.querySelector(`[name="${col}"]`);
    if (el) params.append(col, el.value);
  });
  window.jsonpRequest(`${GAS_BASE_URL}?${params.toString()}`)
    .then(res => {
      if (!res.success) throw new Error(res.error||'Error al actualizar');
      return window.loadAllClients();
    })
    .then(data => {
      clientesData = data;
      seleccionado = clientesData.find(c => c.rowNumber === Number(params.get('rowNumber')));
      if (seleccionado) cargarEdicionCliente(seleccionado);
      alert('✅ Cliente actualizado correctamente');
    })
    .catch(err => {
      console.error(err);
      alert('❌ No se pudo actualizar cliente:\n' + err.message);
    });
});

// -------------------------
// Guardar Consulta
// -------------------------
form.addEventListener('submit', e => {
  e.preventDefault();
  const params = new URLSearchParams();
  params.append('sheet', 'Consulta');
  params.append('nuevo', 'true');
  // tipo
  params.append('consultaType', document.querySelector('input[name="consultaType"]:checked').value);
  // campos básicos y detallados
  ['Nombre del propietario','Número de Teléfono','Correo','Nombre de la mascota',
   'Especie','Raza','Edad','Peso','Esterilizado','Observaciones',
   'motivoConsulta','historialMedico','vacunacion','desparasitacion','alimentacion','estadoCorporal']
  .forEach(key => {
    const el = document.querySelector(`[name="${key}"]`);
    params.append(key, el ? el.value : '');
  });
  // medicamentos
  const medsArr = Array.from(document.querySelectorAll('.med-nombre')).map((input,i) => {
    const nom = input.value.trim();
    const cant = document.querySelectorAll('.med-cantidad')[i].value.trim();
    return nom + (cant ? ` (${cant})` : '');
  }).filter(x=>x);
  params.append('medicsuministrados', medsArr.join(', '));
  // indicaciones
  params.append('indicaciones', document.getElementById('indicaciones').value.trim());

  window.jsonpRequest(`${GAS_BASE_URL}?${params.toString()}`)
    .then(res => {
      if (!res.success) throw new Error(res.error||'');
      alert('✅ Consulta guardada en hoja “Consulta”');
      form.reset();
      divNueva.style.display       = 'none';
      divExistente.style.display   = 'block';
      seccionAvanzada.style.display= 'none';
      clienteEdicion.style.display = 'none';
      document.getElementById('cliente-diagrama').style.display = 'none';
      resultadoDiv.innerHTML       = '';
      medsBody.innerHTML = '';
      updateTotal();
      // Abrir receta con parámetros
      window.open(
        `Receta.html?meds=${encodeURIComponent(medsArr.join(', '))}` +
        `&inds=${encodeURIComponent(document.getElementById('indicaciones').value.trim())}`
      );
    })
    .catch(err => {
      console.error(err);
      alert('❌ No se pudo guardar la consulta:\n' + err.message);
    });
});

console.log("✅ consulta.js v15 inicializado correctamente.");
