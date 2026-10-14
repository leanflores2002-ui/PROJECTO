// Optional Ignored Build Step: node scripts/ignore-vercel-build.js
// 0 = skip, 1 = build. Unknown conditions always build.
// Do not activate until the remote root/build configuration is verified.
const {execFileSync} = require('node:child_process');
function shouldSkipBuild(env = process.env, runGit = execFileSync, platform = process.platform) {
  const previous = env.VERCEL_GIT_PREVIOUS_SHA;
  const current = env.VERCEL_GIT_COMMIT_SHA;
  if (![previous,current].every(s=>/^[a-f0-9]{40}$/i.test(s||''))) return false;
  try {
  // Never resolve an executable through an inherited, potentially writable PATH.
  const gitBinary = platform === 'win32'
    ? String.raw`C:\Program Files\Git\cmd\git.exe` : '/usr/bin/git';
  const safePath = platform === 'win32' ? String.raw`C:\Windows\System32` : '/usr/bin:/bin';
  const files = runGit(gitBinary,['diff','--no-ext-diff','--no-textconv','--name-only','-z',previous,current],{
    encoding:'utf8', cwd:require('node:path').resolve(__dirname,'..'),
    env:{PATH:safePath,GIT_CONFIG_NOSYSTEM:'1'}, timeout:10000, maxBuffer:1024*1024,
    shell:false
  }).split('\0').filter(Boolean);
  return files.length > 0 && files.every(f => /^(docs\/|tests\/|storage-audit-(before|after)\.(json|txt)$)/.test(f));
  } catch { return false; }
}
if (require.main === module) {
  const skip = shouldSkipBuild();
  console.log(skip ? 'Only docs/tests/audit reports changed; skip.' : 'Runtime or unknown changes; build.');
  process.exit(skip ? 0 : 1);
}
module.exports = {shouldSkipBuild};
