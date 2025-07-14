// consulta.js
console.log("🩺 consulta.js activo");

// Escuchar cuando el DOM ya esté listo
document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('toggle-avanzado');
  const seccionAvanzada = document.getElementById('seccion-avanzada');

  if (toggleBtn && seccionAvanzada) {
    toggleBtn.addEventListener('click', () => {
      const visible = seccionAvanzada.style.display === 'block';
      seccionAvanzada.style.display = visible ? 'none' : 'block';
      console.log(visible ? "🔽 Ocultando consulta detallada" : "🔼 Mostrando consulta detallada");
    });

    console.log('✅ Consulta detallada conectada correctamente.');
  } else {
    console.warn('❌ No se encontró el botón o sección avanzada.');
  }
});
