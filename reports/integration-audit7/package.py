from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil,json,hashlib,html
root=Path(__file__).resolve().parents[2];r=root/'reports/integration-audit7';out=Path('/workspace/shared/downloads/irena-20261023-audit7-integrated');out.mkdir(parents=True,exist_ok=True);stem='irena-REBORN-20261023-audit7-integrated'
shutil.copyfile(r/'REPORT.md',out/(stem+'-report.md'));shutil.copyfile(root/'irena-play.html',out/(stem+'-play.html'))
with ZipFile(out/(stem+'-data.zip'),'w',ZIP_DEFLATED) as z:
 for p in r.iterdir():
  if p.is_file() and p.suffix!='.zip':z.write(p,p.name)
with ZipFile(out/(stem+'-source.zip'),'w',ZIP_DEFLATED) as z:
 for p in root.rglob('*'):
  rel=p.relative_to(root)
  if not p.is_file() or str(rel)=='irena-play.html' or any(x in {'.git','node_modules','dist','artifacts','__pycache__'} for x in rel.parts):continue
  if rel.parts[0]=='reports' and p.suffix.lower() in {'.png','.jpg','.jpeg','.zip'}:continue
  z.write(p,Path('irena-reborn')/rel)
 for folder in ['assets-to-integrate','references','supplied-raid','transfer-inputs']:
  for p in (root.parent/folder).rglob('*'):
   if p.is_file():z.write(p,Path(folder)/p.relative_to(root.parent/folder))
 z.writestr('START-HERE.md','audit7：20階層＋audit6戦闘UI＋バランス調査。計算・保存仕様変更なし。\nirena-reborn内で npm run check / npm test / npm run build。\n素材照合のため隣接assets-to-integrate/supplied-raidを保持。詳しくはreports/integration-audit7/REPORT.md。\n')
with ZipFile(out/(stem+'-screenshots.zip'),'w',ZIP_DEFLATED) as z:
 for p in r.glob('*.jpg'):z.write(p,p.name)

for p in out.glob('*.zip'):
 with ZipFile(p) as z:assert z.testzip() is None
(out/'SHA256.json').write_text(json.dumps({p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in out.iterdir()if p.suffix in {'.zip','.html','.md'}},indent=2))
print(out)
