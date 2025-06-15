// =======================
// main.js (VERSIÓN FINAL CON CORRECCIÓN DE BUGS)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Configuración inicial
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzb-UdlFaau_szrGZkksMaAwbufH5fIduVkCRNGnKCszSJrMJnf9LqIOhfcZtYcEG2brA/exec";
  let __clientsCache = null;
  let __allCitasCache = null;
  let __appointmentsCount = {};
  let currentDate = new Date();

  // [Las funciones jsonpRequest, normalizeDate, loadAllClients y loadAllCitas permanecen IGUALES...]

  // 2. Variables de interfaz
  const UI = {
    card: document.getElementById('card'),
    days: document.getElementById('days'),
    monthYear: document.getElementById('month-year'),
    reservationForm: document.getElementById('reservation-form'),
    slotList: document.getElementById('slot-list'),
    backButton: document.getElementById('back-to-calendar'),
    
    init() {
      this.backButton.className = 'button-86';
      document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
      });
      document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
      });
      this.backButton.addEventListener('click', resetToCalendar);
    }
  };

  UI.init();

  // 3. Función CRÍTICA CORREGIDA (activateDateClicks)
  function activateDateClicks() {
    const daysContainer = document.getElementById('days');
    // Limpiar eventos anteriores
    daysContainer.querySelectorAll('div[data-date]').forEach(day => {
      day.replaceWith(day.cloneNode(true));
    });
    
    // Agregar nuevos eventos
    daysContainer.querySelectorAll('div[data-date]').forEach(day => {
      day.addEventListener('click', function() {
        const selectedDate = this.dataset.date;
        console.log('Fecha seleccionada:', selectedDate);
        document.getElementById('slot-date').textContent = selectedDate;
        showTimeSlots(selectedDate);
      });
    });
  }

  // 4. Función showTimeSlots CORREGIDA
  function showTimeSlots(date) {
    console.log('Mostrando horarios para:', date);
    UI.card.classList.add('flipped1');
    setTimeout(() => {
      loadTimeSlots(date);
      // Asegurar que el panel de horarios sea visible
      document.querySelector('.back').style.opacity = '1';
    }, 400);
  }

  // [Las funciones loadTimeSlots, renderAppointmentForm y setupFormEvents permanecen IGUALES...]

  // 5. Función resetToCalendar CORREGIDA
  function resetToCalendar() {
    console.log('Reseteando vista...');
    
    // 1. Ocultar formulario
    UI.reservationForm.style.opacity = '0';
    setTimeout(() => {
      UI.reservationForm.style.display = 'none';
      
      // 2. Mostrar calendario principal
      document.getElementById('calendar').style.display = 'block';
      
      // 3. Resetear animación de la tarjeta
      UI.card.classList.remove('flipped1');
      UI.card.style.transform = 'rotateY(0deg)';
      document.querySelector('.back').style.opacity = '0';
      
      // 4. Forzar recarga limpia
      __allCitasCache = null;
      __appointmentsCount = {};
      
      // 5. Renderizar con nuevo estado
      renderCalendar(true); // <- El parámetro true indica que es un reset
    }, 300);
  }

  // 6. Función renderCalendar MODIFICADA
  async function renderCalendar(isReset = false) {
    console.log('Renderizando calendario...', isReset ? '(reset)' : '');
    try {
      // Solo resetear displays si es un reset completo
      if (isReset) {
        document.getElementById('calendar').style.display = 'block';
        UI.reservationForm.style.display = 'none';
      }

      await loadAllCitas();

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      UI.monthYear.textContent = currentDate.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric'
      });

      UI.days.innerHTML = '';
      const firstDay = new Date(year, month, 1).getDay() || 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Días vacíos
      for (let i = 1; i < firstDay; i++) {
        UI.days.appendChild(document.createElement('div'));
      }

      // Días del mes
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        dayEl.dataset.date = dateStr;

        const count = __appointmentsCount[dateStr] || 0;
        if (count > 0) {
          dayEl.setAttribute('data-count', count);
          dayEl.classList.add(count >= 4 ? 'full' : count === 3 ? 'medium' : 'low');
        }

        if (dateStr === new Date().toISOString().slice(0, 10)) {
          dayEl.classList.add('today');
        }

        UI.days.appendChild(dayEl);
      }

      // Activar clicks SOLO si es un reset
      if (isReset) {
        activateDateClicks();
      }
    } catch (error) {
      console.error('Error renderizando calendario:', error);
    }
  }

  // Iniciar
  renderCalendar(true);
});
