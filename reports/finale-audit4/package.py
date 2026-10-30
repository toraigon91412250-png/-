from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json,hashlib,shutil
root=Path(__file__).resolve().parents[2];version='20261023-audit4-finale';out=Path('/workspace/shared/downloads/irena-'+version);out.mkdir(parents=True,exist_ok=True);stem='irena-REBORN-'+version;r=root/'reports/finale-audit4'
shutil.copy2(root/'irena-play.html',out/(stem+'-play.html'));shutil.copy2(r/'REPORT.md',out/(stem+'-report.md'))
with ZipFile(out/(stem+'-source.zip'),'w',ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or str(rel)=='irena-play.html' or any(x in {'.git','node_modules','dist','artifacts','__pycache__'} for x in rel.parts):continue
  if rel.parts[0]=='reports' and p.suffix.lower() in {'.jpg','.jpeg','.png','.zip'}:continue
  if str(rel) in {'reports/authority-art-audit2/implement.py','reports/tactical-marks-audit3/update-manifest.py','reports/finale-audit4/implement.py','reports/finale-audit4/update-manifest.py','reports/finale-audit4/gacha-check.mjs'}:continue
  z.write(p,Path('irena-reborn')/rel)
 for folder in ['assets-to-integrate','references','supplied-raid']:
  for p in sorted((root.parent/folder).rglob('*')):
   if p.is_file():z.write(p,Path(folder)/p.relative_to(root.parent/folder))
 z.writestr('START-HERE-'+version+'.md','''最新ローカル版: 20261023-audit4-finale。公開サイトへは未反映です。

irena-rebornへ移動し npm run check / npm test / npm run build。Node.js・Python3を使用。コアテストとビルドは依存追加不要。
単体HTMLは irena-play.html、静的公開用の同一HTMLはdist/index.htmlへ生成します。
assets-to-integrate と supplied-raid は irena-reborn と同じ階層に置いてください。提供原画像との同一性テストで使用します。
今回の納品用パッケージ作成は python3 reports/finale-audit4/package.py。
詳細は reports/finale-audit4/REPORT.md、verification.json、source.diff。
最終決戦の3モード/既存フラグ/報酬/セーブ/刻印は保持。試作「熾竜・崩鎧試練」は実験場限定です。
ブラウザ検証の再実行にはPlaywright/Chromiumが別途必要。browser.mjsのlocalhostポート4192と実行環境のブラウザパスを確認してください。
''')
with ZipFile(out/(stem+'-screenshots.zip'),'w',ZIP_DEFLATED) as z:
 for p in sorted(r.glob('*.jpg')):
  if p.name.startswith('gacha-debug'):continue
  z.write(p,p.name)
 z.write(r/'REPORT.md','REPORT.md')
for p in out.glob('*.zip'):
 with ZipFile(p) as z:assert z.testzip() is None
for name in ['verification.json','images.json','balance.json','browser.json','hub-unlocked-390.jpg','raid-battle-390.jpg','summon-reveal-320.jpg','trial-victory-390.jpg']:
 if (r/name).exists():shutil.copy2(r/name,out/name)
(out/'SHA256.json').write_text(json.dumps({p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir()if p.suffix in {'.html','.zip','.md'}},indent=2))
print(out)
