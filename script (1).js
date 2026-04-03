
function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * formatDateTime() — Formats a Firestore timestamp to date + time
 */
function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * showToast() — Shows a temporary floating notification
 * type: 'success' | 'error' | 'info' | 'warning'
 */
function showToast(message, type = 'info') {
  const existing = document.getElementById('__toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = '__toast';
  const colors = {
    success: 'var(--green)',
    error:   'var(--red)',
    warning: 'var(--orange)',
    info:    'var(--blue)'
  };
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: white;
    border-left: 4px solid ${colors[type]};
    border-radius: 10px;
    padding: 14px 18px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--gray-800);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: fadeInUp 0.3s ease both;
    max-width: 320px;
  `;

  toast.innerHTML = `${icons[type]} ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * getDayName() — Returns name of current day
 */
function getDayName() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date().getDay()];
}

/**
 * getScheduleForToday() — Returns today's laundry schedule
 */
function getScheduleForToday() {
  const schedule = {
    1: { rooms: [101, 140], label: 'Monday' },
    2: { rooms: [201, 240], label: 'Tuesday' },
    3: { rooms: [301, 340], label: 'Wednesday' },
    4: { rooms: [401, 440], label: 'Thursday' },
    5: { rooms: [501, 540], label: 'Friday' },
    6: { rooms: [601, 640], label: 'Saturday' },
    0: { rooms: [701, 740], label: 'Sunday' }
  };
  return schedule[new Date().getDay()] || null;
}

// Expose to global scope (for non-module scripts)
window.formatDate        = formatDate;
window.formatDateTime    = formatDateTime;
window.showToast         = showToast;
window.getDayName        = getDayName;
window.getScheduleForToday = getScheduleForToday;
