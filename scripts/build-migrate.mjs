#!/usr/bin/env node
/**
 * Applies pending Prisma migrations, and only inside a Vercel build.
 *
 * `prisma migrate deploy` writes to whatever the schema's directUrl resolves to.
 * In a deploy that is the environment Vercel injects; on a developer machine it is
 * a local .env, which is routinely a copy of a deployed environment, so chaining
 * the step into `build` made the documented build command a write against a
 * database nobody chose. A deploy owns its own schema; locally, apply migrations
 * deliberately with `npm run db:migrate:deploy` against your own database.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function decideMigrateDeploy(env) {
  if (env.VERCEL || env.VERCEL_ENV) {
    return { run: true, reason: 'Vercel build, applying pending migrations.' };
  }

  return {
    run: false,
    reason:
      'Not a Vercel build, so the schema was left alone. ' +
      'Apply migrations to your own database with `npm run db:migrate:deploy`.',
  };
}

const invokedDirectly =
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const decision = decideMigrateDeploy(process.env);
  console.log(`[build] ${decision.reason}`);

  if (decision.run) {
    const prisma = fileURLToPath(new URL('../node_modules/.bin/prisma', import.meta.url));

    // Never fall through quietly: a deploy that skips its migrations ships a client
    // ahead of the columns it reads, and every query fails on the first request.
    if (!existsSync(prisma)) {
      console.error('[build] no prisma CLI in node_modules/.bin, cannot apply migrations.');
      process.exit(1);
    }

    const result = spawnSync(prisma, ['migrate', 'deploy'], { stdio: 'inherit' });
    process.exit(result.status ?? 1);
  }
}
