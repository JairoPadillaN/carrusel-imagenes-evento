(() => {
  const FONTS = ['Playball', 'Petit Formal Script', 'Lobster', 'Cookie', 'Agbalumo'];

  const fontOptionsEl = document.getElementById('font-options');
  const colorInput = document.getElementById('color-input');
  const sizeInput = document.getElementById('size-input');
  const sizeValue = document.getElementById('size-value');
  const durationInput = document.getElementById('duration-input');
  const transitionOptions = document.querySelectorAll('.transition-option');
  const saveBtn = document.getElementById('save-btn');
  const previewPhrase = document.getElementById('preview-phrase');

  let current = {
    phraseFont: 'Playball',
    phraseColor: '#D4AF37',
    transitionEffect: 'fade',
    imageDurationSeconds: 30,
    phraseBaseSize: 4.6,
  };

  function renderFontOptions() {
    fontOptionsEl.innerHTML = '';
    FONTS.forEach((font) => {
      const opt = document.createElement('div');
      opt.className = 'font-option';
      opt.dataset.value = font;
      opt.innerHTML = `
        <span class="sample" style="font-family:'${font}', cursive;">Un momento inolvidable</span>
        <span class="label">${font}</span>
      `;
      opt.addEventListener('click', () => {
        current.phraseFont = font;
        updateSelectedFont();
        updatePreview();
      });
      fontOptionsEl.appendChild(opt);
    });
  }

  function updateSelectedFont() {
    document.querySelectorAll('.font-option').forEach((el) => {
      el.classList.toggle('selected', el.dataset.value === current.phraseFont);
    });
  }

  function updateSelectedTransition() {
    transitionOptions.forEach((el) => {
      el.classList.toggle('selected', el.dataset.value === current.transitionEffect);
    });
  }

  function updatePreview() {
    previewPhrase.style.fontFamily = `'${current.phraseFont}', cursive`;
    previewPhrase.style.color = current.phraseColor;
    // La vista previa usa un tamano proporcionalmente menor al real de pantalla completa,
    // solo para dar una referencia visual dentro de la mini-pantalla.
    previewPhrase.style.fontSize = `clamp(1rem, ${current.phraseBaseSize * 0.34}vw, ${current.phraseBaseSize * 0.62}rem)`;
  }

  colorInput.addEventListener('input', () => {
    current.phraseColor = colorInput.value;
    updatePreview();
  });

  sizeInput.addEventListener('input', () => {
    current.phraseBaseSize = parseFloat(sizeInput.value);
    sizeValue.textContent = `${current.phraseBaseSize.toFixed(1)}rem`;
    updatePreview();
  });

  durationInput.addEventListener('input', () => {
    durationInput.value = durationInput.value.replace(/[^\d]/g, '');
  });

  transitionOptions.forEach((el) => {
    el.addEventListener('click', () => {
      current.transitionEffect = el.dataset.value;
      updateSelectedTransition();
    });
  });

  saveBtn.addEventListener('click', async () => {
    const duration = parseInt(durationInput.value, 10);
    if (!Number.isFinite(duration) || duration < 3 || duration > 600) {
      showToast('El tiempo por imagen debe ser un numero entre 3 y 600 segundos.', true);
      return;
    }
    current.imageDurationSeconds = duration;

    saveBtn.disabled = true;
    const original = saveBtn.textContent;
    saveBtn.textContent = 'Guardando...';

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      showToast('Guardado. Todas las pantallas del carrusel se actualizaron.');
    } catch (err) {
      showToast(err.message || 'Error al guardar', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = original;
    }
  });

  async function bootstrap() {
    try {
      const res = await fetch('/api/settings');
      const settings = await res.json();
      current = settings;
    } catch (err) {
      // usa los valores por defecto si falla la carga
    }
    renderFontOptions();
    colorInput.value = current.phraseColor;
    sizeInput.value = current.phraseBaseSize;
    sizeValue.textContent = `${current.phraseBaseSize.toFixed(1)}rem`;
    durationInput.value = current.imageDurationSeconds;
    updateSelectedFont();
    updateSelectedTransition();
    updatePreview();
  }

  bootstrap();
})();
