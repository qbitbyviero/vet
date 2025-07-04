// =======================
// main.js (VERSIÓN 100% FUNCIONAL)
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
  UI.card.classList.add('show-front');
  // 5. Función para mostrar formulario de cita (¡FALTABA ESTA FUNCIÓN!)
  function showAppointmentForm(date, time) {
    console.log('Mostrando formulario para:', date, time);
    const backPanel = document.querySelector('.back');
    backPanel.style.opacity = '0';
    
    setTimeout(() => {
      document.getElementById('calendar').style.display = 'none';
      renderAppointmentForm(date, time);
      UI.reservationForm.style.display = 'block';
      setTimeout(() => {
        UI.reservationForm.style.opacity = '1';
      }, 50);
    }, 300);
  }

  // 6. Renderizar formulario de cita
  async function renderAppointmentForm(date, time) {
    try {
      document.getElementById('form-date').value = date;
      document.getElementById('form-time').value = time;
      document.getElementById('new-pet').checked = false;
      document.getElementById('new-pet-fields').style.display = 'none';
      document.getElementById('owner-info').innerHTML = '';

      const petSelect = document.getElementById('mascota');
      petSelect.innerHTML = '<option value="">Cargando mascotas...</option>';
      petSelect.disabled = false;

      const clientes = await loadAllClients();
      petSelect.innerHTML = '<option value="">Seleccione una mascota</option>';
      
      clientes.forEach(cliente => {
        if (cliente['Nombre de la mascota']) {
          const option = document.createElement('option');
          option.value = cliente['Nombre de la mascota'];
          option.textContent = cliente['Nombre de la mascota'];
          petSelect.appendChild(option);
        }
      });

      setupFormEvents();
    } catch (error) {
      console.error('Error renderizando formulario:', error);
    }
  }

  // 7. Configurar eventos del formulario
  function setupFormEvents() {
    document.getElementById('cancel-form').addEventListener('click', resetToCalendar);
    
    document.getElementById('new-pet').addEventListener('change', function() {
      const newPetFields = document.getElementById('new-pet-fields');
      const petSelect = document.getElementById('mascota');
      
      if (this.checked) {
        newPetFields.style.display = 'block';
        petSelect.disabled = true;
        document.getElementById('owner-info').innerHTML = '';
      } else {
        newPetFields.style.display = 'none';
        petSelect.disabled = false;
      }
    });
    
    document.getElementById('mascota').addEventListener('change', async function() {
      const mascota = this.value;
      const ownerInfo = document.getElementById('owner-info');
      
      if (!mascota) {
        ownerInfo.innerHTML = '';
        return;
      }

      const clientes = await loadAllClients();
      const cliente = clientes.find(c => c['Nombre de la mascota'] === mascota);
      
      if (cliente) {
        ownerInfo.innerHTML = `
          <p><strong>Dueño:</strong> ${cliente['Nombre del propietario']}</p>
          <p><strong>Teléfono:</strong> ${cliente['Número de Teléfono']}</p>
          <p><strong>Correo:</strong> ${cliente.Correo}</p>
        `;
      }
    });
    
    document.getElementById('appointment-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const fecha = document.getElementById('form-date').value;
      const hora = document.getElementById('form-time').value;
      const isNewPet = document.getElementById('new-pet').checked;
      let clienteId, nombreMascota;

      try {
        if (isNewPet) {
          const propietario = document.getElementById('new-owner-name').value.trim();
          const telefono = document.getElementById('new-owner-phone').value.trim();
          nombreMascota = document.getElementById('new-pet-name').value.trim();

          if (!propietario || !telefono || !nombreMascota) {
            alert('Complete todos los campos obligatorios');
            return;
          }

          const params = new URLSearchParams();
          params.append('sheet', 'Clientes');
          params.append('nuevo', 'true');
          params.append('Nombre del propietario', propietario);
          params.append('Número de Teléfono', telefono);
          params.append('Nombre de la mascota', nombreMascota);

          const response = await jsonpRequest(`${GAS_BASE_URL}?${params.toString()}`);
          if (!response.success) throw new Error(response.error);
          clienteId = response['ID fila'];
        } else {
          nombreMascota = document.getElementById('mascota').value;
          if (!nombreMascota) {
            alert('Seleccione una mascota');
            return;
          }

          const clientes = await loadAllClients();
          const cliente = clientes.find(c => c['Nombre de la mascota'] === nombreMascota);
          if (!cliente) throw new Error('Mascota no encontrada');
          clienteId = cliente['ID fila'] || cliente['ID cliente'];
        }

        const motivo = prompt(`Motivo de la cita para ${nombreMascota}:`);
        if (!motivo) return;

        const params = new URLSearchParams();
        params.append('sheet', 'Citas');
        params.append('nuevo', 'true');
        params.append('Fecha', fecha);
        params.append('Hora', hora);
        params.append('ID cliente', clienteId);
        params.append('Nombre de la mascota', nombreMascota);
        params.append('Motivo', motivo);

        const response = await jsonpRequest(`${GAS_BASE_URL}?${params.toString()}`);
        if (!response.success) throw new Error(response.error);

        alert('¡Cita agendada con éxito!');
        resetToCalendar();

      } catch (error) {
        console.error('Error al guardar cita:', error);
        alert(`Error: ${error.message}`);
      }
    });
  }

  // 8. Activar clicks en fechas
  function activateDateClicks() {
  console.log('✅ Activando clics en días');
  const daysContainer = document.getElementById('days');

  daysContainer.querySelectorAll('div[data-date]').forEach(day => {
    day.onclick = null; // limpiamos posibles duplicados
    day.addEventListener('click', function () {
      const selectedDate = this.dataset.date;
      console.log('🟢 Día clicado:', selectedDate);
      document.getElementById('slot-date').textContent = selectedDate;
      showTimeSlots(selectedDate);
    });
  });
}
  // 9. Mostrar horarios
