from pathlib import Path
import hashlib,json,difflib
root=Path(__file__).resolve().parents[2];old=Path('/workspace/irena-overnight/irena-reborn');out=root/'reports/strategy-study';base=json.loads((out/'baseline-files.json').read_text());sha=lambda p:hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
allowed=['web/src/utils/campaign20.js','web/src/components/campaign20View.js','irena-play.html']
checks={file:sha(root/file)==h for file,h in base.items() if file not in allowed};assert all(checks.values());(out/'protection.json').write_text(json.dumps(checks,indent=2))
modified=[];added=[];deleted=[];diff=[]
for p in sorted(old.rglob('*')):
 rel=p.relative_to(old)
 if not p.is_file() or any(x in {'.git','artifacts','node_modules','__pycache__'} for x in rel.parts):continue
 q=root/rel
 if not q.exists():deleted.append(str(rel));continue
 if p.read_bytes()!=q.read_bytes():
  modified.append(str(rel))
  if rel.parts[0]=='web':diff.extend(difflib.unified_diff(p.read_text().splitlines(True),q.read_text().splitlines(True),fromfile='before/'+str(rel),tofile='after/'+str(rel)))
for p in sorted(root.rglob('*')):
 rel=p.relative_to(root)
 if p.is_file() and not any(x in {'.git','artifacts','node_modules','__pycache__'} for x in rel.parts) and not (old/rel).exists():added.append(str(rel))
assets={str(p.relative_to(root)) for p in (root/'assets').rglob('*') if p.is_file()};oldassets={str(p.relative_to(old)) for p in (old/'assets').rglob('*') if p.is_file()};assert assets==oldassets
(out/'source.diff').write_text(''.join(diff));(out/'changed-files.json').write_text(json.dumps({'modified':modified,'added':added,'deleted':deleted,'runtimeModified':[f for f in modified if f.startswith('web/')],'newGameAssets':[]},ensure_ascii=False,indent=2));print('protected',len(checks),'runtimeModified',[f for f in modified if f.startswith('web/')])
