(() => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const previewGrid = document.getElementById('preview-grid');
  const uploadActions = document.getElementById('upload-actions');
  const uploadBtn = document.getElementById('upload-btn');
  const uploadCount = document.getElementById('upload-count');
  const clearBtn = document.getElementById('clear-btn');
  const existingList = document.getElementById('existing-list');
  const existingCount = document.getElementById('existing-count');

  // Cola local de archivos seleccionados, pendientes de subir.
  // Cada entrada: { id, file, url, type }
  let queue = [];
  let idSeq = 0;

  function isVideo(file) {
    return file.type.startsWith('video/');
  }

  function addFiles(fileList) {
    const accepted = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    accepted.forEach((file) => {
      queue.push({
        id: ++idSeq,
        file,
        url: URL.createObjectURL(file),
        type: isVideo(file) ? 'video' : 'image',
      });
    });
    renderQueue();
  }

  function removeFromQueue(id) {
    const entry = queue.find((q) => q.id === id);
    if (entry) URL.revokeObjectURL(entry.url);
    queue = queue.filter((q) => q.id !== id);
    renderQueue();
  }

  function renderQueue() {
    previewGrid.innerHTML = '';
    queue.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'preview-item';

      const media = entry.type === 'video'
        ? Object.assign(document.createElement('video'), { muted: true })
        : document.createElement('img');
      media.src = entry.url;
      if (entry.type === 'video') {
        media.setAttribute('muted', '');
        media.setAttribute('playsinline', '');
      }

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = entry.type === 'video' ? 'Video' : 'Imagen';

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Quitar de la lista';
      removeBtn.addEventListener('click', () => removeFromQueue(entry.id));

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = entry.file.name;

      item.append(media, badge, removeBtn, name);
      previewGrid.appendChild(item);
    });

    uploadActions.hidden = queue.length === 0;
    uploadCount.textContent = queue.length ? `(${queue.length})` : '';
  }

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  clearBtn.addEventListener('click', () => {
    queue.forEach((q) => URL.revokeObjectURL(q.url));
    queue = [];
    renderQueue();
  });

  uploadBtn.addEventListener('click', async () => {
    if (queue.length === 0) return;
    uploadBtn.disabled = true;
    const original = uploadBtn.textContent;
    uploadBtn.textContent = 'Subiendo...';

    const formData = new FormData();
    queue.forEach((entry) => formData.append('files', entry.file, entry.file.name));

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al subir');

      showToast(`Se subieron ${data.files.length} archivo(s) correctamente.`);
      queue.forEach((q) => URL.revokeObjectURL(q.url));
      queue = [];
      renderQueue();
      loadExisting();
    } catch (err) {
      showToast(err.message || 'Error al subir los archivos', true);
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = original;
    }
  });

  async function loadExisting() {
    try {
      const res = await fetch('/api/media/manage');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const files = await res.json();
      existingCount.textContent = files.length;

      if (files.length === 0) {
        existingList.innerHTML = '<div class="empty-state">Aun no hay archivos cargados.</div>';
        return;
      }

      existingList.innerHTML = '';
      files.forEach((f) => {
        const item = document.createElement('div');
        item.className = 'existing-item';

        const url = `/media/${f.type === 'video' ? 'videos' : 'images'}/${encodeURIComponent(f.name)}`;
        const media = f.type === 'video' ? document.createElement('video') : document.createElement('img');
        media.src = url;
        if (f.type === 'video') {
          media.muted = true;
          media.setAttribute('muted', '');
          media.setAttribute('playsinline', '');
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Eliminar archivo';
        removeBtn.addEventListener('click', async () => {
          if (!confirm(`Eliminar "${f.name}"? Esta accion no se puede deshacer.`)) return;
          const delRes = await fetch(`/api/media/${f.type}/${encodeURIComponent(f.name)}`, { method: 'DELETE' });
          if (delRes.ok) {
            showToast('Archivo eliminado.');
            loadExisting();
          } else {
            showToast('No se pudo eliminar el archivo.', true);
          }
        });

        item.append(media, removeBtn);
        existingList.appendChild(item);
      });
    } catch (err) {
      existingList.innerHTML = '<div class="empty-state">No se pudo cargar la lista de archivos.</div>';
    }
  }

  loadExisting();
})();
