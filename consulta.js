// consulta.js
console.log("🩺 consulta.js activo v5");

document.addEventListener('DOMContentLoaded', function () {
  const btnToggle = document.getElementById('toggle-avanzado');
  const seccionAvanzada = document.getElementById('seccion-avanzada');
  const tipoRadios = document.querySelectorAll('input[name="consultaType"]');
  const divExistente = document.getElementById('consulta-existente');
  const divNueva = document.getElementById('consulta-nueva');

  // Alternar consulta detallada
  if (btnToggle && seccionAvanzada) {
    btnToggle.addEventListener('click', () => {
      const mostrar = seccionAvanzada.style.display === 'none';
      seccionAvanzada.style.display = mostrar ? 'block' : 'none';
      console.log(mostrar ? "🔼 Mostrando consulta detallada" : "🔽 Ocultando consulta detallada");
    });
  }

  // Alternar entre consulta existente y nueva
  tipoRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const tipo = e.target.value;
      divExistente.style.display = tipo === 'existente' ? 'block' : 'none';
      divNueva.style.display = tipo === 'nueva' ? 'block' : 'none';
      console.log(tipo === 'nueva' ? "🆕 Activando nueva consulta" : "🔁 Activando búsqueda de mascota");
    });
  });

  // Simulación búsqueda mascota
  const btnBuscar = document.getElementById('buscar-consulta');
  if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
      const nombreMascota = document.getElementById('consulta-petName').value.trim();
      const resultadoDiv = document.getElementById('consulta-result');
      if (!nombreMascota) {
        resultadoDiv.innerHTML = '<span style="color:red">⚠️ Ingrese un nombre válido</span>';
        return;
      }
      resultadoDiv.innerHTML = `🔍 Buscando a <strong>${nombreMascota}</strong>... <em>(en desarrollo)</em>`;
    });
  }

  // Envío de formulario
  const form = document.getElementById('form-consulta');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = {};
      new FormData(form).forEach((value, key) => {
        if (data[key]) {
          if (!Array.isArray(data[key])) data[key] = [data[key]];
          data[key].push(value);
        } else {
          data[key] = value;
        }
      });
      console.log("📤 Datos recopilados para envío:", data);
      alert("✅ Consulta guardada exitosamente (simulado)");
    });
  }
});
