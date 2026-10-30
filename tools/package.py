"""Package self-contained deliverables using only Python's standard library."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json, shutil
root=Path(__file__).resolve().parents[1]
out=root/'artifacts'
out.mkdir(exist_ok=True)
shutil.copy2(root/'irena-play.html',out/'irena-play.html')
with ZipFile(out/'irena-deploy.zip','w',ZIP_DEFLATED) as z:
    for p in sorted((root/'dist').rglob('*')):
        if p.is_file(): z.write(p,p.relative_to(root/'dist'))
    z.writestr('README-HOSTING.txt','index.html を含むこのZIPを静的ホストへ配置してください。\nゲームにサーバーやAPIキーは不要です。\n画像・CSS・JavaScriptはindex.htmlへ統合済み。\n保存はブラウザlocalStorageとJSONバックアップを使用。\nSafari実機とfile://起動は未検証です。\n')
with ZipFile(out/'irena-source.zip','w',ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        rel=p.relative_to(root)
        review_image=(rel.parts[0]=='reports' and p.suffix.lower() in {'.png','.jpg','.jpeg'})
        if p.is_file() and not review_image and not any(x in {'node_modules','.git','artifacts','__pycache__'} for x in rel.parts):
            z.write(p,Path('irena-reborn')/rel)
# Full-size audit evidence is delivered separately to keep the editable project practical on phones.
with ZipFile(out/'irena-review.zip','w',ZIP_DEFLATED) as z:
    for section in ['ui-review','quality-evolution','three-phase','home-ui']:
        for p in sorted((root/'reports'/section).rglob('*')):
            if p.is_file(): z.write(p,Path('irena-review')/section/p.relative_to(root/'reports'/section))
for name in ['irena-source.zip','irena-deploy.zip','irena-review.zip']:
    with ZipFile(out/name) as z:
        invalid=z.testzip()
        if invalid: raise RuntimeError('Corrupted ZIP entry: '+invalid)
        if name=='irena-deploy.zip':
            assert 'index.html' in z.namelist()
            assert z.read('index.html')==(root/'irena-play.html').read_bytes()
        elif name=='irena-source.zip':
            for required in ['package.json','README.md','tools/build.mjs','web/src/utils/gameCore.js','tests/core.test.js']:
                assert 'irena-reborn/'+required in z.namelist()
manifest={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.iterdir()) if p.name in {'irena-play.html','irena-source.zip','irena-deploy.zip','irena-review.zip'}}
(out/'SHA256.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'zip_integrity':'3/3 passed','files':manifest},indent=2))
