# Carrusel de evento

Carrusel de imagenes y videos para pantallas de evento, con frases aleatorias, modulo de carga de archivos y modulo de personalizacion en vivo.

## Requisitos

- Node.js 18 o superior (probado en Debian 13 con Node 22).
- Sin base de datos, sin dependencias externas de servicios.

## Instalacion

```bash
cd media-carousel
npm install
npm start
```

El servidor arranca por defecto en el puerto `3000`. Puedes cambiarlo con la variable de entorno `PORT`:

```bash
PORT=8080 npm start
```

## URLs del sistema

| Ruta       | Descripcion                                              | Requiere login |
|------------|-----------------------------------------------------------|----------------|
| `/`        | Carrusel publico, la pantalla que se proyecta en el evento | No             |
| `/upload`  | Modulo para subir y administrar imagenes/videos            | Si             |
| `/admin`   | Modulo de personalizacion (fuente, color, transicion)      | Si             |
| `/login`   | Acceso administrativo                                      | -              |

**Credenciales por defecto:** usuario `admin`, contrasena `admin123`.

Para cambiarlas:

```bash
node scripts/set-password.js admin nueva-contrasena
```

## Como funciona

- **Imagenes**: se muestran por el tiempo configurado en el modulo de personalizacion (30 segundos por defecto).
- **Videos**: se reproducen completos (sin sonido por defecto) y al terminar pasa al siguiente elemento. Tienen un boton de silencio/sonido abajo a la derecha.
- **Orientacion**: el sistema detecta si cada imagen/video es vertical u horizontal y ajusta el encuadre: la imagen completa se centra con 1rem de margen respecto a los bordes, y el espacio restante se rellena con la misma imagen a pantalla completa, desenfocada.
- **Frases**: se muestran solo durante las imagenes (nunca durante videos), tomadas al azar desde `data/phrases.json`, en la parte inferior central, con tamano de fuente configurable que ademas se ajusta segun el largo del texto.
- **Orden aleatorio sin repeticion cercana**: al iniciar, el sistema baraja todo el catalogo de imagenes y videos en una cola. Conforme se van mostrando, cada elemento se retira de la cola (el array se va vaciando). Cuando la cola queda vacia, se vuelve a barajar todo el catalogo desde cero. El sistema recuerda los ultimos elementos mostrados para evitar que un mismo archivo reaparezca de inmediato o muy pronto al reiniciar el ciclo.
- **Archivos agregados durante el evento**: si subes imagenes o videos nuevos mientras el carrusel esta funcionando, se detectan automaticamente (revision cada 20 segundos) y se insertan en una posicion aleatoria dentro de la cola que esta en curso, sin esperar a que termine la vuelta actual. Si eliminas un archivo desde el modulo de carga, tambien se retira de la cola en reproduccion.
- **Transiciones**: fundido (fade) por defecto; tambien hay zoom suave y deslizamiento, seleccionables desde el modulo de personalizacion.

## Modulo de carga (`/upload`)

- Arrastra o selecciona imagenes y videos.
- Se muestra una vista previa antes de subir: puedes quitar archivos de la lista o agregar mas.
- No hay limite de tamano ni duracion, solo que el archivo sea legible por el navegador (formatos recomendados: JPG/PNG/WEBP para imagenes, MP4/WEBM para videos).
- Debajo se listan los archivos ya cargados en el servidor, con opcion de eliminarlos.

## Modulo de personalizacion (`/admin`)

- Elige entre 5 tipografias (Playball, Petit Formal Script, Lobster, Cookie, Agbalumo) para las frases.
- Elige el color del texto (dorado por defecto).
- Elige el **tamano base de la frase** (2 a 7rem): es el tamano usado para frases cortas; las frases largas se reducen automaticamente en la misma proporcion.
- Elige el **tiempo de visualizacion de cada imagen** (3 a 600 segundos). No afecta a los videos, que siempre se reproducen completos.
- Elige el efecto de transicion entre elementos del carrusel.
- Al guardar, **todas las pantallas del carrusel conectadas se actualizan automaticamente** (via WebSocket), sin necesidad de recargar la pagina manualmente.

## Estructura del proyecto

```
media-carousel/
├── server.js              Servidor Express + Socket.io
├── data/
│   ├── admin-credentials.json   Usuario/contrasena local (hash bcrypt)
│   ├── settings.json            Personalizacion actual (fuente/color/transicion)
│   └── phrases.json              Frases del carrusel (editable a mano)
├── media/
│   ├── images/             Imagenes del carrusel
│   └── videos/             Videos del carrusel
├── routes/                 Rutas de la API (auth, media, upload, settings)
├── middleware/              Proteccion de rutas administrativas
├── views/                   Paginas HTML (carrusel, login, upload, admin)
├── public/css, public/js    Estilos y logica del cliente
└── scripts/set-password.js  Utilidad para cambiar la contrasena
```

## Notas

- Las credenciales son locales y pensadas para un unico administrador durante el evento; no hay base de datos ni gestion de multiples usuarios.
- Puedes editar `data/phrases.json` directamente para agregar, quitar o modificar frases (formato: arreglo de strings).
- Se recomienda dejar el navegador de la pantalla del carrusel en modo kiosco/pantalla completa (`--kiosk` en Chrome/Chromium) apuntando a `http://localhost:3000/`.
