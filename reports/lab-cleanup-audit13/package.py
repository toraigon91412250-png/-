from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil,json,hashlib
root=Path(__file__).resolve().parents[2];r=root/'reports/lab-cleanup-audit13';out=Path('/workspace/shared/downloads/irena-20261024-audit13-lab-cleanup');out.mkdir(parents=True,exist_ok=True);stem='irena-REBORN-20261024-audit13-lab-cleanup'
shutil.copyfile(r/'REPORT.md',out/(stem+'-report.md'));shutil.copyfile(root/'irena-play.html',out/(stem+'-play.html'))
with ZipFile(out/(stem+'-source.zip'),'w',ZIP_DEFLATED) as z:
 for p in root.rglob('*'):
  rel=p.relative_to(root)
  if not p.is_file() or str(rel)=='irena-play.html' or any(x in {'.git','node_modules','dist','artifacts','__pycache__'} for x in rel.parts):continue
  if rel.parts[0]=='reports' and p.suffix.lower() in {'.png','.jpg','.jpeg','.zip'}:continue
  z.write(p,Path('irena-reborn')/rel)
 for folder in ['assets-to-integrate','references','supplied-raid','transfer-inputs','combat-ui-user-input']:
  for p in (root.parent/folder).rglob('*'):
   if p.is_file():z.write(p,Path(folder)/p.relative_to(root.parent/folder))
 z.writestr('START-HERE.md','audit13：採用済み比較カード撤去。audit12横流し演出・本編B・計算・セーブを維持。\nirena-reborn内で npm run check / npm test / npm run build。\n原本照合のため隣接提供素材フォルダを保持。reports/lab-cleanup-audit13/REPORT.md参照。\n')
with ZipFile(out/(stem+'-screenshots.zip'),'w',ZIP_DEFLATED) as z:
 for p in r.glob('*.jpg'):z.write(p,p.name)
for p in out.glob('*.zip'):
 with ZipFile(p) as z:assert z.testzip() is None
(out/'SHA256.json').write_text(json.dumps({p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in out.iterdir()if p.suffix in {'.zip','.html','.md'}},indent=2))
print(out)
