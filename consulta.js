// consulta.js
(function() {
  console.log("🩺 consulta.js inicializado");

  // Localiza el modal recién inyectado
  const modal = document.querySelector('.modal-consulta');
  if (!modal) {
    console.warn("❌ consulta.js: modal no encontrado");
    return;
  }

  // Referencias dentro del modal
  const tipoRadios = modal.querySelectorAll('input[name="consultaType"]');
  const divExist   = modal.querySelector('#consulta-existente');
  const divNueva   = modal.querySelector('#consulta-nueva');
  const btnBuscar  = modal.querySelector('#buscar-consulta');
  const resultsUl  = modal.querySelector('#consulta-results-list');
  const btnUpdate  = modal.querySelector('#update-client-btn');
  const btnToggle  = modal.querySelector('#toggle-avanzado');
  const secAdv     = modal.querySelector('#seccion-avanzada');
  const tablaMeds  = modal.querySelector('#tabla-meds-consulta tbody');
  const spanTot    = modal.querySelector('#total-consulta');
  const form       = modal.querySelector('#form-consulta');

  let currentClient = null;
  const GAS = "https://script.google.com/macros/s/…/exec";
  const jsonp = window.jsonpRequest;

  // 1) Alterna existente / nueva
  tipoRadios.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.value === 'nueva') {
        divExist.style.display = 'none';
        divNueva.style.display = 'block';
      } else {
        divExist.style.display = 'block';
        divNueva.style.display = 'none';
      }
    });
  });

  // 2) Buscar mascotas en "Clientes"
  btnBuscar.addEventListener('click', async () => {
    const q = modal.querySelector('#consulta-petName').value.trim().toLowerCase();
    resultsUl.innerHTML = '';
    if (!q) return alert('Ingrese un nombre válido');
    try {
      const clientes = await jsonp(`${GAS}?sheet=Clientes`);
      const matches = clientes.filter(c =>
        (c['Nombre de la mascota']||'').toLowerCase().includes(q)
      );
      if (!matches.length) {
        resultsUl.innerHTML = '<li>⚠️ No hay resultados</li>';
      } else {
        matches.forEach(c => {
          const li = document.createElement('li');
          li.textContent = `${c['Nombre de la mascota']} — ${c['Nombre del propietario']}`;
          li.onclick = () => loadClient(c);
          resultsUl.appendChild(li);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Error buscando clientes');
    }
  });

  // 3) Carga datos de cliente en el formulario
  function loadClient(c) {
    currentClient = c;
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
      modal.querySelector(`#${id}`).value = c[M[id]] || '';
    });
    modal.querySelector('#esterilizado').value = c['Esterilizado'] || 'Sí';
    // Fuerza modo edición
    modal.querySelector('input[value="nueva"]').checked = true;
    divExist.style.display = 'none';
    divNueva.style.display = 'block';
  }

  // 4) Actualizar cliente en la hoja
  btnUpdate.addEventListener('click', async () => {
    if (!currentClient) return alert('Selecciona un cliente primero');
    const params = new URLSearchParams({
      sheet: 'Clientes',
      actualizar: 'true',
      'Nombre de la mascota clave': currentClient['Nombre de la mascota']
    });
    // vuelve a mapear los mismos campos
    ['ownerName','ownerPhone','ownerEmail','petNameNew','speciesNew','breedNew','age','weight','observaciones']
      .forEach(id => {
        params.append(M[id]||id, modal.querySelector(`#${id}`).value.trim());
      });
    params.append('Esterilizado', modal.querySelector('#esterilizado').value);
    try {
      const res = await jsonp(`${GAS}?${params}`);
      if (res.success) alert('✅ Cliente actualizado');
      else throw new Error(res.error||'sin detalle');
    } catch {
      alert('❌ No se pudo actualizar cliente');
    }
  });

  // 5) Medicamentos: añadir, eliminar y recalcular total
  modal.querySelector('#add-med').onclick = () => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input name="medicamento[]" /></td>
      <td><input name="dosage[]" /></td>
      <td><input name="via[]" /></td>
      <td><input name="precio[]" value="0" /></td>
      <td><button type="button" class="button-86 small btn-remove">✖️</button></td>
    `;
    tablaMeds.appendChild(tr);
    tr.querySelector('.btn-remove').onclick = () => { tr.remove(); recalc(); };
    tr.querySelector('input[name="precio[]"]').oninput = recalc;
  };
  function recalc() {
    let tot = 0;
    tablaMeds.querySelectorAll('input[name="precio[]"]').forEach(i => {
      tot += parseFloat(i.value) || 0;
    });
    spanTot.textContent = tot.toFixed(2);
  }

  // 6) Toggle sección detallada
  btnToggle.onclick = () => {
    secAdv.style.display = secAdv.style.display === 'block' ? 'none' : 'block';
  };

  // 7) Guardar consulta y registrar en VentasDiarias
  form.onsubmit = async e => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v,k) => {
      if (data[k]) {
        if (!Array.isArray(data[k])) data[k] = [data[k]];
        data[k].push(v);
      } else data[k] = v;
    });
    data.total = spanTot.textContent;
    data.tipo  = 'Consulta';
    data.fecha = new Date().toISOString().split('T')[0];

    try {
      // crea en hoja "Consulta"
      await jsonp(`${GAS}?sheet=Consulta&nuevo=true&${new URLSearchParams(data)}`);
      // crea en hoja "VentasDiarias"
      await jsonp(`${GAS}?sheet=VentasDiarias&nuevo=true&${new URLSearchParams({
        Fecha: data.fecha, Tipo: data.tipo, Total: data.total
      })}`);
      alert('✅ Consulta y venta registradas');
      location.reload();
    } catch {
      alert('❌ Error guardando consulta/venta');
    }
  };
})();
