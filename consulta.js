// consulta.js versión 4 – limpio y funcional
console.log("🩺 consulta.js activo v4");

document.addEventListener('DOMContentLoaded', () => {
  const btnToggle = document.getElementById('toggle-avanzado');
  const seccionAvanzada = document.getElementById('seccion-avanzada');
  const tipoRadios = document.querySelectorAll('input[name="consultaType"]');
  const divExistente = document.getElementById('consulta-existente');
  const divNueva = document.getElementById('consulta-nueva');
  const btnBuscar = document.getElementById('buscar-consulta');
  const form = document.getElementById('form-consulta');

  // Alternar campos nueva/existente
  tipoRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const tipo = e.target.value;
      if (tipo === 'nueva') {
        divNueva.style.display = 'block';
        divExistente.style.display = 'none';
        console.log("🆕 Mostrando campos para nueva mascota");
      } else {
        divNueva.style.display = 'none';
        divExistente.style.display = 'block';
        console.log("🔁 Mostrando búsqueda de mascota existente");
      }
    });
  });

  // Toggle sección avanzada
  btnToggle.addEventListener('click', () => {
    const visible = seccionAvanzada.style.display === 'block';
    seccionAvanzada.style.display = visible ? 'none' : 'block';
    console.log(visible ? "🔽 Ocultando detalles" : "🔼 Mostrando detalles");
  });

  // Simulación búsqueda
  if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
      const nombre = document.getElementById('consulta-petName').value.trim();
      const resultado = document.getElementById('consulta-result');
      if (!nombre) {
        resultado.innerHTML = '<span style="color:red">⚠️ Escribe un nombre válido</span>';
        return;
      }
      resultado.innerHTML = `🔍 Buscando datos de <strong>${nombre}</strong>... <em>(en desarrollo)</em>`;
    });
  }

  // Guardado simulado
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {};
      formData.forEach((val, key) => data[key] = val);
      console.log("📤 Enviando consulta:", data);
      alert("✅ Consulta guardada (simulado)");
    });
  }
});