function showTimeSlots(date) {
  console.log('🟢 Día clicado:', date);

  // 🔄 Reinicia visibilidad para forzar redibujo
  UI.card.classList.remove('show-front', 'show-back');

  // 🔁 Reaplica visibilidad con delay
  setTimeout(() => {
    UI.card.classList.add('show-back');
    UI.slotList.innerHTML = ''; // Limpieza visual
    UI.reservationForm.style.display = 'none';
    document.querySelector('.back').style.opacity = '1';
    loadTimeSlots(date);
  }, 50);
}

  // 10. Cargar horarios
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

  // 11. Resetear vista
  function resetToCalendar() {
  console.log('Reseteando vista...');

  UI.reservationForm.style.opacity = '0';

  setTimeout(() => {
    UI.reservationForm.style.display = 'none';
    document.getElementById('calendar').style.display = 'block';

    UI.card.classList.remove('show-back');
    UI.card.classList.add('show-front');

    __allCitasCache = null;
    __appointmentsCount = {};
    renderCalendar();
  }, 300);
}

  // 12. Renderizar calendario
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
        setTimeout(() => {
      activateDateClicks();
    }, 100);

  } catch (error) {
    console.error('Error renderizando calendario:', error);
  }
}
  // Iniciar
  renderCalendar();
});
//12 modales
document.querySelectorAll('a[data-module]').forEach(link => {
  link.addEventListener('click', async e => {
    e.preventDefault();
    const file = link.getAttribute('data-module');
    const modalContainer = document.getElementById('modal-container');
    const modalHTML = document.getElementById('modal-html');

    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error("Error al cargar el módulo");
      const html = await response.text();
      modalHTML.innerHTML = html;
      modalContainer.style.display = 'flex';
    } catch (err) {
      modalHTML.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
      modalContainer.style.display = 'flex';
    }
  });
});

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-container').style.display = 'none';
  document.getElementById('modal-html').innerHTML = '';
});
//modal Clientes scripts unicos
  function cerrarModalClientes(e) {
    if (!e || e.target.classList.contains('modal-clientes-overlay')) {
      document.querySelector('.modal-clientes-overlay')?.remove();
    }
  }

  const mapaImagen = {
    perro: 'svg/perro.png',
    gato: 'svg/felino.svg',
    ave: 'svg/ave.png',
    tortuga: 'svg/tortuga.svg',
    serpiente: 'svg/serpiente.svg',
    lagarto: 'svg/lagarto.png',
    pez: 'svg/pez.svg',
    roedor: 'svg/roedor.svg'
  };

  const img = document.getElementById('diagrama-img');
  const cont = document.getElementById('cliente-diagrama');

  function cargarDiagramaCliente() {
    const especie = document.getElementById('pet-species').value;
    const src = mapaImagen[especie] || '';
    img.src = src;
    clearHotspots();
    if (src) {
      img.onload = () => { cont.style.minHeight = img.offsetHeight + 'px'; };
      cont.addEventListener('click', addHotspot);
    } else {
      cont.removeEventListener('click', addHotspot);
    }
  }

  function addHotspot(e) {
    const rect = cont.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dot = document.createElement('div');
    dot.className = 'hotspot';
    dot.style.left = (x - 10) + 'px';
    dot.style.top = (y - 10) + 'px';
    cont.appendChild(dot);
  }

  function clearHotspots() {
    cont.querySelectorAll('.hotspot').forEach(h => h.remove());
  }

  let mascotasGlobal = [];

  async function seleccionarClienteDesdeLista() {
    const valor = document.getElementById("searchPet").value;
    if (!valor) return;
    if (mascotasGlobal.length === 0) mascotasGlobal = await window.loadAllClients();
    const cliente = mascotasGlobal.find(c => c["Nombre de la mascota"] === valor);
    if (cliente) llenarFormularioCliente(cliente);
  }

  function llenarFormularioCliente(result) {
    document.getElementById("ownerName").value  = result["Nombre del propietario"] || "";
    document.getElementById("ownerPhone").value = result["Número de Teléfono"] || "";
    document.getElementById("ownerEmail").value = result["Correo"] || "";
    document.getElementById("petName").value    = result["Nombre de la mascota"] || "";
    document.getElementById("pet-species").value= result["Especie"] || "";
    document.getElementById("breed").value      = result["Raza"] || "";
    document.getElementById("age").value        = result["Edad"] || "";
    document.getElementById("weight").value     = result["Peso"] || "";

    const est = (result["Esterilizado"] || "").toLowerCase();
    if (est === "sí" || est === "si") {
      document.querySelector('input[name="sterilized"][value="si"]').checked = true;
    } else if (est === "no") {
      document.querySelector('input[name="sterilized"][value="no"]').checked = true;
    }

    cargarDiagramaCliente();
    const btn = document.getElementById("btnGuardarCliente");
    btn.disabled = true;
    btn.textContent = "Cliente ya registrado";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (typeof window.loadAllClients === "function") {
      mascotasGlobal = await window.loadAllClients();
      const select = document.getElementById("searchPet");
      mascotasGlobal.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c["Nombre de la mascota"];
        opt.textContent = c["Nombre de la mascota"];
        select.appendChild(opt);
      });
    }
  });
