#!/usr/bin/env node
/**
 * sync-payload-types.mjs — vendoriza los tipos de Payload desde `cms-estaciones`.
 *
 * Baja `src/payload-types.ts` del repo del CMS en un ref FIJADO
 * (`payload-types.lock.json`, mismo espíritu que un package-lock) y lo
 * materializa en `src/types/payload.ts`. Sin monorepo y sin registry privado.
 *
 * Usos:
 *   node scripts/sync-payload-types.mjs           → escribe/actualiza el archivo
 *   node scripts/sync-payload-types.mjs --check   → CI: falla si hay drift
 *
 * Estrategia: `git -C <repoPath> show <ref>:<sourcePath>`. Así se lee el archivo
 * exactamente en el commit fijado, sin depender del working tree del CMS — que
 * puede tener cambios de esquema a medio hacer.
 *
 * Para subir el pin: actualizar `ref` en el lock y correr `pnpm sync:types`. El
 * ref es un commit del CMS, así que el bump es explícito y revisable en el diff.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const cwd = process.cwd();
const lockPath = path.join(cwd, 'payload-types.lock.json');

function fail(msg) {
  console.error(`[sync-types] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(lockPath)) fail(`No existe ${lockPath}`);
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

const repoPath = path.resolve(cwd, lock.repoPath);
const ref = lock.ref;
const sourcePath = lock.sourcePath;
const targetPath = path.join(cwd, lock.targetPath);

if (!fs.existsSync(repoPath)) {
  fail(
    `No encuentro el repo del CMS en ${repoPath}. Clona ${lock.repo} como repo hermano ` +
      'o ajusta `repoPath` en el lock.',
  );
}

let contenidoUpstream;
try {
  contenidoUpstream = execFileSync('git', ['-C', repoPath, 'show', `${ref}:${sourcePath}`], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  fail(`No pude leer ${sourcePath} en el ref ${ref}: ${err.message}`);
}

// Quitar la augmentation `declare module 'payload' { ... }` del final: requiere el
// paquete `payload`, que este front NO instala, y solo consumimos las interfaces
// exportadas (Noticia, Especiale, Cancione, ...), no GeneratedTypes.
const contenidoSinAugment = contenidoUpstream.replace(
  /\n*declare module ['"]payload['"]\s*\{[\s\S]*$/,
  '\n',
);

const encabezado = [
  '/* ⚠️ GENERADO — NO EDITAR A MANO.',
  ` * Vendorizado desde ${lock.repo}:${sourcePath} en el ref ${ref}.`,
  ' * Regenerar con: pnpm sync:types  (el pin vive en payload-types.lock.json).',
  " * Nota: se quita la augmentation `declare module 'payload'` del upstream",
  ' *       (el front no instala el paquete payload; solo usa las interfaces).',
  ' */',
  '',
].join('\n');

const contenidoFinal = encabezado + contenidoSinAugment;
const modo = process.argv.includes('--check') ? 'check' : 'write';

if (modo === 'check') {
  if (!fs.existsSync(targetPath)) fail(`Falta ${lock.targetPath}. Corre: pnpm sync:types`);
  const actual = fs.readFileSync(targetPath, 'utf8');
  if (actual !== contenidoFinal) {
    fail(
      `DRIFT: ${lock.targetPath} no coincide con ${lock.repo}@${ref.slice(0, 8)}. ` +
        'Corre: pnpm sync:types',
    );
  }
  console.log(`[sync-types] OK — sin drift (${lock.repo}@${ref.slice(0, 8)}).`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, contenidoFinal, 'utf8');
console.log(`[sync-types] Escrito ${lock.targetPath} desde ${lock.repo}@${ref.slice(0, 8)}.`);
