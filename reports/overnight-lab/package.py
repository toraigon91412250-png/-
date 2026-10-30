"""Deliver the current prototype without stale or duplicate generated HTML in source ZIP."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys, shutil, json, hashlib
root=Path(__file__).resolve().parents[2]
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'artifacts'/'overnight'
out.mkdir(parents=True,exist_ok=True)
shutil.copy2(root/'irena-play.html',out/'irena-play.html')
with ZipFile(out/'irena-source.zip','w',ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        rel=p.relative_to(root)
        if not p.is_file() or any(x in {'node_modules','.git','artifacts','__pycache__','dist'} for x in rel.parts): continue
        if rel==Path('irena-play.html'): continue
        if rel.parts[0]=='reports' and p.suffix.lower() in {'.png','.jpg','.jpeg','.zip'}: continue
        z.write(p,Path('irena-reborn')/rel)
with ZipFile(out/'irena-deploy.zip','w',ZIP_DEFLATED) as z:
    z.write(root/'irena-play.html','index.html')
    z.writestr('README.txt','静的ホスト用。未公開です。index.htmlに画像・JS・CSSを統合済み。試作は実験場から起動し、本編セーブ非反映。試作進行は再読み込みでリセット。Safari実機とfile://起動は未確認。')
with ZipFile(out/'irena-review.zip','w',ZIP_DEFLATED) as z:
    for p in sorted((root/'reports'/'overnight-lab').rglob('*')):
        if p.is_file():z.write(p,Path('overnight-lab')/p.relative_to(root/'reports'/'overnight-lab'))
for name in ['irena-source.zip','irena-deploy.zip','irena-review.zip']:
    with ZipFile(out/name) as z:
        assert z.testzip() is None
        if name=='irena-source.zip':
            assert 'irena-reborn/web/src/utils/campaign20.js' in z.namelist()
            assert 'irena-reborn/tests/campaign20.test.js' in z.namelist()
            assert not any('/dist/' in f or f.endswith('/irena-play.html') for f in z.namelist())
        if name=='irena-deploy.zip':assert z.read('index.html')==(root/'irena-play.html').read_bytes()
for name in ['REPORT.md','verification.json','changed-files.json','recovery.json']:
    source=root/'reports'/'overnight-lab'/name
    if source.exists():shutil.copy2(source,out/name)
manifest={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir() if p.name in ['irena-play.html','irena-source.zip','irena-deploy.zip','irena-review.zip']}
(out/'SHA256.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
