const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth');
const mediaRoutes = require('./routes/media');
const uploadRoutes = require('./routes/upload');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'carrusel-evento-secreto-local-2026';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const settingsRoutes = require('./routes/settings')(io);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12, // 12 horas, suficiente para un evento
      httpOnly: true,
    },
  })
);

// Archivos estaticos de la app (css, js del cliente)
app.use('/assets', express.static(path.join(__dirname, 'public')));

// Medios servidos directamente (usado por <img>/<video> en el carrusel)
app.use('/media/images', express.static(path.join(__dirname, 'media', 'images')));
app.use('/media/videos', express.static(path.join(__dirname, 'media', 'videos')));

// API
app.use(authRoutes);
app.use(mediaRoutes);
app.use(uploadRoutes);
app.use(settingsRoutes);

// Paginas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'carousel.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/upload', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'upload.html'));
});

app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

io.on('connection', () => {
  // No se requiere logica adicional: solo difundimos cambios de personalizacion.
});

server.listen(PORT, () => {
  console.log(`Carrusel de evento activo en http://localhost:${PORT}`);
  console.log(`  - Vista publica:      http://localhost:${PORT}/`);
  console.log(`  - Carga de archivos:  http://localhost:${PORT}/upload`);
  console.log(`  - Personalizacion:    http://localhost:${PORT}/admin`);
});
