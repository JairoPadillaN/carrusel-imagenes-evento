(() => {
  const FONTS = ['Playball', 'Petit Formal Script', 'Lobster', 'Cookie', 'Agbalumo'];

  const fontOptionsEl = document.getElementById('font-options');
  const colorInput = document.getElementById('color-input');
  const transitionOptions = document.querySelectorAll('.transition-option');
  const saveBtn = document.getElementById('save-btn');
  const previewPhrase = document.getElementById('preview-phrase');

  let current = { phraseFont: 'Playball', phraseColor: '#D4AF37', transitionEffect: 'fade' };

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
  }

  colorInput.addEventListener('input', () => {
    current.phraseColor = colorInput.value;
    updatePreview();
  });

  transitionOptions.forEach((el) => {
    el.addEventListener('click', () => {
      current.transitionEffect = el.dataset.value;
      updateSelectedTransition();
    });
  });

  saveBtn.addEventListener('click', async () => {
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
    updateSelectedFont();
    updateSelectedTransition();
    updatePreview();
  }

  bootstrap();
})();