function abrirModalClientes() {
  fetch("clientes.html")
    .then(res => res.text())
    .then(html => {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      document.body.appendChild(temp);
    });
}
// Función universal para abrir cualquier módulo como modal
document.addEventListener("click", async function (e) {
  const link = e.target.closest("a[data-module]");
  if (!link) return;

  e.preventDefault();
  const archivo = link.getAttribute("data-module");

  try {
    const res = await fetch(archivo);
    const html = await res.text();

    const contenedor = document.createElement("div");
    contenedor.innerHTML = html;
    document.body.appendChild(contenedor);
  } catch (err) {
    console.error("❌ Error al cargar el módulo:", archivo, err);
  }
});
// =======================
// FUNCIÓN REUTILIZABLE PARA MODALES
// =======================
async function cargarMascotasEnModal(selectId, placeholder = "Selecciona mascota") {
  try {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}...</option>`;
    
    const clientes = await loadAllClients(); // Usa tu función existente
    const mascotasUnicas = [];
    
    // Evita duplicados y filtra mascotas con nombre
    clientes.forEach(cliente => {
      if (cliente['Nombre de la mascota'] && !mascotasUnicas.some(m => m.nombre === cliente['Nombre de la mascota'])) {
        mascotasUnicas.push({
          nombre: cliente['Nombre de la mascota'],
          propietario: cliente['Nombre del propietario'],
          id: cliente['ID fila'] || cliente['ID cliente']
        });
      }
    });

    // Llena el select
    mascotasUnicas.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = `${m.nombre} (${m.propietario})`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error("Error cargando mascotas para modal:", error);
    select.innerHTML = `<option value="">Error al cargar</option>`;
  }
}
