import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// `prisma migrate deploy` writes to whatever the schema's directUrl resolves to,
// and off a deploy that resolves from a local .env. These pin the one rule that
// keeps the documented build command from writing to a database it did not choose:
// the schema deploy belongs to the Vercel build and runs nowhere else.

const appRoot = new URL('../../', import.meta.url);
const gateModule = '../build-migrate.mjs';

const buildScript: string = JSON.parse(
  readFileSync(fileURLToPath(new URL('package.json', appRoot)), 'utf8'),
).scripts.build;

describe('the build script', () => {
  it('reaches the schema deploy only through the gate', () => {
    expect(buildScript).toContain('node scripts/build-migrate.mjs');
    expect(buildScript).not.toContain('prisma migrate deploy');
  });
});

describe('decideMigrateDeploy', () => {
  it('deploys the schema inside a Vercel build', async () => {
    const { decideMigrateDeploy } = await import(gateModule);

    expect(decideMigrateDeploy({ VERCEL: '1', VERCEL_ENV: 'production' }).run).toBe(true);
  });

  it('skips on a developer machine, whatever the database url points at', async () => {
    const { decideMigrateDeploy } = await import(gateModule);

    expect(
      decideMigrateDeploy({
        DATABASE_URL_UNPOOLED: 'postgresql://user:pw@db.example.com/app?sslmode=require',
      }).run,
    ).toBe(false);
  });

  it('skips in continuous integration that is not a Vercel build', async () => {
    const { decideMigrateDeploy } = await import(gateModule);

    expect(decideMigrateDeploy({ CI: 'true', GITHUB_ACTIONS: 'true' }).run).toBe(false);
  });
});

describe('the gate as the build runs it', () => {
  it('exits clean off a deploy without opening a connection', () => {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('scripts/build-migrate.mjs', appRoot))],
      {
        // A URL no client can reach: if the gate ever spawned prisma here, the
        // step would fail rather than pass, so a green run means it never ran.
        env: {
          NODE_ENV: 'production',
          PATH: process.env.PATH ?? '',
          DATABASE_URL: 'postgresql://user:pw@127.0.0.1:1/unreachable',
          DATABASE_URL_UNPOOLED: 'postgresql://user:pw@127.0.0.1:1/unreachable',
        },
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('npm run db:migrate:deploy');
  });
});
