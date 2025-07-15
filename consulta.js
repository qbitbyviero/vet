console.log("🩺 consulta.js activo2");

function activarConsultaAvanzada() {
  const toggleBtn = document.getElementById('toggle-avanzado');
  const seccionAvanzada = document.getElementById('seccion-avanzada');

  if (toggleBtn && seccionAvanzada) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = window.getComputedStyle(seccionAvanzada).display === 'none';
      seccionAvanzada.style.display = isHidden ? 'block' : 'none';

      if (isHidden) {
        console.log("🔼 Consulta detallada mostrada.");
        console.log("📋 Campos clínicos adicionales activados.");
      } else {
        console.log("🔽 Consulta detallada oculta.");
      }
    });

    console.log("✅ Consulta detallada conectada correctamente.");
  } else {
    console.warn("❌ No se encontró el botón o la sección avanzada. Reintentando...");
    // Reintentar después de un pequeño delay
    setTimeout(activarConsultaAvanzada, 300);
  }
}

// Iniciar la activación (sin esperar DOMContentLoaded porque es carga dinámica)
activarConsultaAvanzada();
