from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json,shutil
root=Path(__file__).resolve().parents[2];out=Path('/workspace/shared/downloads/irena-20261023-audit3-marks');out.mkdir(parents=True,exist_ok=True)
version='20261023-audit3-marks';stem='irena-REBORN-'+version;r=root/'reports/tactical-marks-audit3'
shutil.copy2(root/'irena-play.html',out/(stem+'-play.html'));shutil.copy2(r/'REPORT.md',out/(stem+'-report.md'))
with ZipFile(out/(stem+'-source.zip'),'w',ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or str(rel)=='irena-play.html' or any(x in {'.git','node_modules','dist','artifacts','__pycache__'} for x in rel.parts):continue
  if rel.parts[0]=='reports' and p.suffix.lower() in {'.jpg','.jpeg','.png','.zip'}:continue
  if str(rel) in {'reports/authority-art-audit2/implement.py','reports/tactical-marks-audit3/update-manifest.py'}:continue
  z.write(p,Path('irena-reborn')/rel)
 for folder in ['assets-to-integrate','references']:
  for p in sorted((root.parent/folder).rglob('*')):
   if p.is_file():z.write(p,Path(folder)/p.relative_to(root.parent/folder))
 z.writestr('START-HERE-'+version+'.md','''最新版: 20261023-audit3-marks。刻印7種を再設計、既存3種維持。公開していません。

irena-rebornで npm run check / npm test / npm run build。Node.js・Python3が必要。コアの検証・ビルドは依存追加不要です。
単体HTMLは irena-play.html に生成されます。assets-to-integrateはirena-rebornと同じ階層に置いてください（原画像照合テストで使用）。
ブラウザ検証はPlaywright/Chromiumが必要。今回の最小検証スクリプトには実行環境のブラウザパスを記載しています。
詳細: irena-reborn/reports/tactical-marks-audit3/REPORT.md / verification.json。
旧セーブの刻印ID・所持・装備・実績は保持。新刻印の本編戦闘は任意markBattle項目で再開します。今後エンジンを変更する際は復元用schemaの扱いを確認してください。
''')
with ZipFile(out/(stem+'-source.zip')) as z:assert z.testzip() is None
for name in ['marks-390.jpg','marks-320.jpg','verification.json','balance.json']:
 if (r/name).exists():shutil.copy2(r/name,out/name)
(out/'SHA256.json').write_text(json.dumps({p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in out.iterdir()if p.suffix in {'.zip','.html','.md'}},indent=2))
print(out)
