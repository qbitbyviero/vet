// =======================
// main.js (JavaScript General)
// =======================

document.addEventListener('DOMContentLoaded', () => {

  /* =================================
     1) MODAL OVERLAY + CARGA DE MÓDULOS
     ================================= */
  const overlay = document.getElementById('modal-overlay');

  // Función para cerrar modal
  function closeModal() {
    overlay.classList.remove('visible');
    overlay.innerHTML = ''; // Limpiar contenido
  }

  // Abrir módulo al hacer clic en enlace de nav
  document.querySelectorAll('a[data-module]').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      const file = "/vet/" + el.dataset.module; // por ejemplo: "/vet/tienda.html"
      // Mostrar overlay y botón de cierre
      overlay.innerHTML = `
        <div class="modal-overlay-content">
          <button id="close-modal" aria-label="Cerrar módulo">×</button>
          <div class="loading-msg">Cargando...</div>
        </div>
      `;
      overlay.classList.add('visible');

      // Cerrar al hacer clic en fondo oscuro
      overlay.addEventListener('click', ev => {
        if (ev.target === overlay) closeModal();
      });

      // Cerrar al hacer clic en "×"
      overlay.querySelector('#close-modal').addEventListener('click', closeModal);

      try {
        const html = await fetch(file).then(r => r.text());
        const container = overlay.querySelector('.modal-overlay-content');
        // Reemplazar “Cargando...” por contenido del módulo
        container.innerHTML = `<button id="close-modal" aria-label="Cerrar módulo">×</button>`;
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        // Extraer y volver a agregar scripts
        const scripts = tpl.content.querySelectorAll('script');
        const fragment = tpl.content.cloneNode(true);
        fragment.querySelectorAll('script').forEach(s => s.remove());
        const contentDiv = document.createElement('div');
        contentDiv.appendChild(fragment);
        container.appendChild(contentDiv);
        // Agregar scripts al final para que se ejecuten
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          if (oldScript.src) {
            newScript.src = oldScript.src;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          container.appendChild(newScript);
        });
      } catch (err) {
        const container = overlay.querySelector('.modal-overlay-content');
        container.innerHTML = `
          <button id="close-modal" aria-label="Cerrar módulo">×</button>
          <p style="padding:1em;color:#b71c1c;">Error al cargar el módulo.</p>
        `;
        container.querySelector('#close-modal').addEventListener('click', closeModal);
      }
    });
  });

  /* ===================================
     2) LÓGICA DEL CALENDARIO + ANIMACIONES
     =================================== */
  let currentDate = new Date();
  const card = document.getElementById('card');
  const daysEl = document.getElementById('days');
  const monthYearEl = document.getElementById('month-year');
  const reservationFormDiv = document.getElementById('reservation-form');
  const formDate = document.getElementById('form-date');
  const formTime = document.getElementById('form-time');
  const petSelect = document.getElementById('mascota');
  const newChk = document.getElementById('new-pet');
  const newPetFields = document.getElementById('new-pet-fields');
  const backToCalendarBtn = document.getElementById('back-to-calendar');
  const slotListEl = document.getElementById('slot-list');

  // Renderiza el calendario del mes actual
  function renderCalendar() {
    // Mostrar panel calendario y ocultar formulario de reserva
    document.getElementById('calendar').style.display = 'block';
    reservationFormDiv.style.display = 'none';
    // Obtiene año y mes
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    monthYearEl.textContent = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    daysEl.innerHTML = '';
    // Calcula primer día de la semana (Lun=1 ... Dom=7)
    const firstDayIndex = (new Date(y, m, 1).getDay() || 7);
    const totalDays = new Date(y, m + 1, 0).getDate();
    // Celdas vacías hasta el primer día
    for (let i = 1; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      daysEl.appendChild(emptyCell);
    }
    // Rellenar días del mes
    for (let d = 1; d <= totalDays; d++) {
      const dayCell = document.createElement('div');
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dayCell.textContent = d;
      dayCell.dataset.date = dateStr;
      // Si es día actual, agregar clase “today”
      if (dateStr === new Date().toISOString().slice(0, 10)) {
        dayCell.classList.add('today');
      }
      daysEl.appendChild(dayCell);
    }
    activateDateClicks();
  }

  // Habilita clic en cada día
  function activateDateClicks() {
    document.querySelectorAll('#days div[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        const selectedDate = el.dataset.date;
        document.getElementById('slot-date').textContent = selectedDate;
        flipToSlots(selectedDate);
      });
    });
  }

  // Animación: voltear calendario y mostrar lista de horarios
  function flipToSlots(date) {
    // Aplica la clase “flipped1” para rotar la card
    card.classList.add('flipped1');
    // Cargar horarios luego de la animación
    setTimeout(() => loadSlots(date), 400);
  }

  // Cargar slots de 10:00 a 18:30 + URGENCIAS
  function loadSlots(date) {
    slotListEl.innerHTML = '';
    for (let h = 10; h < 19; h++) {
      ['00', '30'].forEach(min => {
        const time = `${String(h).padStart(2, '0')}:${min}`;
        const li = document.createElement('li');
        li.textContent = time;
        li.addEventListener('click', () => selectSlot(date, time));
        slotListEl.appendChild(li);
      });
    }
    const urg = document.createElement('li');
    urg.textContent = '🚨 URGENCIAS';
    urg.addEventListener('click', () => selectSlot(date, 'URGENCIAS'));
    slotListEl.appendChild(urg);
  }

  // Regresa del “back” al calendario normal
  backToCalendarBtn.addEventListener('click', () => {
    card.classList.remove('flipped1');
    renderCalendar();
  });

  // Al seleccionar un slot, animar hacia el formulario
  function selectSlot(date, time) {
    // Pequeña animación de opacidad antes de mostrar el formulario
    const backPanel = document.querySelector('.back');
    backPanel.style.transition = 'opacity 0.3s ease';
    backPanel.style.opacity = '0';
    setTimeout(() => {
      // Ocultar calendario/slots
      document.getElementById('calendar').style.display = 'none';
      // Preparar y mostrar formulario
      renderForm(date, time);
      reservationFormDiv.style.opacity = '0';
      reservationFormDiv.style.display = 'block';
      // Animar aparición del formulario
      setTimeout(() => {
        reservationFormDiv.style.transition = 'opacity 0.4s ease';
        reservationFormDiv.style.opacity = '1';
      }, 50);
      // Resetear opacidad panel de slots
      backPanel.style.opacity = '1';
    }, 300);
  }

  // Renderizar formulario con fecha, hora y lista de mascotas
  function renderForm(date, time) {
    formDate.value = date;
    formTime.value = time;
    // Simulación de mascotas existentes
    petSelect.innerHTML = `
      <option>Firulais</option>
      <option>Pelusa</option>
      <option>Rex</option>
    `;
    // Reset campos nueva mascota
    newChk.checked = false;
    newPetFields.style.display = 'none';
    document.getElementById('new-pet-name').value = '';
    document.getElementById('new-pet-species').value = '';
    // Desplazar hacia el formulario
    reservationFormDiv.scrollIntoView({ behavior: 'smooth' });
  }

  // Toggle campos “nueva mascota”
  newChk.addEventListener('change', () => {
    if (newChk.checked) {
      newPetFields.style.display = 'block';
      petSelect.disabled = true;
    } else {
      newPetFields.style.display = 'none';
      petSelect.disabled = false;
    }
  });

  // Cancelar formulario y regresar al calendario
  document.getElementById('cancel-form').addEventListener('click', () => {
    reservationFormDiv.style.display = 'none';
    renderCalendar();
  });

  // Manejo de envío de formulario
  document.getElementById('appointment-form').addEventListener('submit', e => {
    e.preventDefault();
    alert(`Cita guardada:\nFecha: ${formDate.value}\nHora: ${formTime.value}\n${newChk.checked ? `Nueva mascota: ${document.getElementById('new-pet-name').value}` : `Mascota existente: ${petSelect.value}`}`);
    reservationFormDiv.style.display = 'none';
    renderCalendar();
  });

  // Navegar meses
  document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Render inicial del calendario
  renderCalendar();
});
