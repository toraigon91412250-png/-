"""Package the committed divinity build without touching earlier backups."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--extras-root', type=Path, default=root.parent)
args = parser.parse_args()

def git(*arguments):
    return subprocess.check_output(['git', *arguments], cwd=root, text=True).strip()

if git('status', '--porcelain'):
    raise SystemExit('Commit the reviewed source and reports before packaging.')
if not (root / 'dist/index.html').is_file():
    raise SystemExit('Run npm run build first.')
for engine in ('chromium', 'webkit'):
    result = json.loads((root / f'reports/divinity-rebuild/{engine}/browser-results.json').read_text())
    if result['errors'] or len(result['checks']) < 250:
        raise SystemExit(f'Incomplete browser verification: {engine}')

out = args.output.resolve()
out.mkdir(parents=True, exist_ok=False)
commit = git('rev-parse', 'HEAD')
project = 'irena-divinity-rebuild'
entries = []
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')[:-1]
for name in tracked:
    if name.startswith('dist/') or name == 'irena-play.html':
        continue
    entries.append((root / name, f'{project}/{name}'))
for dirname in ('assets-to-integrate', 'combat-ui-user-input', 'supplied-raid'):
    directory = args.extras_root / dirname
    if not directory.is_dir():
        raise SystemExit(f'Missing original test assets: {directory}')
    entries.extend((path, f'{dirname}/{path.relative_to(directory)}') for path in directory.rglob('*') if path.is_file())

manifest = {'commit': commit, 'publishedBase': '2252d7c21a448e6aa9633ca28faeae5fb0167344',
            'excludedGenerated': ['dist/', 'irena-play.html'], 'files': []}
with zipfile.ZipFile(out / 'irena-divinity-full-source.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for path, name in entries:
        data = path.read_bytes()
        manifest['files'].append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        archive.writestr(name, data)
    archive.writestr('SOURCE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    archive.writestr('README-復元.txt', 'ZIPを新しいフォルダへ展開してください。\n'
                      'irena-divinity-rebuild と3つの画像照合用フォルダを同じ親フォルダに置きます。\n'
                      'irena-divinity-rebuild 内で npm ci / npm test / npm run check / npm run build を実行します。\n'
                      'README-DIVINITY.md に遊び方と検証方法があります。\n'
                      'Git履歴は別添の irena-divinity-history.bundle から復元できます。\n')

subprocess.run(['git', 'bundle', 'create', str(out / 'irena-divinity-history.bundle'),
                'feature/divinity-rebuild', 'main'], cwd=root, check=True)
subprocess.run(['git', 'bundle', 'verify', str(out / 'irena-divinity-history.bundle')], cwd=root, check=True)
shutil.copy2(root / 'irena-play.html', out / 'irena-play.html')
shutil.copy2(root / 'reports/divinity-rebuild/REPORT.md', out / '検証報告.md')
shutil.copy2(root / 'README-DIVINITY.md', out / '遊び方と開発手順.md')
(out / 'RESTORE.txt').write_text(
    f'いれーな REBORN 失われた神格 再構築版\nコミット: {commit}\n公開更新なし。基準はversion 34。\n\n'
    'ソース: irena-divinity-full-source.zip を新しい場所に展開。\n'
    'Git履歴: git clone -b feature/divinity-rebuild irena-divinity-history.bundle irena-history\n'
    'Git履歴にもソース・素材・ビルド結果を含みます。元の45コミットを保持しています。\n'
    '元の画像照合テストを実行する場合は、完全ソースZIPに同梱した3つの画像フォルダを'
    'irena-historyの親フォルダへ置いてください。\n'
    'ブラウザ起動: ソース内で python3 -m http.server 8765 を実行し、http://localhost:8765/ を開く。\n'
    '単体版: irena-play.html は画像内包版。iPhoneはHTTP経由で開いてください。\n', encoding='utf-8')

with zipfile.ZipFile(out / 'irena-divinity-full-source.zip') as archive:
    if archive.testzip() is not None:
        raise SystemExit('Source ZIP integrity failed.')
    for item in manifest['files']:
        if hashlib.sha256(archive.read(item['path'])).hexdigest() != item['sha256']:
            raise SystemExit(f'Content mismatch: {item["path"]}')
delivery = {'commit': commit, 'sourceFilesVerified': len(entries), 'files': []}
for path in sorted(out.iterdir()):
    if path.is_file():
        delivery['files'].append({'name': path.name, 'bytes': path.stat().st_size,
                                  'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
(out / 'DELIVERY-MANIFEST.json').write_text(json.dumps(delivery, ensure_ascii=False, indent=2))
print(json.dumps(delivery, ensure_ascii=False, indent=2))
