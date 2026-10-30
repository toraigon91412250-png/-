from pathlib import Path
import difflib,json,hashlib
base=Path('/workspace/irena-strategy/irena-reborn');f='web/src/components/App.js';a=(base/f).read_text().splitlines(True);b=Path(f).read_text().splitlines(True)
patches=[{'old':''.join(a[g[0][1]:g[-1][2]]),'new':''.join(b[g[0][3]:g[-1][4]])} for g in difflib.SequenceMatcher(None,a,b).get_grouped_opcodes(2)]
Path('reports/polish/app-patches.json').write_text(json.dumps(patches,ensure_ascii=False,indent=2))
f='web/src/components/game.css';before=(base/f).read_bytes();now=Path(f).read_bytes();Path('reports/polish/css-baseline.json').write_text(json.dumps({'previousBytes':len(before),'previousSHA256':hashlib.sha256(before).hexdigest(),'currentSHA256':hashlib.sha256(now).hexdigest()},indent=2))
files=['web/src/components/App.js','web/src/components/game.css','tests/home-ui.test.js','tests/campaign20.test.js'];Path('reports/polish/approved-ui-hashes.json').write_text(json.dumps({f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in files},indent=2))
