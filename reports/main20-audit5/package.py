from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json,hashlib,shutil
root=Path(__file__).resolve().parents[2];version='20261023-audit5-main20';out=Path('/workspace/shared/downloads/irena-'+version);out.mkdir(parents=True,exist_ok=True);stem='irena-REBORN-'+version;r=root/'reports/main20-audit5'
shutil.copy2(root/'irena-play.html',out/(stem+'-play.html'));shutil.copy2(r/'REPORT.md',out/(stem+'-report.md'))
with ZipFile(out/(stem+'-source.zip'),'w',ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or str(rel)=='irena-play.html' or any(x in {'.git','node_modules','dist','artifacts','__pycache__'} for x in rel.parts):continue
  if rel.parts[0]=='reports' and p.suffix.lower() in {'.jpg','.jpeg','.png','.zip'}:continue
  z.write(p,Path('irena-reborn')/rel)
 for folder in ['assets-to-integrate','references','supplied-raid']:
  for p in sorted((root.parent/folder).rglob('*')):
   if p.is_file():z.write(p,Path(folder)/p.relative_to(root.parent/folder))
 z.writestr('START-HERE.md','20階層本編 audit5。irena-rebornで npm run check / npm test / npm run build。依存追加なしで実行可能。\nassets-to-integrate と supplied-raid は irena-reborn と同じ階層に保持。\n旧セーブは本アプリで自動変換されます。新セーブversion5は旧アプリでは使用不可。reports/main20-audit5/REPORT.mdを参照。\n')
with ZipFile(out/(stem+'-screenshots.zip'),'w',ZIP_DEFLATED) as z:
 for p in sorted(r.glob('*.jpg')):z.write(p,p.name)
 z.write(r/'REPORT.md','REPORT.md')
for p in out.glob('*.zip'):
 with ZipFile(p) as z:assert z.testzip() is None
(out/'SHA256.json').write_text(json.dumps({p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir()if p.suffix in {'.html','.zip','.md'}},indent=2))
print(out)
