const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const router = express.Router();
const credsPath = path.join(__dirname, '..', 'data', 'admin-credentials.json');

function getCredentials() {
  return JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
}

router.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
  }

  const creds = getCredentials();

  const validUser = username === creds.username;
  const validPass = validUser && bcrypt.compareSync(password, creds.passwordHash);

  if (!validUser || !validPass) {
    return res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
  }

  req.session.isAdmin = true;
  req.session.username = username;
  res.json({ ok: true });
});

router.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/api/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

module.exports = router;
