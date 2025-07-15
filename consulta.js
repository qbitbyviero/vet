// consulta.js actualizado para el módulo de consulta veterinaria

console.log("🩺 consulta.js activo3");

document.addEventListener('DOMContentLoaded', function () {
  const btnToggle = document.getElementById('toggle-avanzado');
  const seccionAvanzada = document.getElementById('seccion-avanzada');
  const tipoRadios = document.querySelectorAll('input[name="consultaType"]');
  const divExistente = document.getElementById('consulta-existente');
  const divNueva = document.getElementById('consulta-nueva');

  // Mostrar/ocultar sección avanzada
  if (btnToggle && seccionAvanzada) {
    btnToggle.addEventListener('click', () => {
      const mostrar = seccionAvanzada.style.display === 'none';
      seccionAvanzada.style.display = mostrar ? 'block' : 'none';
      console.log(mostrar ? "🔼 Mostrando consulta detallada" : "🔽 Ocultando consulta detallada");
    });
  }

  // Mostrar/ocultar campos según tipo de consulta
  tipoRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'nueva') {
        divNueva.style.display = 'block';
        divExistente.style.display = 'none';
        console.log("🆕 Activando campos para nueva mascota");
      } else {
        divNueva.style.display = 'none';
        divExistente.style.display = 'block';
        console.log("🔁 Activando búsqueda para mascota existente");
      }
    });
  });

  // Evento para botón de búsqueda (futuro fetch de info de mascota)
  const btnBuscar = document.getElementById('buscar-consulta');
  if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
      const nombreMascota = document.getElementById('consulta-petName').value.trim();
      const resultadoDiv = document.getElementById('consulta-result');
      if (!nombreMascota) {
        resultadoDiv.innerHTML = '<span style="color:red">⚠️ Ingrese un nombre válido</span>';
        return;
      }

      // Aquí se conectará al Google Sheet en el futuro
      resultadoDiv.innerHTML = `🔍 Buscando datos de <strong>${nombreMascota}</strong>... <em>(función en desarrollo)</em>`;
      // TODO: integrar lógica de búsqueda real
    });
  }

  // Guardado de datos (formulario)
  const form = document.getElementById('form-consulta');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const dataObj = {};
    formData.forEach((value, key) => {
      if (dataObj[key]) {
        // Si ya existe la clave, convierte en arreglo
        if (!Array.isArray(dataObj[key])) dataObj[key] = [dataObj[key]];
        dataObj[key].push(value);
      } else {
        dataObj[key] = value;
      }
    });

    console.log("📤 Enviando datos a Spreadsheet (simulado):", dataObj);
    alert("✅ Consulta guardada (simulado)");

    // Aquí se puede agregar lógica para enviar a Google Sheets con fetch o Google Apps Script
    // Ejemplo: fetch('https://script.google.com/xxx', { method: 'POST', body: JSON.stringify(dataObj) })
  });
});
