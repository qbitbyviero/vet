// =======================
// main.js (VERSIÓN DEFINITIVA)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Configuración inicial
  const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzb-UdlFaau_szrGZkksMaAwbufH5fIduVkCRNGnKCszSJrMJnf9LqIOhfcZtYcEG2brA/exec";
  let __clientsCache = null;
  let __allCitasCache = null;
  let __appointmentsCount = {};
  let currentDate = new Date();

  // 2. Funciones básicas
  function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `jsonp_${Date.now()}`;
      window[callbackName] = data => {
        delete window[callbackName];
        resolve(data);
      };
      const script = document.createElement('script');
      script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`;
      script.onerror = () => reject(new Error('Error JSONP'));
      document.body.appendChild(script);
    });
  }

  function normalizeDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr instanceof Date) return dateStr.toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return '';
  }

  // 3. Carga de datos
  async function loadAllClients() {
    if (__clientsCache) return __clientsCache;
    try {
      __clientsCache = await jsonpRequest(`${GAS_BASE_URL}?sheet=Clientes`);
      return __clientsCache;
    } catch (err) {
      console.error('Error cargando clientes:', err);
      return [];
    }
  }

  async function loadAllCitas() {
    if (__allCitasCache) return __allCitasCache;
    try {
      const data = await jsonpRequest(`${GAS_BASE_URL}?sheet=Citas`);
      __allCitasCache = data;
      __appointmentsCount = {};

      data.forEach(cita => {
        const fecha = normalizeDate(cita.Fecha);
        cita.Fecha = fecha;

        let hora = cita.Hora;
        if (hora instanceof Date) {
          hora = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
        } else {
          hora = String(hora).trim().slice(0, 5);
        }
        cita.Hora = hora;

        __appointmentsCount[fecha] = (__appointmentsCount[fecha] || 0) + 1;
      });

      return __allCitasCache;
    } catch (err) {
      console.error('Error cargando citas:', err);
      return [];
    }
  }

  // 4. Variables de interfaz
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

  // 5. Función crítica CORREGIDA
  function activateDateClicks() {
    const daysContainer = document.getElementById('days');
    
    // Solución definitiva para el problema de listeners
    const newDaysContainer = daysContainer.cloneNode(true);
    daysContainer.parentNode.replaceChild(newDaysContainer, daysContainer);
    
    newDaysContainer.querySelectorAll('div[data-date]').forEach(day => {
      day.addEventListener('click', function() {
        const selectedDate = this.dataset.date;
        console.log('Fecha seleccionada:', selectedDate);
        document.getElementById('slot-date').textContent = selectedDate;
        showTimeSlots(selectedDate);
      });
    });
  }

  // 6. Mostrar horarios
  function showTimeSlots(date) {
    console.log('Mostrando horarios para:', date);
    UI.card.classList.add('flipped1');
    setTimeout(() => {
      loadTimeSlots(date);
      document.querySelector('.back').style.opacity = '1';
    }, 400);
  }

  // 7. Cargar horarios
  async function loadTimeSlots(date) {
    try {
      UI.slotList.innerHTML = '';
      const allCitas = await loadAllCitas();
      const citasDelDia = allCitas.filter(c => c.Fecha === date);

      const citasPorHora = {};
      citasDelDia.forEach(cita => {
        let hora = String(cita.Hora).trim().slice(0, 5);
        if (hora.length === 4) hora = `0${hora}`;
        citasPorHora[hora] = {
          mascota: cita['Nombre de la mascota'] || '',
          motivo: cita.Motivo || ''
        };
      });

      for (let hour = 10; hour < 19; hour++) {
        ['00', '30'].forEach(min => {
          const time = `${String(hour).padStart(2, '0')}:${min}`;
          const slot = document.createElement('li');
          slot.className = 'slot-line';

          const timeSpan = document.createElement('span');
          timeSpan.className = 'slot-time';
          timeSpan.textContent = time;

          const detailSpan = document.createElement('span');
          detailSpan.className = 'slot-detail';

          if (citasPorHora[time]) {
            detailSpan.textContent = `${citasPorHora[time].mascota} → ${citasPorHora[time].motivo}`;
            slot.classList.add('ocupado');
          } else {
            detailSpan.textContent = 'Disponible';
            slot.addEventListener('click', () => showAppointmentForm(date, time));
          }

          slot.appendChild(timeSpan);
          slot.appendChild(detailSpan);
          UI.slotList.appendChild(slot);
        });
      }

      const emergencySlot = document.createElement('li');
      emergencySlot.textContent = '🚨 URGENCIAS';
      emergencySlot.className = 'urgencia';
      emergencySlot.addEventListener('click', () => showAppointmentForm(date, 'URGENCIAS'));
      UI.slotList.appendChild(emergencySlot);

    } catch (error) {
      console.error('Error cargando horarios:', error);
    }
  }

  // 8. Resetear vista CORREGIDO
  function resetToCalendar() {
    console.log('Reseteando vista...');
    
    // 1. Ocultar formulario
    UI.reservationForm.style.opacity = '0';
    setTimeout(() => {
      UI.reservationForm.style.display = 'none';
      
      // 2. Mostrar calendario
      document.getElementById('calendar').style.display = 'block';
      
      // 3. Resetear tarjeta completamente
      UI.card.classList.remove('flipped1');
      UI.card.style.transform = 'rotateY(0deg)';
      document.querySelector('.back').style.opacity = '0';
      
      // 4. Forzar recarga de datos
      __allCitasCache = null;
      __appointmentsCount = {};
      
      // 5. Renderizar con nuevo estado
      renderCalendar();
    }, 300);
  }

  // 9. Renderizar calendario
  async function renderCalendar() {
    console.log('Renderizando calendario...');
    try {
      document.getElementById('calendar').style.display = 'block';
      UI.reservationForm.style.display = 'none';
      UI.card.classList.remove('flipped1');

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

      for (let i = 1; i < firstDay; i++) {
        UI.days.appendChild(document.createElement('div'));
      }

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

      activateDateClicks();
    } catch (error) {
      console.error('Error renderizando calendario:', error);
    }
  }

  // Iniciar
  renderCalendar();
});
