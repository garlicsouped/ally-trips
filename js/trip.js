/* ============================================================
   TRIP DETAIL LOGIC
   Renders hero (with edit, mark complete, share, progress
   tracker), companions, flights (with done checklist and edit/
   remove), day by day itinerary (auto-populated from the trip's
   dates, plus add day, collapsible, drag to reorder, checkmark,
   progress count, edit/remove items with photo and link
   attachments) and files. All reads/writes go through data.js,
   which is Supabase backed, and edits are tagged with the
   current editor name (Ally, or a companion via share link).

   Everything below runs inside an async wrapper that waits for
   initDataLayer() to finish loading trips from Supabase before
   any of this code touches currentTrip, since that data no
   longer arrives synchronously like it did with localStorage.
   ============================================================ */

(async function () {
  await initDataLayer();

  const ALL_SPRITES = [
    { key: 'companion_natashia.png', label: 'Natashia style' },
    { key: 'companion_amos.png', label: 'Amos style' },
    { key: 'companion_jia.png', label: 'Jia style' },
    { key: 'companion_ryan.png', label: 'Ryan style' },
    { key: 'companion_priya.png', label: 'Priya style' },
    { key: 'companion_marcus.png', label: 'Marcus style' }
  ];

  const params = new URLSearchParams(window.location.search);
  const tripId = params.get('id');
  let currentTrip = getTripById(tripId);

  if (!currentTrip) {
    document.body.innerHTML = '<div class="container"><p>Trip not found. <a href="index.html">Go back</a></p></div>';
    return;
  }

  const currentEditor = getActiveEditorForTrip(tripId);

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

  /* ---------------- HERO ---------------- */
  function renderHero() {
    const hero = document.getElementById('tripHero');
    document.getElementById('tripSubtitle').textContent = currentTrip.name;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(currentTrip.startDate);
    const planningWindowDays = 90;
    const windowStart = new Date(start);
    windowStart.setDate(windowStart.getDate() - planningWindowDays);

    let percent = ((today - windowStart) / (start - windowStart)) * 100;
    percent = Math.max(0, Math.min(100, percent));

    const dUntil = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    let label = dUntil > 0 ? `${dUntil} day${dUntil === 1 ? '' : 's'} until takeoff!` : (currentTrip.archived ? 'Trip completed' : 'Trip in progress');

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
        </div>
        <div class="hero-actions">
          <button class="btn" id="editTripBtn"><span class="emoji-inline sm">✏️</span> EDIT TRIP</button>
          <button class="btn" id="shareTripBtn"><span class="emoji-inline sm">🔗</span> SHARE TRIP</button>
          ${!currentTrip.archived ? '<button class="btn primary" id="markCompleteBtn"><span class="emoji-inline sm">🏁</span> MARK TRIP AS COMPLETED</button>' : '<span class="status-tag past" style="position:static;">COMPLETED</span>'}
        </div>
      </div>

      <div class="companions-strip">
        <div class="companion-chip">
          <img src="assets/sprites/companion_ally.png" class="companion-chip-avatar" alt="Ally">
          <span>Ally (You)</span>
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

    const editBtn = document.getElementById('editTripBtn');
    if (editBtn) editBtn.addEventListener('click', openEditTripModal);

    const shareBtn = document.getElementById('shareTripBtn');
    if (shareBtn) shareBtn.addEventListener('click', openShareModal);

    const completeBtn = document.getElementById('markCompleteBtn');
    if (completeBtn) completeBtn.addEventListener('click', markTripCompleted);
  }

  function markTripCompleted() {
    currentTrip.archived = true;
    persistTrip();
    sfxSuccess();
    showToast('Trip marked as completed and moved to your archive');
    renderHero();
  }

  /* ---------------- EDIT TRIP ---------------- */
  function openEditTripModal() {
    document.getElementById('editTripName').value = currentTrip.name;
    document.getElementById('editTripDestination').value = currentTrip.destination;
    document.getElementById('editTripStart').value = currentTrip.startDate;
    document.getElementById('editTripEnd').value = currentTrip.endDate;
    document.getElementById('editTripEmoji').value = currentTrip.coverEmoji;
    document.getElementById('editTripModal').classList.add('show');
  }

  document.getElementById('cancelEditTripBtn').addEventListener('click', () => {
    document.getElementById('editTripModal').classList.remove('show');
  });

  document.getElementById('saveEditTripBtn').addEventListener('click', () => {
    const name = document.getElementById('editTripName').value.trim();
    const destination = document.getElementById('editTripDestination').value.trim();
    const start = document.getElementById('editTripStart').value;
    const end = document.getElementById('editTripEnd').value;
    const emoji = document.getElementById('editTripEmoji').value.trim();

    if (!name || !destination || !start || !end) {
      showToast('Please fill in all fields');
      sfxError();
      return;
    }

    const datesChanged = (start !== currentTrip.startDate) || (end !== currentTrip.endDate);

    currentTrip.name = name;
    currentTrip.destination = destination;
    currentTrip.startDate = start;
    currentTrip.endDate = end;
    currentTrip.coverEmoji = emoji || currentTrip.coverEmoji;

    // Keep the itinerary in sync with the new date range: add any
    // newly covered dates as empty days, drop days that fall
    // outside the new range, but never delete a day that already
    // has items planned in it.
    let keptOutOfRangeDays = false;
    if (datesChanged) {
      syncItineraryDaysToDateRange(currentTrip, start, end);
      const desiredDates = getDateRangeArray(start, end);
      keptOutOfRangeDays = currentTrip.days.some(d => !desiredDates.includes(d.date));
    }

    persistTrip();

    document.getElementById('editTripModal').classList.remove('show');
    showToast(keptOutOfRangeDays
      ? 'Trip updated. Days outside the new range with existing plans were kept so nothing is lost.'
      : 'Trip details updated');
    renderHero();
    renderDays();
  });

  /* ---------------- SHARE TRIP ---------------- */
  function openShareModal() {
    const url = `${window.location.origin}${window.location.pathname.replace('trip.html', 'share.html')}?token=${currentTrip.shareToken}`;
    document.getElementById('shareLinkInput').value = url;
    document.getElementById('shareModal').classList.add('show');
  }

  document.getElementById('closeShareBtn').addEventListener('click', () => {
    document.getElementById('shareModal').classList.remove('show');
  });

  document.getElementById('copyShareLinkBtn').addEventListener('click', () => {
    const input = document.getElementById('shareLinkInput');
    input.select();
    document.execCommand('copy');
    showToast('Share link copied');
  });

  /* ---------------- COMPANIONS ---------------- */
  function renderCompanions() {
    const list = document.getElementById('companionList');
    list.innerHTML = '';

    const ownerCard = document.createElement('div');
    ownerCard.className = 'companion-card';
    ownerCard.innerHTML = `
      <img src="assets/sprites/companion_ally.png" alt="Ally">
      <div>
        <div class="companion-name">Ally (You)</div>
        <div class="companion-role">Trip owner</div>
      </div>
    `;
    list.appendChild(ownerCard);

    (currentTrip.companions || []).forEach(c => {
      const card = document.createElement('div');
      card.className = 'companion-card';
      card.innerHTML = `
        ${companionAvatarHTML(c, 'companion-card-avatar')}
        <div style="flex:1;">
          <div class="companion-name">${c.name}</div>
          <div class="companion-role">Companion, can edit via share link</div>
        </div>
        <button class="btn" data-edit-companion="${c.id}" style="padding:8px 10px;font-size:10px;">EDIT</button>
        <button class="btn danger" data-remove-companion="${c.id}" style="padding:8px 10px;font-size:10px;">REMOVE</button>
      `;
      list.appendChild(card);
    });

    list.querySelectorAll('[data-remove-companion]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.removeCompanion;
        const comp = currentTrip.companions.find(c => c.id === id);
        currentTrip.companions = currentTrip.companions.filter(c => c.id !== id);
        persistTrip();
        showToast(`${comp ? comp.name : 'Companion'} removed from this trip`);
        renderCompanions();
        renderHero();
      });
    });

    list.querySelectorAll('[data-edit-companion]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.editCompanion;
        const comp = currentTrip.companions.find(c => c.id === id);
        if (comp) openCompanionModal(comp);
      });
    });
  }

  let editingCompanionId = null;

  function setupAvatarTabs() {
    const tabs = document.querySelectorAll('#companionModal .avatar-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('#companionModal .avatar-tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('avatarPanel-' + tab.dataset.avatarTab).classList.add('active');
      });
    });
  }

  function openCompanionModal(existingCompanion) {
    editingCompanionId = existingCompanion ? existingCompanion.id : null;
    document.getElementById('companionModalTitle').textContent = existingCompanion ? 'EDIT COMPANION' : 'ADD COMPANION';
    document.getElementById('companionName').value = existingCompanion ? existingCompanion.name : '';
    document.getElementById('companionEmojiInput').value = (existingCompanion && existingCompanion.avatarType === 'emoji') ? existingCompanion.avatarValue : '';
    document.getElementById('companionPhotoPreview').innerHTML = '';
    pendingPhotoDataUrl = (existingCompanion && existingCompanion.avatarType === 'photo') ? existingCompanion.avatarValue : null;
    if (pendingPhotoDataUrl) {
      document.getElementById('companionPhotoPreview').innerHTML = `<img src="${pendingPhotoDataUrl}" style="width:70px;height:70px;border-radius:50%;border:2px solid var(--ink);object-fit:cover;margin-top:10px;">`;
    }

    const spriteWrap = document.getElementById('spriteChoices');
    spriteWrap.innerHTML = ALL_SPRITES.map(s => `
      <div class="identity-option sprite-choice" data-sprite="${s.key}">
        <img src="assets/sprites/${s.key}" alt="${s.label}">
      </div>
    `).join('');
    spriteWrap.querySelectorAll('.sprite-choice').forEach(el => {
      if (existingCompanion && (!existingCompanion.avatarType || existingCompanion.avatarType === 'sprite') &&
          (existingCompanion.avatarValue || existingCompanion.sprite) === el.dataset.sprite) {
        el.style.borderColor = 'var(--ink)';
        el.dataset.selected = 'true';
      }
      el.addEventListener('click', () => {
        spriteWrap.querySelectorAll('.sprite-choice').forEach(x => { x.style.borderColor = 'transparent'; delete x.dataset.selected; });
        el.style.borderColor = 'var(--ink)';
        el.dataset.selected = 'true';
      });
    });

    const defaultTab = existingCompanion ? (existingCompanion.avatarType || 'sprite') : 'sprite';
    document.querySelectorAll('#companionModal .avatar-tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#companionModal .avatar-tab-panel').forEach(p => p.classList.remove('active'));
    const tabBtn = document.querySelector(`#companionModal .avatar-tab-btn[data-avatar-tab="${defaultTab}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    const tabPanel = document.getElementById('avatarPanel-' + defaultTab);
    if (tabPanel) tabPanel.classList.add('active');

    document.getElementById('companionModal').classList.add('show');
  }

  document.getElementById('addCompanionBtn').addEventListener('click', () => openCompanionModal(null));

  document.getElementById('cancelCompanionBtn').addEventListener('click', () => {
    document.getElementById('companionModal').classList.remove('show');
  });

  let pendingPhotoDataUrl = null;

  document.getElementById('companionPhotoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      pendingPhotoDataUrl = ev.target.result;
      document.getElementById('companionPhotoPreview').innerHTML = `<img src="${pendingPhotoDataUrl}" style="width:70px;height:70px;border-radius:50%;border:2px solid var(--ink);object-fit:cover;margin-top:10px;">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('saveCompanionBtn').addEventListener('click', () => {
    const name = document.getElementById('companionName').value.trim();
    if (!name) {
      showToast('Give your companion a name');
      sfxError();
      return;
    }

    const activeTab = document.querySelector('#companionModal .avatar-tab-btn.active').dataset.avatarTab;
    let avatarType, avatarValue;

    if (activeTab === 'sprite') {
      const selected = document.querySelector('#spriteChoices .sprite-choice[data-selected="true"]');
      if (!selected) {
        showToast('Pick a sprite for them');
        sfxError();
        return;
      }
      avatarType = 'sprite';
      avatarValue = selected.dataset.sprite;
    } else if (activeTab === 'photo') {
      if (!pendingPhotoDataUrl) {
        showToast('Upload a photo for them');
        sfxError();
        return;
      }
      avatarType = 'photo';
      avatarValue = pendingPhotoDataUrl;
    } else if (activeTab === 'emoji') {
      const emoji = document.getElementById('companionEmojiInput').value.trim();
      if (!emoji) {
        showToast('Type an emoji for them');
        sfxError();
        return;
      }
      avatarType = 'emoji';
      avatarValue = emoji;
    }

    if (!currentTrip.companions) currentTrip.companions = [];

    if (editingCompanionId) {
      const comp = currentTrip.companions.find(c => c.id === editingCompanionId);
      comp.name = name;
      comp.avatarType = avatarType;
      comp.avatarValue = avatarValue;
      showToast(`${name} updated`);
    } else {
      currentTrip.companions.push({
        id: 'comp-' + Date.now(),
        name,
        avatarType,
        avatarValue
      });
      showToast(`${name} added to the trip`);
    }

    persistTrip();
    document.getElementById('companionModal').classList.remove('show');
    renderCompanions();
    renderHero();
  });

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
          <div class="flight-detail-row">Depart ${formatTime(f.departTime)} on ${new Date(f.departTime).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</div>
          <div class="flight-detail-row">Arrive ${formatTime(f.arriveTime)} on ${new Date(f.arriveTime).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</div>
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
        if (flight.done) {
          sfxCheck();
          showToast('Flight marked as flown');
        } else {
          sfxUncheck();
        }
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
    document.getElementById('flightModalTitle').textContent = existingFlight ? 'EDIT FLIGHT' : 'ADD FLIGHT';
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
        id: 'flight-' + Date.now(),
        airline, flightNumber, from, to,
        departTime: depart,
        arriveTime: arrive,
        confirmation,
        done: false,
        lastEditedBy: currentEditor,
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

    const addDayBtn = document.createElement('button');
    addDayBtn.className = 'add-flight-btn';
    addDayBtn.style.marginBottom = '16px';
    addDayBtn.textContent = '+ ADD DAY TO ITINERARY';
    addDayBtn.addEventListener('click', () => openDayModal());
    dayList.appendChild(addDayBtn);

    if (!currentTrip.days || currentTrip.days.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No itinerary days yet. Click "Add Day to Itinerary" above to start planning.';
      dayList.appendChild(emptyMsg);
      return;
    }

    currentTrip.days
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((day) => {
        const dayIndex = currentTrip.days.indexOf(day);
        const block = document.createElement('div');
        block.className = 'day-block';
        if (dayIndex === 0) block.classList.add('open');

        const doneCount = day.items.filter(i => i.done).length;
        const totalCount = day.items.length;

        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `
          <div class="day-title">${formatDateLong(day.date).toUpperCase()}</div>
          <div class="weather-chip">
            <img src="${weatherIcon(day.weather.icon)}" alt="weather">
            <span>${day.weather.summary}, ${formatTemp(day.weather.tempLowC)}-${formatTemp(day.weather.tempHighC)}</span>
          </div>
          <div class="day-progress-chip">${doneCount} / ${totalCount} done</div>
          <button class="item-edit-btn" data-remove-day="${dayIndex}" style="margin:0;" title="Remove this day">🗑️</button>
          <span class="day-toggle-icon">&#9654;</span>
        `;
        header.addEventListener('click', (e) => {
          if (e.target.closest('[data-remove-day]')) return;
          block.classList.toggle('open');
        });

        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'day-items';

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'items-container';
        itemsContainer.dataset.dayIndex = dayIndex;

        day.items
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time))
          .forEach(item => {
            itemsContainer.appendChild(renderItem(item, dayIndex));
          });

        itemsWrap.appendChild(itemsContainer);

        const addBtn = document.createElement('button');
        addBtn.className = 'add-item-btn';
        addBtn.textContent = '+ ADD ITEM TO THIS DAY';
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openItemModal(dayIndex);
        });
        itemsWrap.appendChild(addBtn);

        block.appendChild(header);
        block.appendChild(itemsWrap);
        dayList.appendChild(block);

        enableDragReorder(itemsContainer, dayIndex);
      });

    dayList.querySelectorAll('[data-remove-day]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.removeDay, 10);
        const removedDate = currentTrip.days[idx] ? currentTrip.days[idx].date : '';
        currentTrip.days.splice(idx, 1);
        persistTrip();
        showToast(removedDate ? `Removed ${formatDateLong(removedDate)}` : 'Day removed');
        renderDays();
      });
    });

    reloadTikTokEmbeds();
  }

  /* ---------------- ADD DAY MODAL ---------------- */
  function openDayModal() {
    document.getElementById('dayDateInput').value = '';
    document.getElementById('dayWeatherIcon').value = 'sun';
    document.getElementById('dayModal').classList.add('show');
  }

  document.getElementById('cancelDayBtn').addEventListener('click', () => {
    document.getElementById('dayModal').classList.remove('show');
  });

  document.getElementById('saveDayBtn').addEventListener('click', () => {
    const date = document.getElementById('dayDateInput').value;
    const icon = document.getElementById('dayWeatherIcon').value;

    if (!date) {
      showToast('Pick a date for this day');
      sfxError();
      return;
    }

    if (!currentTrip.days) currentTrip.days = [];

    const alreadyExists = currentTrip.days.some(d => d.date === date);
    if (alreadyExists) {
      showToast('That date is already in your itinerary');
      sfxError();
      return;
    }

    currentTrip.days.push({
      date: date,
      weather: { icon: icon, tempHighC: null, tempLowC: null, summary: 'Forecast not available yet' },
      items: []
    });

    persistTrip();
    document.getElementById('dayModal').classList.remove('show');
    showToast('Day added to your itinerary');
    renderDays();
  });

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
      if (item.done) {
        sfxCheck();
        showToast('Nice, one more thing ticked off!');
      } else {
        sfxUncheck();
      }
      renderDays();
    });

    const thumb = el.querySelector('.item-photo-thumb');
    if (thumb) {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(item.photo);
      });
    }

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

    return el;
  }

  function enableDragReorder(container, dayIndex) {
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
      if (afterEl == null) {
        container.appendChild(draggedEl);
      } else {
        container.insertBefore(draggedEl, afterEl);
      }
    });
  }

  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll('.itinerary-item:not(.dragging)')];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: -Infinity }).element;
  }

  /* ---------------- ITEM MODAL ---------------- */
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
      const newItem = {
        id: 'new-' + Date.now(),
        time: time || '00:00',
        title,
        location,
        notes,
        flexibility: flex,
        done: false,
        lastEditedBy: currentEditor,
        photo: pendingItemPhotoDataUrl || null,
        link: link || null
      };
      currentTrip.days[activeDayForModal].items.push(newItem);
      showToast('Item added to your itinerary');
    }

    persistTrip();
    renderDays();
    document.getElementById('itemModal').classList.remove('show');
  });

  /* ---------------- FILES ---------------- */
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

  document.getElementById('addFileBtn').addEventListener('click', () => {
    showToast('Hook this up to Supabase Storage later for real uploads');
  });

  /* ---------------- TABS ---------------- */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    });
  });

  /* ---------------- INIT ---------------- */
  renderHero();
  renderFlights();
  renderDays();
  renderCompanions();
  renderFiles();
  setupAvatarTabs();

  // Fill in live weather for any day within range, then re-render
  // if anything changed. Runs once per page load, not on every
  // click, so this doesn't hammer the Open-Meteo API.
  refreshTripWeather(currentTrip).then(updated => {
    if (updated) {
      persistTrip();
      renderDays();
    }
  });
})();
