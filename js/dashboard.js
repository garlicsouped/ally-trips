/* ============================================================
   DASHBOARD LOGIC
   Renders upcoming (non archived) trip cards. Archived and
   completed trips live on archive.html instead.
   ============================================================ */

function renderTripCard(trip) {
  const dUntil = daysUntil(trip.startDate);
  let countdownText = '';
  if (dUntil > 0) {
    countdownText = dUntil === 1 ? '1 day to go' : `${dUntil} days to go`;
  } else if (dUntil === 0) {
    countdownText = 'Today is the day!';
  } else {
    countdownText = 'In progress';
  }

  const companions = trip.companions || [];
  const companionAvatars = companions.slice(0, 4).map(c =>
    companionAvatarHTML(c, 'companion-avatar')
  ).join('');

  const card = document.createElement('div');
  card.className = 'trip-card';
  card.innerHTML = `
    <img src="assets/icons/sparkle.png" class="sparkle-hover sparkle-1" alt="">
    <img src="assets/icons/sparkle.png" class="sparkle-hover sparkle-2" alt="">
    <span class="status-tag">UPCOMING</span>
    <div class="emoji-badge">${trip.coverEmoji}</div>
    <h3>${trip.name}</h3>
    <div class="destination"><span class="emoji-inline sm">📍</span> ${trip.destination}</div>
    <div class="dates">${formatDateRange(trip.startDate, trip.endDate)}</div>
    <div class="companion-row">${companionAvatars}</div>
    <div class="countdown">${countdownText}</div>
  `;
  card.addEventListener('click', () => {
    window.location.href = `trip.html?id=${trip.id}`;
  });
  return card;
}

function renderDashboard() {
  const grid = document.getElementById('tripGrid');
  grid.innerHTML = '';
  const trips = getTrips().filter(t => !t.archived);

  trips
    .slice()
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .forEach(trip => {
      grid.appendChild(renderTripCard(trip));
    });

  const addCard = document.createElement('div');
  addCard.className = 'trip-card add-trip-card';
  addCard.innerHTML = '+ ADD NEW TRIP';
  addCard.addEventListener('click', () => {
    openNewTripModal();
  });
  grid.appendChild(addCard);
}

function openNewTripModal() {
  document.getElementById('newTripName').value = '';
  document.getElementById('newTripDestination').value = '';
  document.getElementById('newTripStart').value = '';
  document.getElementById('newTripEnd').value = '';
  document.getElementById('newTripEmoji').value = '';
  document.getElementById('newTripModal').classList.add('show');
}

function closeNewTripModal() {
  document.getElementById('newTripModal').classList.remove('show');
}

document.getElementById('cancelNewTripBtn').addEventListener('click', closeNewTripModal);

document.getElementById('saveNewTripBtn').addEventListener('click', () => {
  const name = document.getElementById('newTripName').value.trim();
  const destination = document.getElementById('newTripDestination').value.trim();
  const start = document.getElementById('newTripStart').value;
  const end = document.getElementById('newTripEnd').value;
  const emoji = document.getElementById('newTripEmoji').value.trim();

  if (!name || !destination || !start || !end) {
    showToast('Please fill in the trip name, destination, and dates');
    return;
  }

  const newTrip = createTrip({
    name,
    destination,
    startDate: start,
    endDate: end,
    coverEmoji: emoji || '✈️'
  });

  closeNewTripModal();
  showToast('Trip created! Opening it now');
  setTimeout(() => {
    window.location.href = `trip.html?id=${newTrip.id}`;
  }, 600);
});

document.addEventListener('DOMContentLoaded', renderDashboard);
