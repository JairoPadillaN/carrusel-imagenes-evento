const express = require('express');
const fs = require('fs');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const IMAGES_DIR = path.join(__dirname, '..', 'media', 'images');
const VIDEOS_DIR = path.join(__dirname, '..', 'media', 'videos');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.mkv', '.ogg']);

function listDir(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => exts.has(path.extname(f).toLowerCase()) && !f.startsWith('.'))
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, size: stat.size, mtime: stat.mtimeMs };
    });
}

// Publico: lo usa el carrusel para armar la lista de reproduccion
router.get('/api/media', (req, res) => {
  const images = listDir(IMAGES_DIR, IMAGE_EXT).map((f) => ({
    type: 'image',
    url: `/media/images/${encodeURIComponent(f.name)}`,
    name: f.name,
    mtime: f.mtime,
  }));

  const videos = listDir(VIDEOS_DIR, VIDEO_EXT).map((f) => ({
    type: 'video',
    url: `/media/videos/${encodeURIComponent(f.name)}`,
    name: f.name,
    mtime: f.mtime,
  }));

  res.json([...images, ...videos]);
});

// Protegido: usado por el modulo de carga para gestionar archivos existentes
router.get('/api/media/manage', requireAuth, (req, res) => {
  const images = listDir(IMAGES_DIR, IMAGE_EXT).map((f) => ({ type: 'image', ...f }));
  const videos = listDir(VIDEOS_DIR, VIDEO_EXT).map((f) => ({ type: 'video', ...f }));
  const all = [...images, ...videos].sort((a, b) => b.mtime - a.mtime);
  res.json(all);
});

router.delete('/api/media/:type/:filename', requireAuth, (req, res) => {
  const { type, filename } = req.params;

  if (type !== 'image' && type !== 'video') {
    return res.status(400).json({ error: 'Tipo invalido' });
  }

  const dir = type === 'image' ? IMAGES_DIR : VIDEOS_DIR;
  const safeName = path.basename(filename);
  const filePath = path.join(dir, safeName);

  if (!filePath.startsWith(dir)) {
    return res.status(400).json({ error: 'Ruta invalida' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }

  fs.unlinkSync(filePath);
  res.json({ ok: true });
});

module.exports = router;
