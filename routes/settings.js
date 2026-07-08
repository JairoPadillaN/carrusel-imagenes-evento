const express = require('express');
const fs = require('fs');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
const phrasesPath = path.join(__dirname, '..', 'data', 'phrases.json');

const ALLOWED_FONTS = new Set([
  'Playball',
  'Petit Formal Script',
  'Lobster',
  'Cookie',
  'Agbalumo',
]);

const ALLOWED_TRANSITIONS = new Set(['fade', 'zoom', 'slide']);

module.exports = function createSettingsRouter(io) {
  const router = express.Router();

  router.get('/api/settings', (req, res) => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    res.json(settings);
  });

  router.post('/api/settings', requireAuth, (req, res) => {
    const { phraseFont, phraseColor, transitionEffect, imageDurationSeconds, phraseBaseSize } = req.body || {};

    if (!ALLOWED_FONTS.has(phraseFont)) {
      return res.status(400).json({ error: 'Fuente no permitida' });
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(phraseColor || '')) {
      return res.status(400).json({ error: 'Color invalido, usa formato hexadecimal (#RRGGBB)' });
    }
    if (!ALLOWED_TRANSITIONS.has(transitionEffect)) {
      return res.status(400).json({ error: 'Efecto de transicion no permitido' });
    }

    const duration = Number(imageDurationSeconds);
    if (!Number.isFinite(duration) || duration < 3 || duration > 600) {
      return res.status(400).json({ error: 'La duracion de la imagen debe estar entre 3 y 600 segundos' });
    }

    const baseSize = Number(phraseBaseSize);
    if (!Number.isFinite(baseSize) || baseSize < 1.5 || baseSize > 8) {
      return res.status(400).json({ error: 'El tamano de fuente debe estar entre 1.5 y 8 rem' });
    }

    const newSettings = {
      phraseFont,
      phraseColor,
      transitionEffect,
      imageDurationSeconds: duration,
      phraseBaseSize: baseSize,
    };
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));

    // Notifica en vivo a todas las pantallas del carrusel conectadas
    io.emit('settings-updated', newSettings);

    res.json({ ok: true, settings: newSettings });
  });

  router.get('/api/phrases', (req, res) => {
    const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf-8'));
    res.json(phrases);
  });

  return router;
};
