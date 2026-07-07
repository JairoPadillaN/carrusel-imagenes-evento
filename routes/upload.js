const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const IMAGES_DIR = path.join(__dirname, '..', 'media', 'images');
const VIDEOS_DIR = path.join(__dirname, '..', 'media', 'videos');

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg']);

function sanitizeBaseName(originalName) {
  const ext = path.extname(originalName);
  const base = path
    .basename(originalName, ext)
    .normalize('NFKD')
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 80);
  return { base: base || 'archivo', ext };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (IMAGE_MIME.has(file.mimetype)) return cb(null, IMAGES_DIR);
    if (VIDEO_MIME.has(file.mimetype)) return cb(null, VIDEOS_DIR);
    cb(new Error('Tipo de archivo no soportado'));
  },
  filename: (req, file, cb) => {
    const { base, ext } = sanitizeBaseName(file.originalname);
    const stamp = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${base}-${stamp}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (IMAGE_MIME.has(file.mimetype) || VIDEO_MIME.has(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Solo se permiten imagenes o videos'));
}

// Sin limite de tamano (segun requerimiento): duracion/peso no importan, solo que sean legibles.
const upload = multer({ storage, fileFilter });

router.post('/api/upload', requireAuth, (req, res) => {
  upload.array('files', 100)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir archivos' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos' });
    }

    const saved = req.files.map((f) => ({
      name: f.filename,
      type: IMAGE_MIME.has(f.mimetype) ? 'image' : 'video',
      size: f.size,
    }));

    res.json({ ok: true, files: saved });
  });
});

module.exports = router;
