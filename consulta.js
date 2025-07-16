// consulta.js
console.log("🩺 consulta.js activo v5");

// ————————
// Nada de DOMContentLoaded: ejecutamos YA que el script se carga
// ————————

const btnToggle      = document.getElementById('toggle-avanzado');
const seccionAvanzada= document.getElementById('seccion-avanzada');
const tipoRadios     = document.querySelectorAll('input[name="consultaType"]');
const divExistente   = document.getElementById('consulta-existente');
const divNueva       = document.getElementById('consulta-nueva');

// 1) Alternar sección detallada
if (btnToggle && seccionAvanzada) {
  btnToggle.addEventListener('click', () => {
    const mostrar = seccionAvanzada.style.display === 'none';
    seccionAvanzada.style.display = mostrar ? 'block' : 'none';
    console.log(mostrar
      ? "🔼 Mostrando consulta detallada"
      : "🔽 Ocultando consulta detallada");
  });
}

// 2) Alternar entre existente / nueva
tipoRadios.forEach(radio => {
  radio.addEventListener('change', e => {
    const tipo = e.target.value;
    divExistente.style.display = (tipo === 'existente') ? 'block' : 'none';
    divNueva.style.display      = (tipo === 'nueva')     ? 'block' : 'none';
    console.log(tipo === 'nueva'
      ? "🆕 Activando nueva consulta"
      : "🔁 Activando búsqueda de mascota");
  });
});

// 3) Botón “Buscar”
const btnBuscar = document.getElementById('buscar-consulta');
if (btnBuscar) {
  btnBuscar.addEventListener('click', () => {
    const nombre = document.getElementById('consulta-petName').value.trim();
    const resultadoDiv = document.getElementById('consulta-result');
    if (!nombre) {
      resultadoDiv.innerHTML = '<span style="color:red">⚠️ Ingrese un nombre válido</span>';
      return;
    }
    resultadoDiv.innerHTML = `🔍 Buscando a <strong>${nombre}</strong>... <em>(en desarrollo)</em>`;
  });
}

// 4) Envío del formulario
const form = document.getElementById('form-consulta');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [ data[key] ];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    console.log("📤 Datos recopilados para envío:", data);
    alert("✅ Consulta guardada exitosamente (simulado)");
  });
}

console.log("✅ consulta.js inicializado correctamente.");
