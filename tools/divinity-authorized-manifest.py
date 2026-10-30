# Explicitly record the approved reconstruction for existing historical integrity tests.
from pathlib import Path
import subprocess,json,hashlib
root=Path(__file__).resolve().parent.parent
files=['web/src/components/App.js','web/src/components/game.css','web/src/utils/gameCore.js','web/src/utils/progression.js','web/src/utils/main20.js','web/src/utils/storage.js','web/src/utils/battleCheckpoint.js','web/src/utils/campaign20.js','tools/build.mjs','web/src/utils/mirrorTrial.js']
sha=lambda b:hashlib.sha256(b).hexdigest()
out={}
for name in files:
 before=subprocess.check_output(['git','show','2252d7c21a448e6aa9633ca28faeae5fb0167344:'+name],cwd=root);after=(root/name).read_bytes()
 out[name]={'before':before.decode(),'beforeSHA256':sha(before),'afterSHA256':sha(after)}
(root/'reports/divinity-rebuild/authorized-changes.json').write_text(json.dumps(out,ensure_ascii=False))
