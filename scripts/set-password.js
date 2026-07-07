/**
 * Utilidad para cambiar la contrasena local del administrador.
 * Uso:
 *   node scripts/set-password.js <usuario> <nueva-contrasena>
 *   node scripts/set-password.js <nueva-contrasena>   (mantiene el usuario actual)
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const credsPath = path.join(__dirname, '..', 'data', 'admin-credentials.json');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Uso: node scripts/set-password.js [usuario] <nueva-contrasena>');
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

let username = current.username;
let password;

if (args.length >= 2) {
  username = args[0];
  password = args[1];
} else {
  password = args[0];
}

const passwordHash = bcrypt.hashSync(password, 10);

const updated = {
  username,
  passwordHash,
  _nota: "Usuario y contrasena locales del administrador. Cambia usando: node scripts/set-password.js <usuario> <nueva-contrasena>"
};

fs.writeFileSync(credsPath, JSON.stringify(updated, null, 2));
console.log(`Credenciales actualizadas. Usuario: ${username}`);
