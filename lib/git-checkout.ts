/**
 * Whether a directory sits inside any git working tree. The contact export uses
 * it to keep its CSV, which holds personal contact details, out of every
 * repository a commit could carry it from, this checkout included.
 */

import { spawnSync } from 'node:child_process';

/**
 * The environment minus its GIT_* variables: a commit hook's GIT_DIR would make
 * git answer for that repository instead of the directory it was pointed at.
 */
export function envWithoutGit(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_')) delete env[key];
  }
  return env;
}

/**
 * Asks git from the directory itself, so a symlink into a checkout counts as
 * inside it. A git that cannot run is an error, never a pass.
 */
export function isInsideGitCheckout(dir: string): boolean {
  const result = spawnSync('git', ['-C', dir, 'rev-parse', '--is-inside-work-tree'], {
    env: envWithoutGit(),
    encoding: 'utf8',
  });
  if (result.error) {
    throw new Error(`Could not run git to check where ${dir} is: ${result.error.message}`);
  }
  return result.status === 0;
}
