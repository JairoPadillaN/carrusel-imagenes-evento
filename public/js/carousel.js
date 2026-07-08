(() => {
  const slides = [document.getElementById('slide-a'), document.getElementById('slide-b')];
  const phraseText = document.getElementById('phrase-text');
  const muteBtn = document.getElementById('mute-btn');

  const MEDIA_POLL_MS = 20000;

  let activeSlideIndex = 0;
  let mediaList = [];       // catalogo completo conocido (lo que hay en el servidor)
  let phrases = [];
  let queue = [];            // cola actual: se va vaciando conforme se muestran los elementos
  let recentHistory = [];    // ultimos elementos mostrados (para evitar repeticiones cercanas)
  let lastPhrase = null;
  let currentTimer = null;
  let currentVideo = null;
  let cycleToken = 0;

  let settings = {
    phraseFont: 'Playball',
    phraseColor: '#D4AF37',
    transitionEffect: 'fade',
    imageDurationSeconds: 30,
    phraseBaseSize: 4.6,
  };

  function applySettings(newSettings) {
    settings = newSettings;
    document.documentElement.style.setProperty('--phrase-font', `'${settings.phraseFont}', cursive`);
    document.documentElement.style.setProperty('--phrase-color', settings.phraseColor);
    slides.forEach((s) => {
      s.classList.remove('trans-fade', 'trans-zoom', 'trans-slide');
      s.classList.add(`trans-${settings.transitionEffect}`);
    });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Cuantos elementos recientes recordamos para evitar que reaparezcan demasiado pronto.
  // Se adapta al tamano del catalogo (no tiene sentido recordar mas de lo que hay disponible).
  function historyLimit() {
    return Math.max(1, Math.min(3, mediaList.length - 1));
  }

  // Baraja el catalogo completo para formar una nueva cola, intentando que los primeros
  // elementos no coincidan con los mostrados mas recientemente (evita repeticiones cercanas
  // al reiniciar el ciclo, no solo la repeticion inmediata).
  //
  // Importante: la cantidad de posiciones que verificamos contra el historial debe ser
  // siempre satisfacible. Si pidieramos evitar mas elementos de historial de los que
  // "sobran" en el catalogo, la condicion seria imposible de cumplir (por ejemplo, con
  // 5 archivos no se puede pedir que los primeros 4 eviten 4 elementos recientes, porque
  // solo queda 1 elemento valido). Por eso acotamos checkPositions al numero de elementos
  // del catalogo que SI pueden quedar fuera del historial.
  function refillQueue() {
    if (mediaList.length === 0) {
      queue = [];
      return;
    }
    const hLimit = historyLimit();
    const survivors = Math.max(0, mediaList.length - hLimit);
    const checkPositions = Math.max(1, Math.min(hLimit, survivors));

    let candidate = shuffle(mediaList);
    let attempts = 0;
    while (
      attempts < 30 &&
      candidate.slice(0, checkPositions).some((item) => recentHistory.includes(item.url))
    ) {
      candidate = shuffle(mediaList);
      attempts++;
    }

    // Garantia dura (no solo probabilistica): el primer elemento de la nueva cola
    // nunca debe coincidir con el ultimo elemento mostrado, sin importar si el
    // intento anterior agoto sus intentos.
    const lastShown = recentHistory[recentHistory.length - 1];
    if (candidate.length > 1 && lastShown !== undefined && candidate[0].url === lastShown) {
      const swapIdx = 1 + Math.floor(Math.random() * (candidate.length - 1));
      [candidate[0], candidate[swapIdx]] = [candidate[swapIdx], candidate[0]];
    }

    queue = candidate;
  }

  function pushToHistory(url) {
    recentHistory.push(url);
    const max = historyLimit();
    while (recentHistory.length > max) recentHistory.shift();
  }

  // Saca el siguiente elemento de la cola. Si la cola esta vacia, se vuelve a llenar
  // barajando de nuevo todo el catalogo (que puede incluir archivos agregados durante el evento).
  function nextMediaItem() {
    if (queue.length === 0) refillQueue();
    if (queue.length === 0) return null;
    const item = queue.shift();
    pushToHistory(item.url);
    return item;
  }

  function pickPhrase() {
    if (phrases.length === 0) return '';
    if (phrases.length === 1) return phrases[0];
    let p;
    do {
      p = phrases[Math.floor(Math.random() * phrases.length)];
    } while (p === lastPhrase);
    lastPhrase = p;
    return p;
  }

  // Tamano de fuente segun el largo del texto, escalado en proporcion al tamano base
  // configurado en el modulo de personalizacion (settings.phraseBaseSize = tamano para frases cortas).
  function phraseFontSize(text) {
    const len = text.length;
    const base = settings.phraseBaseSize || 4.6;
    // Proporciones relativas al tamano base, calibradas sobre el valor por defecto (4.6rem)
    let ratio;
    if (len <= 20) ratio = 1;
    else if (len <= 40) ratio = 0.78;
    else if (len <= 70) ratio = 0.59;
    else if (len <= 110) ratio = 0.46;
    else ratio = 0.33;
    const rem = Math.max(1, base * ratio);
    return `clamp(1.1rem, 5vw, ${rem}rem)`;
  }

  function showPhrase() {
    const text = pickPhrase();
    if (!text) return;
    phraseText.textContent = text;
    phraseText.style.fontSize = phraseFontSize(text);
    requestAnimationFrame(() => phraseText.classList.add('visible'));
  }

  function hidePhrase() {
    phraseText.classList.remove('visible');
  }

  function hideMuteBtn() {
    muteBtn.classList.remove('shown');
    currentVideo = null;
  }

  function showMuteBtnFor(videoEl) {
    currentVideo = videoEl;
    muteBtn.classList.add('shown');
    updateMuteIcon();
  }

  function updateMuteIcon() {
    if (!currentVideo) return;
    muteBtn.classList.toggle('is-muted', currentVideo.muted);
    muteBtn.classList.toggle('is-unmuted', !currentVideo.muted);
  }

  muteBtn.addEventListener('click', () => {
    if (!currentVideo) return;
    currentVideo.muted = !currentVideo.muted;
    updateMuteIcon();
  });

  function clearTimer() {
    if (currentTimer) {
      clearTimeout(currentTimer);
      currentTimer = null;
    }
  }

  function stopVideosIn(slideEl) {
    slideEl.querySelectorAll('video').forEach((v) => {
      v.pause();
      v.removeAttribute('src');
      v.load();
    });
  }

  async function renderSlide(targetSlide, item) {
    const bgLayer = targetSlide.querySelector('.bg-layer');
    const fgLayer = targetSlide.querySelector('.fg-layer');
    bgLayer.innerHTML = '';
    fgLayer.innerHTML = '';

    if (item.type === 'image') {
      const bgImg = document.createElement('img');
      const fgImg = document.createElement('img');
      bgImg.alt = '';
      fgImg.alt = '';
      bgImg.src = item.url;
      fgImg.src = item.url;

      await Promise.all([
        new Promise((res, rej) => {
          bgImg.onload = res;
          bgImg.onerror = rej;
        }),
        new Promise((res, rej) => {
          fgImg.onload = res;
          fgImg.onerror = rej;
        }),
      ]);

      targetSlide.dataset.orientation = fgImg.naturalWidth >= fgImg.naturalHeight ? 'landscape' : 'portrait';
      bgLayer.appendChild(bgImg);
      fgLayer.appendChild(fgImg);

      return { type: 'image' };
    }

    const bgVideo = document.createElement('video');
    const fgVideo = document.createElement('video');
    [bgVideo, fgVideo].forEach((v) => {
      v.src = item.url;
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
    });

    await new Promise((res, rej) => {
      let ready = 0;
      const mark = () => {
        ready++;
        if (ready === 2) res();
      };
      bgVideo.onloadedmetadata = mark;
      fgVideo.onloadedmetadata = mark;
      bgVideo.onerror = rej;
      fgVideo.onerror = rej;
    });

    targetSlide.dataset.orientation = fgVideo.videoWidth >= fgVideo.videoHeight ? 'landscape' : 'portrait';
    bgLayer.appendChild(bgVideo);
    fgLayer.appendChild(fgVideo);

    return { type: 'video', videoEl: fgVideo, bgVideoEl: bgVideo };
  }

  async function playNext() {
    const myToken = ++cycleToken;
    clearTimer();
    hidePhrase();
    hideMuteBtn();

    const item = nextMediaItem();
    if (!item) return; // no hay nada que mostrar todavia

    const inactiveIndex = 1 - activeSlideIndex;
    const targetSlide = slides[inactiveIndex];
    const currentSlide = slides[activeSlideIndex];

    let result;
    try {
      result = await renderSlide(targetSlide, item);
    } catch (err) {
      console.error('No se pudo cargar el archivo, se omite:', item, err);
      if (myToken === cycleToken) playNext();
      return;
    }

    if (myToken !== cycleToken) return;

    currentSlide.classList.remove('active');
    targetSlide.classList.add('active');
    activeSlideIndex = inactiveIndex;
    stopVideosIn(currentSlide);

    if (result.type === 'image') {
      setTimeout(showPhrase, 350);
      const durationMs = Math.max(3, settings.imageDurationSeconds || 30) * 1000;
      currentTimer = setTimeout(() => {
        if (myToken === cycleToken) playNext();
      }, durationMs);
    } else {
      const { videoEl, bgVideoEl } = result;
      showMuteBtnFor(videoEl);
      videoEl.addEventListener(
        'ended',
        () => {
          if (myToken === cycleToken) playNext();
        },
        { once: true }
      );
      videoEl.play().catch(() => {});
      bgVideoEl.play().catch(() => {});
    }
  }

  // Revisa periodicamente el catalogo del servidor. Los archivos nuevos se agregan
  // de inmediato a la cola en curso (en una posicion aleatoria), y los eliminados
  // se retiran tanto del catalogo como de la cola.
  async function refreshMediaList() {
    let fresh;
    try {
      fresh = await fetch('/api/media').then((r) => r.json());
    } catch (err) {
      return; // sin conexion momentanea, se reintenta en el siguiente ciclo
    }

    const oldUrls = new Set(mediaList.map((i) => i.url));
    const freshUrls = new Set(fresh.map((i) => i.url));

    const newItems = fresh.filter((i) => !oldUrls.has(i.url));
    const removedUrls = [...oldUrls].filter((u) => !freshUrls.has(u));

    mediaList = fresh;

    if (removedUrls.length) {
      queue = queue.filter((i) => !removedUrls.includes(i.url));
      recentHistory = recentHistory.filter((u) => !removedUrls.includes(u));
    }

    newItems.forEach((item) => {
      const pos = Math.floor(Math.random() * (queue.length + 1));
      queue.splice(pos, 0, item);
    });

    // Si el carrusel se habia quedado sin contenido, arranca en cuanto llegue algo nuevo.
    if (newItems.length && !currentTimer && !currentVideo && cycleToken === 0) {
      playNext();
    }
  }

  async function bootstrap() {
    const [mediaRes, phrasesRes, settingsRes] = await Promise.all([
      fetch('/api/media').then((r) => r.json()),
      fetch('/api/phrases').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]);

    mediaList = mediaRes;
    phrases = phrasesRes;
    applySettings(settingsRes);
    refillQueue();

    if (mediaList.length === 0) {
      phraseText.textContent = 'Aun no hay imagenes ni videos cargados.';
      phraseText.style.fontSize = '2rem';
      phraseText.classList.add('visible');
    } else {
      playNext();
    }

    setInterval(refreshMediaList, MEDIA_POLL_MS);
  }

  const socket = io();
  socket.on('settings-updated', (newSettings) => applySettings(newSettings));

  bootstrap();
})();
