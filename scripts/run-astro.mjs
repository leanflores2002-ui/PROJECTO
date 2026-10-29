import { spawnSync } from 'node:child_process';

process.env.ASTRO_TELEMETRY_DISABLED = '1';
const command = process.platform === 'win32' ? 'astro.cmd' : 'astro';
const result = spawnSync(command, process.argv.slice(2), {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
