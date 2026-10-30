from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil,hashlib,json
root=Path(__file__).resolve().parents[2];out=Path('/workspace/shared/downloads/irena-polish');out.mkdir(parents=True,exist_ok=True)
shutil.copy2(root/'irena-play.html',out/'irena-play.html');shutil.copy2(root/'reports/polish/REPORT.md',out/'REPORT.md')
with ZipFile(out/'irena-source.zip','w',ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or any(x in {'node_modules','.git','dist','__pycache__','artifacts'} for x in rel.parts) or str(rel)=='irena-play.html':continue
  if rel.parts[0]=='reports' and p.suffix.lower() in {'.jpg','.jpeg','.png','.zip','.jsonl'}:continue
  z.write(p,Path('irena-reborn')/rel)
with ZipFile(out/'irena-deploy.zip','w',ZIP_DEFLATED) as z:z.write(root/'irena-play.html','index.html')
with ZipFile(out/'irena-polish-data.zip','w',ZIP_DEFLATED) as z:
 for label in ['polish-training','polish-holdout']:
  for p in (root/'reports/strategy-study'/label).iterdir():z.write(p,p.relative_to(root))
 z.write(root/'reports/polish/balance-comparison.json','reports/polish/balance-comparison.json')
with ZipFile(out/'irena-review.zip','w',ZIP_DEFLATED) as z:
 for p in (root/'reports/polish').rglob('*.jpg'):z.write(p,p.relative_to(root))
 z.write(root/'reports/polish/REPORT.md','REPORT.md')
for p in out.glob('*.zip'):
 with ZipFile(p) as z:assert z.testzip() is None
for name in ['cinema-SSR.jpg','ten-results.jpg']:
 shutil.copy2(root/'reports/polish/chromium'/name,out/name)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(out/'SHA256.json').write_text(json.dumps({p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in out.iterdir() if p.suffix in {'.zip','.html'}},indent=2))
print((out/'SHA256.json').read_text())
