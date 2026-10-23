import { spawnSync } from 'node:child_process';
import process from 'node:process';

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const run = spawnSync('npx', ['playwright', 'test', 'tests/e2e/screenshots.spec.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, MINDMESH_SCREENSHOTS: '1' },
});

process.exit(run.status ?? 1);
