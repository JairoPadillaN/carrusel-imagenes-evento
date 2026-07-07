/**
 * Protege rutas que requieren sesion de administrador local.
 * Si la peticion espera JSON (API) responde 401, si espera HTML redirige a /login.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  const wantsJson =
    req.path.startsWith('/api/') ||
    req.headers.accept?.includes('application/json');

  if (wantsJson) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const redirectTo = encodeURIComponent(req.originalUrl);
  return res.redirect(`/login?redirect=${redirectTo}`);
}

module.exports = requireAuth;
