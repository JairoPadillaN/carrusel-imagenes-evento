(() => {
  const form = document.getElementById('login-form');
  const alertBox = document.getElementById('login-alert');
  const btn = document.getElementById('login-btn');

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function showError(msg) {
    alertBox.innerHTML = `<div class="alert alert-error">${msg}</div>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';
    btn.disabled = true;
    btn.textContent = 'Ingresando...';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'No se pudo iniciar sesion');
        btn.disabled = false;
        btn.textContent = 'Ingresar';
        return;
      }

      const redirect = params().get('redirect');
      window.location.href = redirect ? decodeURIComponent(redirect) : '/admin';
    } catch (err) {
      showError('Error de conexion con el servidor');
      btn.disabled = false;
      btn.textContent = 'Ingresar';
    }
  });
})();
