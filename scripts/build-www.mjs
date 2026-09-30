// Priprema www/ za native aplikaciju (Capacitor): kopira index.html.
// Server (server.js) i ostali fajlovi NE idu u aplikaciju.
// Pokretanje: npm run cap:sync   (build-www + npx cap sync)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
console.log('www/ spreman:', fs.readdirSync(out).join(', '));
