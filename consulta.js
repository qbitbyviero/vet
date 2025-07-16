// consulta.js
console.log("🩺 consulta.js activo v6");

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
let seleccionado  = null; // fila elegida

// 1) Alternar sección detallada
btnToggle.addEventListener('click', () => {
  const mostrar = seccionAvanzada.style.display === 'none';
  seccionAvanzada.style.display = mostrar ? 'block' : 'none';
  console.log(mostrar
    ? "🔼 Mostrando consulta detallada"
    : "🔽 Ocultando consulta detallada");
});

// 2) Alternar existente / nueva
tipoRadios.forEach(radio => {
  radio.addEventListener('change', e => {
    const tipo = e.target.value;
    divExistente.style.display   = (tipo === 'existente') ? 'block' : 'none';
    divNueva.style.display        = (tipo === 'nueva')     ? 'block' : 'none';
    clienteEdicion.style.display  = 'none'; // ocultar edición si cambiamos
    console.log(tipo === 'nueva'
      ? "🆕 Activando nueva consulta"
      : "🔁 Activando búsqueda de mascota");
  });
});

// 3) Traer clientes al arranque (usa tu función global de main.js)
window.loadAllClients()
  .then(data => {
    clientesData = data;
    console.log("🗄️ Clientes cargados:", data.length);
  })
  .catch(err => console.error("Error cargando clientes:", err));

// 4) Buscar coincidencias en “Clientes”
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
  // Listar resultados clicables
  resultadoDiv.innerHTML = '<ul>' + matches.map((c,i) =>
    `<li data-idx="${i}" class="button-86 small">
       🐶 ${c["Nombre de la mascota"]} — ${c["Nombre del propietario"]}
     </li>`
  ).join('') + '</ul>';

  // Asociar click a cada uno
  resultadoDiv.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      seleccionado = matches[+li.dataset.idx];
      cargarEdicionCliente(seleccionado);
    });
  });
});

// 5) Rellenar formulario de edición
function cargarEdicionCliente(c) {
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
  const params = new URLSearchParams();
  params.append('sheet',       'Clientes');
  params.append('actualizar',  'true');
  params.append('Nombre de la mascota clave', seleccionado["Nombre de la mascota"]);
  // Campos permitidos (sin tocar columna ID)
  params.append('Nombre del propietario', document.getElementById('edit-ownerName').value);
  params.append('Número de Teléfono',      document.getElementById('edit-ownerPhone').value);
  params.append('Correo',                  document.getElementById('edit-ownerEmail').value);
  params.append('Nombre de la mascota',    document.getElementById('edit-petName').value);
  params.append('Especie',                 document.getElementById('edit-species').value);
  params.append('Raza',                    document.getElementById('edit-breed').value);
  params.append('Edad',                    document.getElementById('edit-age').value);
  params.append('Peso',                    document.getElementById('edit-weight').value);
  params.append('Esterilizado',            document.getElementById('edit-sterilized').value);
  params.append('Observaciones',           document.getElementById('edit-notes').value);

  window.jsonpRequest(`${GAS_BASE_URL}?${params.toString()}`)
    .then(res => {
      if (!res.success) throw new Error(res.error || 'Error desconocido');
      alert('✅ Cliente actualizado correctamente');
      return window.loadAllClients(); // refrescar caché
    })
    .then(data => {
      clientesData = data;
      clienteEdicion.style.display = 'none';
    })
    .catch(err => {
      console.error("❌ No se pudo actualizar cliente:", err);
      alert('❌ No se pudo actualizar cliente:\n' + err.message);
    });
});

// 7) Guardar ficha en “Consulta”
form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const consultaParams = new URLSearchParams();
  consultaParams.append('sheet', 'Consulta');
  consultaParams.append('nuevo', 'true');

  // Recorre *todos* los campos (existente o nueva + detallada)
  fd.forEach((val, key) => consultaParams.append(key, val));

  window.jsonpRequest(`${GAS_BASE_URL}?${consultaParams.toString()}`)
    .then(res => {
      if (!res.success) throw new Error(res.error || 'Error desconocido');
      alert('✅ Consulta guardada en hoja “Consulta”');
      // Reset visual
      form.reset();
      divNueva.style.display       = 'none';
      divExistente.style.display   = 'block';
      seccionAvanzada.style.display = 'none';
      clienteEdicion.style.display  = 'none';
      resultadoDiv.innerHTML        = '';
      seleccionado = null;
    })
    .catch(err => {
      console.error("❌ No se pudo guardar la consulta:", err);
      alert('❌ No se pudo guardar la consulta:\n' + err.message);
    });
});

console.log("✅ consulta.js inicializado correctamente.");
