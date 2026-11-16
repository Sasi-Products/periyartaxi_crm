import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const list = [];
function scan(path) {
  for (const item of readdirSync(path, { withFileTypes: true })) {
    const entry = join(path, item.name);
    if (item.isDirectory()) scan(entry);
    else if (/\.(jsx|js)$/.test(entry)) list.push(entry);
  }
}
for (const dir of ['src','scripts','public']) scan(join(root, dir));
list.push(join(root,'vite.config.js'));
let errors=0;
for (const file of list) {
  const source=readFileSync(file,'utf8');
  if (/\bmodule\.exports\b|\brequire\s*\(|\bimportScripts\s*\(/.test(source)) {
    console.error('Legacy module statement in',file);errors++;
  }
}
console.log(`Checked ${list.length} frontend files for legacy module statements.`);
if(errors)process.exitCode=1;
