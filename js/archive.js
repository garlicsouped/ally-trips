/* ============================================================
   ARCHIVE PAGE LOGIC
   Lists trips marked as completed. Clicking a card opens the
   same trip detail page in read-friendly form, nothing is
   deleted, everything stays accessible.
   ============================================================ */

function renderArchiveCard(trip) {
  const companions = trip.companions || [];
  const companionAvatars = companions.slice(0, 4).map(c =>
    companionAvatarHTML(c, 'companion-avatar')
  ).join('');

  const card = document.createElement('div');
  card.className = 'trip-card';
  card.innerHTML = `
    <span class="status-tag past">COMPLETED</span>
    <div class="emoji-badge">${trip.coverEmoji}</div>
    <h3>${trip.name}</h3>
    <div class="destination"><span class="emoji-inline sm">📍</span> ${trip.destination}</div>
    <div class="dates">${formatDateRange(trip.startDate, trip.endDate)}</div>
    <div class="companion-row">${companionAvatars}</div>
  `;
  card.addEventListener('click', () => {
    window.location.href = `trip.html?id=${trip.id}`;
  });
  return card;
}

function renderArchive() {
  const grid = document.getElementById('archiveGrid');
  grid.innerHTML = '';
  const trips = getTrips().filter(t => t.archived);

  if (trips.length === 0) {
    grid.innerHTML = '<p>No archived trips yet. Mark a trip as completed from its detail page and it will show up here.</p>';
    return;
  }

  trips
    .slice()
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
    .forEach(trip => {
      grid.appendChild(renderArchiveCard(trip));
    });
}

document.addEventListener('DOMContentLoaded', renderArchive);
