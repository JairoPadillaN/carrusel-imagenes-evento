(() => {
  const slides = [document.getElementById('slide-a'), document.getElementById('slide-b')];
  const phraseText = document.getElementById('phrase-text');
  const muteBtn = document.getElementById('mute-btn');

  const IMAGE_DURATION_MS = 15000;

  let activeSlideIndex = 0;
  let mediaList = [];
  let phrases = [];
  let playlist = [];
  let playlistPos = 0;
  let lastPhrase = null;
  let currentTimer = null;
  let currentVideo = null;
  let cycleToken = 0; // evita condiciones de carrera si se dispara mas de un ciclo

  function applySettings(settings) {
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

  function buildPlaylist() {
    if (mediaList.length === 0) {
      playlist = [];
      return;
    }
    const next = shuffle(mediaList);
    if (playlist.length && next[0].url === playlist[playlist.length - 1].url && next.length > 1) {
      [next[0], next[1]] = [next[1], next[0]];
    }
    playlist = next;
    playlistPos = 0;
  }

  function nextMediaItem() {
    if (playlistPos >= playlist.length) buildPlaylist();
    const item = playlist[playlistPos];
    playlistPos++;
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

  function phraseFontSize(text) {
    const len = text.length;
    let rem;
    if (len <= 20) rem = 4.6;
    else if (len <= 40) rem = 3.6;
    else if (len <= 70) rem = 2.7;
    else if (len <= 110) rem = 2.1;
    else rem = 1.5;
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

    // Video: dos elementos con la misma fuente, uno de fondo (desenfocado, silenciado)
    // y otro en primer plano (contenido, con boton de silencio/sonido).
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

    if (mediaList.length === 0) return;

    const item = nextMediaItem();
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

    if (myToken !== cycleToken) return; // se disparo otro ciclo mientras cargaba

    currentSlide.classList.remove('active');
    targetSlide.classList.add('active');
    activeSlideIndex = inactiveIndex;
    stopVideosIn(currentSlide);

    if (result.type === 'image') {
      setTimeout(showPhrase, 350);
      currentTimer = setTimeout(() => {
        if (myToken === cycleToken) playNext();
      }, IMAGE_DURATION_MS);
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

  async function refreshMediaList() {
    try {
      const fresh = await fetch('/api/media').then((r) => r.json());
      mediaList = fresh;
    } catch (err) {
      // sin conexion momentanea, se reintenta en el siguiente ciclo
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
    buildPlaylist();

    if (mediaList.length === 0) {
      phraseText.textContent = 'Aun no hay imagenes ni videos cargados.';
      phraseText.style.fontSize = '2rem';
      phraseText.classList.add('visible');
      return;
    }

    playNext();
    setInterval(refreshMediaList, 60000);
  }

  const socket = io();
  socket.on('settings-updated', (settings) => applySettings(settings));

  bootstrap();
})();
