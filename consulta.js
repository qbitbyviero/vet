// consulta.js
console.log("🩺 consulta.js activo");

export function activarEventosConsulta() {
  const toggleBtn = document.getElementById('toggle-avanzado');
  const seccionAvanzada = document.getElementById('seccion-avanzada');

  if (!toggleBtn || !seccionAvanzada) {
    console.warn("❌ No se encontró el botón de consulta detallada o la sección avanzada.");
    return;
  }

  toggleBtn.addEventListener('click', () => {
    const visible = seccionAvanzada.style.display === 'block';
    seccionAvanzada.style.display = visible ? 'none' : 'block';
    console.log(visible ? "🔽 Ocultando consulta detallada" : "🔼 Mostrando consulta detallada");
  });

  console.log("✅ Consulta detallada conectada correctamente.");
}

// Puedes extender este archivo con más funciones si lo deseas
document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('toggle-avanzado');
  const seccionAvanzada = document.getElementById('seccion-avanzada');
  if (toggleBtn && seccionAvanzada) {
    toggleBtn.addEventListener('click', () => {
      seccionAvanzada.style.display = seccionAvanzada.style.display === 'none' ? 'block' : 'none';
    });
    console.log('✅ Consulta detallada conectada correctamente.');
  } else {
    console.warn('❌ No se encontró el botón o sección avanzada.');
  }
});

