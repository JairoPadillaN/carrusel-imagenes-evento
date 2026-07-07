(() => {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  });
})();

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.borderColor = isError ? 'var(--danger)' : 'var(--gold)';
  toast.classList.add('shown');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('shown'), 3200);
}
