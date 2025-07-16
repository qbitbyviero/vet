// consulta.js (v6 corregido)
console.log("🩺 consulta.js activo v6");

document.addEventListener('DOMContentLoaded', () => {
  const GAS = "https://script.google.com/macros/s/…/exec";
  const jsonp = window.jsonpRequest;

  // Referencias DOM
  const tipoRadios = document.querySelectorAll('input[name="consultaType"]');
  const divExist = document.getElementById('consulta-existente');
  const divNueva = document.getElementById('consulta-nueva');
  const listRes  = document.getElementById('consulta-results-list');
  const btnBuscar= document.getElementById('buscar-consulta');
  const btnUpdate= document.getElementById('update-client-btn');
  const btnToggle= document.getElementById('toggle-avanzado');
  const secAdv   = document.getElementById('seccion-avanzada');
  const tablaMeds= document.querySelector('#tabla-meds-consulta tbody');
  const spanTot  = document.getElementById('total-consulta');
  const form     = document.getElementById('form-consulta');

  let currentClient = null;

  // 1) Alternar existente/nueva
  tipoRadios.forEach(r => r.addEventListener('change', e => {
    if (e.target.value === 'nueva') {
      divExist.style.display = 'none';
      divNueva.style.display = 'block';
    } else {
      divExist.style.display = 'block';
      divNueva.style.display = 'none';
    }
  }));

  // 2) Buscar mascotas
  btnBuscar.addEventListener('click', async () => {
    const q = document.getElementById('consulta-petName').value.trim().toLowerCase();
    listRes.innerHTML = '';
    if (!q) return alert('Ingrese un nombre válido');
    try {
      const clientes = await jsonp(`${GAS}?sheet=Clientes`);
      const matches = clientes.filter(c =>
        (c['Nombre de la mascota']||'').toLowerCase().includes(q)
      );
      if (!matches.length) {
        listRes.innerHTML = '<li>⚠️ No hay resultados</li>';
      } else {
        matches.forEach(c => {
          const li = document.createElement('li');
          li.textContent = `${c['Nombre de la mascota']} — ${c['Nombre del propietario']}`;
          li.onclick = () => loadClient(c);
          listRes.appendChild(li);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Error buscando clientes');
    }
  });

  // 3) Cargar cliente al form
  function loadClient(c) {
    currentClient = c;
    // Mapea id→campo
    const M = {
      ownerName: 'Nombre del propietario',
      ownerPhone:'Número de Teléfono',
      ownerEmail:'Correo',
      petNameNew:'Nombre de la mascota',
      speciesNew:'Especie',
      breedNew:  'Raza',
      age:       'Edad',
      weight:    'Peso',
      observaciones:'Observaciones'
    };
    Object.keys(M).forEach(id => {
      document.getElementById(id).value = c[M[id]]||'';
    });
    document.getElementById('esterilizado').value = c['Esterilizado']||'Sí';

    // Mostrar sección nueva/edición
    document.querySelector('input[value="nueva"]').checked = true;
    divExist.style.display = 'none';
    divNueva.style.display = 'block';
  }

  // 4) Actualizar cliente en sheet
  btnUpdate.addEventListener('click', async () => {
    if (!currentClient) return alert('Selecciona un cliente primero');
    const params = new URLSearchParams({
      sheet: 'Clientes',
      actualizar: 'true',
      'Nombre de la mascota clave': currentClient['Nombre de la mascota']
    });
    // agrega todos los campos
    ['ownerName','ownerPhone','ownerEmail','petNameNew','speciesNew','breedNew','age','weight','observaciones']
      .forEach(id => {
        const val = document.getElementById(id).value.trim();
        params.append(
          M[id] || id,
          val
        );
      });
    params.append('Esterilizado', document.getElementById('esterilizado').value);
    try {
      const res = await jsonp(`${GAS}?${params}`);
      if (res.success) alert('✅ Cliente actualizado');
      else throw new Error(res.error||'sin detalle');
    } catch {
      alert('❌ No se pudo actualizar cliente');
    }
  });

  // 5) Medicamentos: añadir / eliminar / recalcular
  document.getElementById('add-med').onclick = () => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input name="medicamento[]" class="med-input" /></td>
      <td><input name="dosage[]" /></td>
      <td><input name="via[]" /></td>
      <td><input name="precio[]" class="precio-input" value="0" /></td>
      <td><button type="button" class="button-86 small btn-remove">✖️</button></td>
    `;
    tablaMeds.appendChild(tr);
    tr.querySelector('.btn-remove').onclick = () => { tr.remove(); recalc(); };
    tr.querySelector('.precio-input').oninput = recalc;
  };
  function recalc() {
    let tot = 0;
    document.querySelectorAll('.precio-input').forEach(i => tot += parseFloat(i.value)||0);
    spanTot.textContent = tot.toFixed(2);
  }

  // 6) Toggle sección detallada
  btnToggle.onclick = () => {
    secAdv.style.display = secAdv.style.display==='block'?'none':'block';
  };

  // 7) Guardar consulta + ventas
  form.onsubmit = async e => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v,k)=>{
      if (data[k]) {
        if (!Array.isArray(data[k])) data[k]=[data[k]];
        data[k].push(v);
      } else data[k]=v;
    });
    // agrega total, tipo y fecha
    data.total = spanTot.textContent;
    data.tipo  = 'Consulta';
    data.fecha = (new Date()).toISOString().split('T')[0];

    try {
      // sheet Consulta
      await jsonp(`${GAS}?sheet=Consulta&nuevo=true&${new URLSearchParams(data)}`);
      // sheet VentasDiarias
      await jsonp(`${GAS}?sheet=VentasDiarias&nuevo=true&${new URLSearchParams({
        Fecha: data.fecha, Tipo: data.tipo, Total: data.total
      })}`);
      alert('✅ Consulta y venta registradas');
      location.reload();
    } catch {
      alert('❌ Error guardando consulta/venta');
    }
  };
});
