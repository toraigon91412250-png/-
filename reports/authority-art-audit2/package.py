from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json,hashlib,shutil
root=Path(__file__).resolve().parents[2];parent=root.parent;report=root/'reports/authority-art-audit2';version='20261023-audit2-art';out=Path('/workspace/shared/downloads/irena-'+version);out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
html=f'irena-REBORN-{version}-play.html';source=f'irena-REBORN-{version}-source.zip';review=f'irena-REBORN-{version}-screenshots.zip'
shutil.copy2(root/'irena-play.html',out/html);shutil.copy2(report/'REPORT.md',out/f'irena-REBORN-{version}-report.md')
with ZipFile(out/source,'w',ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or str(rel)=='irena-play.html' or any(x in {'.git','node_modules','artifacts','__pycache__','dist'} for x in rel.parts):continue
  if rel.parts[0]=='reports' and p.suffix.lower() in {'.png','.jpg','.jpeg','.zip'}:continue
  if str(rel)=='reports/authority-art-audit2/implement.py':continue
  z.write(p,Path('irena-reborn')/rel)
 for folder in ['assets-to-integrate','references']:
  for p in sorted((parent/folder).rglob('*')):
   if p.is_file():z.write(p,Path(folder)/p.relative_to(parent/folder))
 z.writestr('START-HERE-20261023-audit2-art.md','最新版: 20261023-audit2-art。権能画像5枚を導入。audit1履歴はreportsに保持。公開していません。\n\nirena-rebornへ移動し npm run check / npm test / npm run build。追加インストール不要。単体HTMLはirena-play.htmlへ出力。\nassets-to-integrateはirena-rebornと同じ階層に保持してください。画像原本照合テストで使用します。\n詳細: irena-reborn/reports/authority-art-audit2/REPORT.md と verification.json。\n版名付き納品の再作成には reports/authority-art-audit2/package.py を使用。旧tools/package.pyは未組込素材の外側フォルダを扱いません。\n')
with ZipFile(out/review,'w',ZIP_DEFLATED) as z:
 for p in sorted(report.rglob('*.jpg')):z.write(p,p.relative_to(report))
 z.write(report/'REPORT.md','REPORT.md')
for p in [out/source,out/review]:
 with ZipFile(p) as z:assert z.testzip() is None
with ZipFile(out/source) as z:
 for image in json.loads((report/'images.json').read_text()):
  assert z.read('irena-reborn/'+image['runtime'])==z.read(image['original'].removeprefix('../'))
 assert z.read('irena-reborn/web/src/utils/gameCore.js')==(root/'web/src/utils/gameCore.js').read_bytes()
for name in ['verification.json','changed-files.json','images.json']:
 if (report/name).exists():shutil.copy2(report/name,out/name)
for name in ['chromium/list-390.jpg','chromium/detail-fallen-390.jpg','before-list-390.jpg']:
 if (report/name).exists():shutil.copy2(report/name,out/Path(name).name)
(out/'SHA256.json').write_text(json.dumps({p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in out.iterdir() if p.suffix in {'.zip','.html','.md'}},indent=2))
print(json.dumps({'output':str(out),'source':source,'html':html,'htmlSHA256':sha(out/html)},indent=2))
