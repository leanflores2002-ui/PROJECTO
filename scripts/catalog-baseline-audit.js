// Read-only provenance report. Never rewrites the baseline or the catalog.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const file = 'frontend/public/assets/data/products.json';
const from = '94bf2e088dbef8f1d44fee19d67b94de8b808809';
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();
const read = revision => JSON.parse(git(['show', `${revision}:${file}`]));
function compare(before, after) {
  const a = new Map(before.map(p => [p.name, p]));
  const b = new Map(after.map(p => [p.name, p]));
  return {
    added: after.filter(p => !a.has(p.name)).map(p => p.name),
    removed: before.filter(p => !b.has(p.name)).map(p => p.name),
    modified: after.filter(p => a.has(p.name)).flatMap(p => {
      const q = a.get(p.name);
      const fields = [...new Set([...Object.keys(q), ...Object.keys(p)])].filter(k => JSON.stringify(q[k]) !== JSON.stringify(p[k]));
      return fields.length ? [{ name: p.name, fields, before: Object.fromEntries(fields.map(k => [k, q[k] ?? null])), after: Object.fromEntries(fields.map(k => [k, p[k] ?? null])) }] : [];
    })
  };
}
const current = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const committed = read('HEAD');
const history = git(['log', '--first-parent', '--reverse', '--format=%H', `${from}..HEAD`, '--', file]).split('\n').filter(Boolean).map(revision => ({
  revision, subject: git(['show', '-s', '--format=%s', revision]),
  ...compare(read(revision + '^'), read(revision))
}));
const report = { from, to: git(['rev-parse', 'HEAD']), beforeCount: read(from).length, afterCount: committed.length, ...compare(read(from), committed), workingTree: compare(committed, current), history };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/catalog-baseline-review.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ from, to: report.to, added: report.added, removed: report.removed, modified: report.modified.map(({ name, fields }) => ({ name, fields })), workingTree: report.workingTree.modified.map(({ name, fields }) => ({ name, fields })), history: history.map(({ revision, subject, added, removed, modified }) => ({ revision: revision.slice(0, 7), subject, added, removed, modified: modified.map(({ name, fields }) => ({ name, fields })) })) }, null, 2));
