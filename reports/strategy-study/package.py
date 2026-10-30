from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib,json,sys,shutil
root=Path(__file__).resolve().parents[2];study=root/'reports/strategy-study';out=Path('/workspace/shared/downloads/irena-strategy-study');out.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
if '--data-only' in sys.argv:
    files=sorted(study.rglob('*.jsonl'))
    files += sorted(study.glob('*/summary.*'))+[study/x for x in ['study-config.json','candidates.json','baseline-campaign20.txt','REPRODUCE.md','selection-route-pairs.json','paired-summary.json','analysis.json','actions.csv']]
    checks={str(p.relative_to(root)):{'bytes':p.stat().st_size,'sha256':sha(p)} for p in files}
    with ZipFile(out/'irena-study-data.zip','w',ZIP_DEFLATED,compresslevel=6) as z:
        for p in files:z.write(p,p.relative_to(root))
        z.writestr('DATA-MANIFEST.json',json.dumps(checks,indent=2))
        z.writestr('README.txt','ゲームソースZIPのirena-rebornフォルダへ展開するとreports/strategy-study/以下に全戦闘記録を復元します。変更前raw・修正のみA・蓄勢3倍B・再生1%C・独立シード・補助計測・実装後・同一初期状態比較を収録。シードと育成条件はstudy-config.json。必要なソースは別のirena-source.zip。')
    with ZipFile(out/'irena-study-data.zip') as z:assert z.testzip() is None
    (study/'data-manifest.json').write_text(json.dumps(checks,indent=2));print('data archive', (out/'irena-study-data.zip').stat().st_size);sys.exit(0)
shutil.copy2(root/'irena-play.html',out/'irena-play.html')
with ZipFile(out/'irena-source.zip','w',ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        rel=p.relative_to(root)
        if not p.is_file() or any(x in {'node_modules','.git','artifacts','__pycache__','dist'} for x in rel.parts) or rel==Path('irena-play.html'):continue
        if rel.parts[0]=='reports' and p.suffix.lower() in {'.png','.jpg','.jpeg','.zip','.jsonl'}:continue
        z.write(p,Path('irena-reborn')/rel)
with ZipFile(out/'irena-deploy.zip','w',ZIP_DEFLATED) as z:
    z.write(root/'irena-play.html','index.html');z.writestr('README.txt','未公開の静的ホスト用単体index.html。実験場の20階層試作は本編非反映・再読み込みでリセット。Safari実機は未確認。')
with ZipFile(out/'irena-review.zip','w',ZIP_DEFLATED) as z:
    for p in sorted(study.rglob('*')):
        if p.is_file() and p.suffix.lower() in {'.jpg','.png'}:z.write(p,Path('strategy-review')/p.relative_to(study))
    z.write(root/'REPORT-STRATEGY.md','REPORT-STRATEGY.md')
for name in ['irena-source.zip','irena-deploy.zip','irena-review.zip']:
    with ZipFile(out/name) as z:
        assert z.testzip() is None
        if name=='irena-source.zip':
            for f in ['web/src/utils/campaign20.js','tests/strategy-study.test.js','reports/strategy-study/study-config.json','reports/strategy-study/engine-metrics.mjs','REPORT-STRATEGY.md']:assert z.read('irena-reborn/'+f)==(root/f).read_bytes()
            assert not any(f.endswith('.jsonl') or '/dist/' in f or f.endswith('/irena-play.html') for f in z.namelist())
        if name=='irena-deploy.zip':assert z.read('index.html')==(root/'irena-play.html').read_bytes()
for file in [root/'REPORT-STRATEGY.md',study/'verification.json',study/'changed-files.json',study/'recovery.json']:
    if file.exists():shutil.copy2(file,out/file.name)
manifest={p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in out.iterdir() if p.name in ['irena-play.html','irena-source.zip','irena-deploy.zip','irena-study-data.zip','irena-review.zip']};(out/'SHA256.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
