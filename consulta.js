// consulta.js
console.log("🩺 consulta.js activo v6");

document.addEventListener('DOMContentLoaded', () => {
  const GAS = "https://script.google.com/macros/s/.../exec";
  const jsonp = window.jsonpRequest;

  // — Elementos clave —
  const tipoRadios = document.querySelectorAll('input[name="consultaType"]');
  const divExist = document.getElementById('consulta-existente');
  const divNueva = document.getElementById('consulta-nueva');
  const listResults = document.getElementById('consulta-results-list');
  const btnBuscar   = document.getElementById('buscar-consulta');
  const btnUpdate   = document.getElementById('update-client-btn');
  const btnToggle   = document.getElementById('toggle-avanzado');
  const secAvanzada = document.getElementById('seccion-avanzada');
  const tablaMeds   = document.querySelector('#tabla-meds-consulta tbody');
  const spanTotal   = document.getElementById('total-consulta');
  const form        = document.getElementById('form-consulta');

  let currentClient = null;   // objeto cliente cargado (incluye ID fila)

  // 1) Cambio radio existente/nueva
  tipoRadios.forEach(r => r.addEventListener('change', e => {
    if (e.target.value === 'nueva') {
      divExist.style.display = 'none';
      divNueva.style.display = 'block';
    } else {
      divExist.style.display = 'block';
      divNueva.style.display = 'none';
    }
  }));

  // 2) Buscar mascotas en “Clientes”
  btnBuscar.addEventListener('click', async () => {
    const q = document.getElementById('consulta-petName').value.trim().toLowerCase();
    listResults.innerHTML = '';
    if (!q) return alert('Ingrese un nombre válido');

    try {
      const clientes = await jsonp(`${GAS}?sheet=Clientes`);
      // Filtramos coincidencias parciales en columna E (“Nombre de la mascota”)
      const matches = clientes.filter(c =>
        (c['Nombre de la mascota']||"").toLowerCase().includes(q)
      );
      if (!matches.length) {
        listResults.innerHTML = `<li>⚠️ No hay resultados</li>`;
      } else {
        // listamos
        matches.forEach(c => {
          const li = document.createElement('li');
          li.textContent = `${c['Nombre de la mascota']} — ${c['Nombre del propietario']}`;
          li.style.cursor = 'pointer';
          li.onclick = () => loadClientToForm(c);
          listResults.appendChild(li);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Error al buscar clientes');
    }
  });

  // 3) Cargar cliente al formulario de edición
  function loadClientToForm(c) {
    currentClient = c;
    // rellenamos inputs en #consulta-nueva
    ['ownerName','ownerPhone','ownerEmail','petNameNew','speciesNew','breedNew','age','weight','observaciones']
      .forEach(id => {
        document.getElementById(id).value = c[ mapField(id) ]||"";
      });
    document.getElementById('esterilizado').value = c['Esterilizado'] || 'Sí';
    // cambiamos a “nueva” para que se muestre
    document.querySelector('input[value="nueva"]').checked = true;
    divExist.style.display = 'none';
    divNueva.style.display = 'block';
  }

  // Helper: map id → columna en sheet
  function mapField(id) {
    return {
      ownerName:    'Nombre del propietario',
      ownerPhone:   'Número de Teléfono',
      ownerEmail:   'Correo',
      petNameNew:   'Nombre de la mascota',
      speciesNew:   'Especie',
      breedNew:     'Raza',
      age:          'Edad',
      weight:       'Peso',
      observaciones:'Observaciones'
    }[id];
  }

  // 4) Actualizar cliente «sheet=Clientes&actualizar=true»
  btnUpdate.addEventListener('click', async () => {
    if (!currentClient) return alert('Primero busca y selecciona un cliente');
    const params = new URLSearchParams({ sheet: 'Clientes', actualizar: 'true' });
    params.append('Nombre de la mascota clave', currentClient['Nombre de la mascota']);
    // campos editados
    ['ownerName','ownerPhone','ownerEmail','petNameNew','speciesNew','breedNew','age','weight','observaciones']
      .forEach(id => {
        params.append(mapField(id), document.getElementById(id).value.trim());
      });
    params.append('Esterilizado', document.getElementById('esterilizado').value);
    try {
      const res = await jsonp(`${GAS}?${params}`);
      if (res.success) {
        alert('✅ Cliente actualizado');
      } else {
        throw new Error(res.error||'sin detalle');
      }
    } catch (err) {
      console.error(err);
      alert('❌ No se pudo actualizar cliente');
    }
  });

  // 5) Tablas de medicamentos
  document.getElementById('add-med').onclick = () => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input name="medicamento[]" class="med-input" /></td>
      <td><input name="dosage[]" /></td>
      <td><input name="via[]" /></td>
      <td><input name="precio[]" class="precio-input" value="0" /></td>
      <td><button type="button" class="btn-remove">✖️</button></td>
    `;
    tablaMeds.appendChild(tr);
    tr.querySelector('.btn-remove').onclick = () => {
      tr.remove();
      recalcTotal();
    };
    tr.querySelector('.precio-input').oninput = recalcTotal;
  };
  function recalcTotal() {
    let total = 0;
    document.querySelectorAll('.precio-input').forEach(i => {
      total += parseFloat(i.value)||0;
    });
    spanTotal.textContent = total.toFixed(2);
  }

  // 6) Toggle sección detallada
  btnToggle.onclick = () => {
    secAvanzada.style.display =
      secAvanzada.style.display === 'block' ? 'none' : 'block';
  };

  // 7) Al guardar la consulta:
  form.onsubmit = async e => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v,k) => {
      if (data[k]) {
        if (!Array.isArray(data[k])) data[k] = [data[k]];
        data[k].push(v);
      } else data[k] = v;
    });
    // Total y tipo
    data.total = spanTotal.textContent;
    data.tipo  = 'Consulta';
    data.fecha = (new Date()).toISOString().split('T')[0];

    try {
      // 7.1 -> sheet=Consulta
      await jsonp(`${GAS}?sheet=Consulta&nuevo=true&` + new URLSearchParams(data));
      // 7.2 -> sheet=VentasDiarias
      await jsonp(`${GAS}?sheet=VentasDiarias&nuevo=true&` +
        new URLSearchParams({
          Fecha: data.fecha,
          Tipo:  data.tipo,
          Total: data.total
        }));
      alert('✅ Consulta y venta registradas');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('❌ Error guardando consulta/venta');
    }
  };

});
