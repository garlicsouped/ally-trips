/* ============================================================
   SHARED TRIP VIEW
   Loaded via a share link (?token=...). Shows an identity gate
   restricted to the companions already added to the trip, no
   self adding allowed. Once a name is picked, edits made in
   this session are tagged with that name for the audit trail.
   Owner only actions (edit trip details, mark completed,
   generate share link, add companion) are hidden here.
   ============================================================ */

const shareParams = new URLSearchParams(window.location.search);
const shareToken = shareParams.get('token');
let currentTrip = getTripByShareToken(shareToken);

if (!currentTrip) {
  document.body.innerHTML = '<div class="container"><p>This share link is not valid or the trip no longer exists.</p></div>';
  throw new Error('Trip not found for token');
}

let currentEditor = null;

function persistTrip() {
  saveTrip(currentTrip);
}

function weatherIcon(iconKey) {
  const map = { sun: 'sun.png', cloud: 'cloud.png', rain: 'rain.png' };
  return `assets/icons/${map[iconKey] || 'sun.png'}`;
}

function formatTime(dateTimeStr) {
  return new Date(dateTimeStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLong(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
}

/* ---------------- IDENTITY GATE ---------------- */
function initIdentityGate() {
  document.getElementById('identityTripName').textContent = `WHO ARE YOU, ${currentTrip.name.toUpperCase()}?`;

  const list = document.getElementById('identityList');
  const options = [
    { name: 'Ally', avatarType: 'sprite', avatarValue: 'companion_ally.png' },
    ...(currentTrip.companions || [])
  ];

  list.innerHTML = options.map(o => `
    <div class="identity-option" data-name="${o.name}">
      ${companionAvatarHTML(o, 'identity-avatar')}
      <span>${o.name}</span>
    </div>
  `).join('');

  list.querySelectorAll('.identity-option').forEach(opt => {
    opt.addEventListener('click', () => {
      currentEditor = opt.dataset.name;
      setActiveEditorForTrip(currentTrip.id, currentEditor);
      document.getElementById('identityGate').style.display = 'none';
      showToast(`Welcome, ${currentEditor}! Your edits will be tagged with your name.`);
      renderAll();
    });
  });
}

/* ---------------- HERO (read only progress, no owner actions) ---------------- */
function renderHero() {
  const hero = document.getElementById('tripHero');
  document.getElementById('tripSubtitle').textContent = currentTrip.name + ' (shared)';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(currentTrip.startDate);
  const planningWindowDays = 90;
  const windowStart = new Date(start);
  windowStart.setDate(windowStart.getDate() - planningWindowDays);

  let percent = ((today - windowStart) / (start - windowStart)) * 100;
  percent = Math.max(0, Math.min(100, percent));

  const dUntil = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
  let label = dUntil > 0 ? `${dUntil} day${dUntil === 1 ? '' : 's'} until takeoff!` : 'Trip in progress or completed';

  const companions = currentTrip.companions || [];
  const companionChips = companions.map(c => `
    <div class="companion-chip">
      ${companionAvatarHTML(c, 'companion-chip-avatar')}
      <span>${c.name}</span>
    </div>
  `).join('');

  hero.innerHTML = `
    <div class="trip-hero-top">
      <div>
        <h2><span class="emoji-inline lg">${currentTrip.coverEmoji}</span> ${currentTrip.name.toUpperCase()}</h2>
        <div class="meta"><span class="emoji-inline sm">📍</span> ${currentTrip.destination} &nbsp;|&nbsp; ${formatDateRangeFull(currentTrip.startDate, currentTrip.endDate)}</div>
        <div class="meta">You are editing as <strong>${currentEditor}</strong></div>
      </div>
    </div>
    <div class="companions-strip">
      <div class="companion-chip">
        <img src="assets/sprites/companion_ally.png" class="companion-chip-avatar" alt="Ally">
        <span>Ally</span>
      </div>
      ${companionChips}
    </div>
    <div class="progress-journey">
      <div class="progress-bar-row">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${percent}%;"></div>
          <span class="progress-bar-plane emoji-inline" style="left: ${percent}%;">✈️</span>
        </div>
        <span class="progress-bar-flag emoji-inline">🏁</span>
      </div>
      <div class="progress-bar-footer">
        <div class="progress-percent">${Math.round(percent)}% THERE</div>
        <div class="progress-label">${label}</div>
      </div>
    </div>
  `;
}

/* ---------------- COMPANIONS (read only) ---------------- */
function renderCompanions() {
  const list = document.getElementById('companionList');
  list.innerHTML = '';
  const ownerCard = document.createElement('div');
  ownerCard.className = 'companion-card';
  ownerCard.innerHTML = `
    <img src="assets/sprites/companion_ally.png" alt="Ally">
    <div><div class="companion-name">Ally</div><div class="companion-role">Trip owner</div></div>
  `;
  list.appendChild(ownerCard);

  (currentTrip.companions || []).forEach(c => {
    const card = document.createElement('div');
    card.className = 'companion-card';
    card.innerHTML = `
      ${companionAvatarHTML(c, 'companion-card-avatar')}
      <div><div class="companion-name">${c.name}</div><div class="companion-role">Companion</div></div>
    `;
    list.appendChild(card);
  });
}

/* ---------------- FLIGHTS ---------------- */
function renderFlights() {
  const list = document.getElementById('flightList');
  list.innerHTML = '';
  if (!currentTrip.flights || currentTrip.flights.length === 0) {
    list.innerHTML = '<p>No flights added yet.</p>';
    return;
  }
  currentTrip.flights.forEach(f => {
    const card = document.createElement('div');
    card.className = `flight-card ${f.done ? 'done' : ''}`;
    const photoHTML = f.photo ? `<img src="${f.photo}" class="item-photo-thumb" alt="attachment" data-flight-photo="${f.id}">` : '';
    card.innerHTML = `
      <img src="assets/icons/airplane.png" class="flight-icon" alt="flight">
      <div class="flight-info">
        <div class="flight-route">${f.from} &rarr; ${f.to}</div>
        <div class="flight-detail-row">${f.airline} ${f.flightNumber}</div>
        <div class="flight-detail-row">Depart ${formatTime(f.departTime)}</div>
        <div class="flight-detail-row">Arrive ${formatTime(f.arriveTime)}</div>
        <div class="flight-detail-row">Confirmation: ${f.confirmation}</div>
        ${photoHTML}
        <div class="flight-last-edited">Last edited by ${f.lastEditedBy || 'Ally'}</div>
        <button class="item-edit-btn" data-edit-flight="${f.id}">✏️ EDIT</button>
        <button class="item-edit-btn" data-remove-flight="${f.id}">🗑️ REMOVE</button>
      </div>
      <img src="assets/icons/checkmark.png" class="item-check ${f.done ? 'done' : ''}" alt="done" data-flight-id="${f.id}">
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('.item-check').forEach(check => {
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      const fid = check.dataset.flightId;
      const flight = currentTrip.flights.find(fl => fl.id === fid);
      flight.done = !flight.done;
      flight.lastEditedBy = currentEditor;
      persistTrip();
      flight.done ? sfxCheck() : sfxUncheck();
      renderFlights();
    });
  });

  list.querySelectorAll('[data-edit-flight]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fid = btn.dataset.editFlight;
      const flight = currentTrip.flights.find(fl => fl.id === fid);
      if (flight) openFlightModal(flight);
    });
  });

  list.querySelectorAll('[data-remove-flight]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fid = btn.dataset.removeFlight;
      currentTrip.flights = currentTrip.flights.filter(fl => fl.id !== fid);
      persistTrip();
      showToast('Flight removed');
      renderFlights();
    });
  });

  list.querySelectorAll('[data-flight-photo]').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(img.src);
    });
  });
}

let editingFlightId = null;
let pendingFlightPhotoDataUrl = null;

function openFlightModal(existingFlight) {
  editingFlightId = existingFlight ? existingFlight.id : null;
  document.getElementById('flightModal').querySelector('h3').textContent = existingFlight ? 'EDIT FLIGHT' : 'ADD FLIGHT';
  document.getElementById('flightAirline').value = existingFlight ? existingFlight.airline : '';
  document.getElementById('flightNumber').value = existingFlight ? existingFlight.flightNumber : '';
  document.getElementById('flightFrom').value = existingFlight ? existingFlight.from : '';
  document.getElementById('flightTo').value = existingFlight ? existingFlight.to : '';
  document.getElementById('flightDepart').value = existingFlight ? existingFlight.departTime : '';
  document.getElementById('flightArrive').value = existingFlight ? existingFlight.arriveTime : '';
  document.getElementById('flightConfirmation').value = existingFlight ? existingFlight.confirmation : '';
  document.getElementById('flightPhotoInput').value = '';
  pendingFlightPhotoDataUrl = existingFlight ? (existingFlight.photo || null) : null;
  document.getElementById('flightPhotoPreview').innerHTML = pendingFlightPhotoDataUrl
    ? `<img src="${pendingFlightPhotoDataUrl}" style="width:80px;height:80px;object-fit:cover;border:2px solid var(--ink);margin-top:10px;">`
    : '';
  document.getElementById('flightModal').classList.add('show');
}

document.getElementById('addFlightBtn').addEventListener('click', () => openFlightModal(null));

document.getElementById('flightPhotoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingFlightPhotoDataUrl = ev.target.result;
    document.getElementById('flightPhotoPreview').innerHTML = `<img src="${pendingFlightPhotoDataUrl}" style="width:80px;height:80px;object-fit:cover;border:2px solid var(--ink);margin-top:10px;">`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('cancelFlightBtn').addEventListener('click', () => {
  document.getElementById('flightModal').classList.remove('show');
});

document.getElementById('saveFlightBtn').addEventListener('click', () => {
  const airline = document.getElementById('flightAirline').value.trim();
  const flightNumber = document.getElementById('flightNumber').value.trim();
  const from = document.getElementById('flightFrom').value.trim();
  const to = document.getElementById('flightTo').value.trim();
  const depart = document.getElementById('flightDepart').value;
  const arrive = document.getElementById('flightArrive').value;
  const confirmation = document.getElementById('flightConfirmation').value.trim();

  if (!airline || !from || !to || !depart || !arrive) {
    showToast('Please fill in the required flight details');
    sfxError();
    return;
  }

  if (!currentTrip.flights) currentTrip.flights = [];

  if (editingFlightId) {
    const flight = currentTrip.flights.find(fl => fl.id === editingFlightId);
    flight.airline = airline;
    flight.flightNumber = flightNumber;
    flight.from = from;
    flight.to = to;
    flight.departTime = depart;
    flight.arriveTime = arrive;
    flight.confirmation = confirmation;
    flight.photo = pendingFlightPhotoDataUrl || null;
    flight.lastEditedBy = currentEditor;
    showToast('Flight updated');
  } else {
    currentTrip.flights.push({
      id: 'flight-' + Date.now(), airline, flightNumber, from, to,
      departTime: depart, arriveTime: arrive, confirmation,
      done: false, lastEditedBy: currentEditor,
      photo: pendingFlightPhotoDataUrl || null
    });
    showToast('Flight added');
  }

  persistTrip();
  document.getElementById('flightModal').classList.remove('show');
  renderFlights();
});

/* ---------------- ITINERARY ---------------- */
let activeDayForModal = null;

function renderDays() {
  const dayList = document.getElementById('dayList');
  dayList.innerHTML = '';
  if (!currentTrip.days || currentTrip.days.length === 0) {
    dayList.innerHTML = '<p>No itinerary days yet.</p>';
    return;
  }

  currentTrip.days.forEach((day, dayIndex) => {
    const block = document.createElement('div');
    block.className = 'day-block';
    if (dayIndex === 0) block.classList.add('open');

    const doneCount = day.items.filter(i => i.done).length;
    const totalCount = day.items.length;

    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerHTML = `
      <div class="day-title">DAY ${dayIndex + 1} - ${formatDateLong(day.date).toUpperCase()}</div>
      <div class="weather-chip">
        <img src="${weatherIcon(day.weather.icon)}" alt="weather">
        <span>${day.weather.summary}, ${formatTemp(day.weather.tempLowC)}-${formatTemp(day.weather.tempHighC)}</span>
      </div>
      <div class="day-progress-chip">${doneCount} / ${totalCount} done</div>
      <span class="day-toggle-icon">&#9654;</span>
    `;
    header.addEventListener('click', () => block.classList.toggle('open'));

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'day-items';
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';

    day.items.slice().sort((a, b) => a.time.localeCompare(b.time)).forEach(item => {
      itemsContainer.appendChild(renderItem(item, dayIndex));
    });

    itemsWrap.appendChild(itemsContainer);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-item-btn';
    addBtn.textContent = '+ ADD ITEM TO THIS DAY';
    addBtn.addEventListener('click', (e) => { e.stopPropagation(); openItemModal(dayIndex); });
    itemsWrap.appendChild(addBtn);

    block.appendChild(header);
    block.appendChild(itemsWrap);
    dayList.appendChild(block);

    enableDragReorder(itemsContainer);
  });

  reloadTikTokEmbeds();
}

function renderItem(item, dayIndex) {
  const el = document.createElement('div');
  el.className = `itinerary-item ${item.flexibility} ${item.done ? 'done' : ''}`;
  el.draggable = true;
  el.dataset.itemId = item.id;

  const photoHTML = item.photo ? `<img src="${item.photo}" class="item-photo-thumb" alt="attachment">` : '';
  const linkHTML = item.link ? renderItemLinkHTML(item.link) : '';

  el.innerHTML = `
    <div class="time-chip">${item.time}</div>
    <div class="item-body">
      <div class="item-title">${item.title}<span class="flex-tag ${item.flexibility}">${item.flexibility === 'must' ? 'MUST DO' : 'NICE TO HAVE'}</span></div>
      <div class="item-location"><span class="emoji-inline sm">📍</span> ${item.location}</div>
      ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
      ${photoHTML}
      ${linkHTML}
      <div class="item-last-edited">Last edited by ${item.lastEditedBy || 'Ally'}</div>
      <div>
        <button class="item-edit-btn" data-edit-item="${item.id}">✏️ EDIT</button>
        <button class="item-edit-btn" data-remove-item="${item.id}">🗑️ REMOVE</button>
      </div>
    </div>
    <img src="assets/icons/checkmark.png" class="item-check ${item.done ? 'done' : ''}" alt="done">
  `;
  el.querySelector('.item-check').addEventListener('click', (e) => {
    e.stopPropagation();
    item.done = !item.done;
    item.lastEditedBy = currentEditor;
    persistTrip();
    item.done ? sfxCheck() : sfxUncheck();
    renderDays();
  });

  const editBtn = el.querySelector('[data-edit-item]');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openItemModal(dayIndex, item);
    });
  }

  const removeBtn = el.querySelector('[data-remove-item]');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentTrip.days[dayIndex].items = currentTrip.days[dayIndex].items.filter(i => i.id !== item.id);
      persistTrip();
      showToast('Item removed');
      renderDays();
    });
  }

  const thumb = el.querySelector('.item-photo-thumb');
  if (thumb) {
    thumb.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(item.photo);
    });
  }

  return el;
}

function enableDragReorder(container) {
  let draggedEl = null;
  container.addEventListener('dragstart', (e) => {
    if (!e.target.classList.contains('itinerary-item')) return;
    draggedEl = e.target;
    e.target.classList.add('dragging');
  });
  container.addEventListener('dragend', (e) => {
    if (!e.target.classList.contains('itinerary-item')) return;
    e.target.classList.remove('dragging');
    draggedEl = null;
  });
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterEl = getDragAfterElement(container, e.clientY);
    if (!draggedEl) return;
    if (afterEl == null) container.appendChild(draggedEl);
    else container.insertBefore(draggedEl, afterEl);
  });
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.itinerary-item:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity }).element;
}

let pendingItemPhotoDataUrl = null;
let editingItemId = null;

function openItemModal(dayIndex, existingItem) {
  activeDayForModal = dayIndex;
  editingItemId = existingItem ? existingItem.id : null;

  document.getElementById('itemModal').querySelector('h3').textContent = existingItem ? 'EDIT ITINERARY ITEM' : 'ADD ITINERARY ITEM';
  document.getElementById('itemTime').value = existingItem ? existingItem.time : '';
  document.getElementById('itemTitle').value = existingItem ? existingItem.title : '';
  document.getElementById('itemLocation').value = existingItem ? existingItem.location : '';
  document.getElementById('itemNotes').value = existingItem ? (existingItem.notes || '') : '';
  document.getElementById('itemFlex').value = existingItem ? existingItem.flexibility : 'must';
  document.getElementById('itemLinkInput').value = existingItem ? (existingItem.link || '') : '';
  document.getElementById('itemPhotoInput').value = '';
  pendingItemPhotoDataUrl = existingItem ? (existingItem.photo || null) : null;
  document.getElementById('itemPhotoPreview').innerHTML = pendingItemPhotoDataUrl
    ? `<img src="${pendingItemPhotoDataUrl}" style="width:80px;height:80px;object-fit:cover;border:2px solid var(--ink);margin-top:10px;">`
    : '';
  document.getElementById('itemModal').classList.add('show');
}

document.getElementById('itemPhotoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingItemPhotoDataUrl = ev.target.result;
    document.getElementById('itemPhotoPreview').innerHTML = `<img src="${pendingItemPhotoDataUrl}" style="width:80px;height:80px;object-fit:cover;border:2px solid var(--ink);margin-top:10px;">`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('cancelItemBtn').addEventListener('click', () => {
  document.getElementById('itemModal').classList.remove('show');
});

document.getElementById('saveItemBtn').addEventListener('click', () => {
  const time = document.getElementById('itemTime').value;
  const title = document.getElementById('itemTitle').value.trim();
  const location = document.getElementById('itemLocation').value.trim();
  const notes = document.getElementById('itemNotes').value.trim();
  const flex = document.getElementById('itemFlex').value;
  const link = document.getElementById('itemLinkInput').value.trim();

  if (!title) {
    showToast('Give it a title first');
    sfxError();
    return;
  }

  if (editingItemId) {
    const item = currentTrip.days[activeDayForModal].items.find(i => i.id === editingItemId);
    item.time = time || '00:00';
    item.title = title;
    item.location = location;
    item.notes = notes;
    item.flexibility = flex;
    item.link = link || null;
    item.photo = pendingItemPhotoDataUrl || null;
    item.lastEditedBy = currentEditor;
    showToast('Item updated');
  } else {
    currentTrip.days[activeDayForModal].items.push({
      id: 'new-' + Date.now(), time: time || '00:00', title, location, notes,
      flexibility: flex, done: false, lastEditedBy: currentEditor,
      photo: pendingItemPhotoDataUrl || null,
      link: link || null
    });
    showToast('Item added to the itinerary');
  }

  persistTrip();
  renderDays();
  document.getElementById('itemModal').classList.remove('show');
});

/* ---------------- FILES (read only) ---------------- */
function renderFiles() {
  const list = document.getElementById('fileList');
  list.innerHTML = '';
  if (!currentTrip.files || currentTrip.files.length === 0) {
    list.innerHTML = '<p>No reference files yet.</p>';
    return;
  }
  currentTrip.files.forEach(f => {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `📄 ${f.name}`;
    list.appendChild(row);
  });
}

/* ---------------- TABS ---------------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
  });
});

function renderAll() {
  renderHero();
  renderFlights();
  renderDays();
  renderCompanions();
  renderFiles();
}

/* ---------------- INIT ---------------- */
initIdentityGate();
