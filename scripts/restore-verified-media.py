"""Restore only audited, byte-identical reverted media; dry run by default."""
import hashlib, io, json, pathlib, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.storage-tools'))
from PIL import Image
REF = '694f6e96499be554dbba841fba250d9e06264f43'
def blob(name):
    return subprocess.check_output(['git', 'show', f'{REF}:{name}'], cwd=ROOT)
prior = json.loads(blob('media-optimization-result.json'))
changes = json.loads((ROOT/'reports/storage-reversion-audit.json').read_text())['changes']
quality = {r['path']:r for r in prior if r.get('eligible')}
results = []
for change in changes:
    name = change['path']
    current = (ROOT/name).read_bytes()
    candidate = blob(name)
    assert len(candidate) < len(current), name
    if name.endswith('.png'):
        q = quality[name]
        assert hashlib.sha256(current).hexdigest() == q['sha256Before'], name
        assert hashlib.sha256(candidate).hexdigest() == q['sha256After'], name
        assert q['psnrDb'] >= 38, name
        with Image.open(io.BytesIO(current)) as a, Image.open(io.BytesIO(candidate)) as b:
            assert a.size == b.size and a.format == b.format == 'PNG', name
        change['psnrDb'] = q['psnrDb']
    else:
        # Require the reverted video to be exactly the pre-optimization original.
        original = subprocess.check_output(['git','show',f'6dd636b:{name}'],cwd=ROOT)
        assert original == current, name
    change['sha256'] = hashlib.sha256(candidate).hexdigest()
    results.append((name,candidate,change))
# All checks finish before the first replacement.
if '--write' in sys.argv:
    for name, data, _ in results:
        (ROOT/name).write_bytes(data)
(ROOT/'reports/media-restoration.json').write_text(json.dumps([r for _,_,r in results],indent=2),encoding='utf8')
print(json.dumps({'restored':len(results) if '--write' in sys.argv else 0,'eligible':len(results),'savedBytes':sum(r['growth'] for _,_,r in results)}))
