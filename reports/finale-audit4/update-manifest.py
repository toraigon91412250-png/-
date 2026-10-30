from pathlib import Path
import hashlib,json,zipfile
r=Path(__file__).resolve().parents[2];source=r.parent/'backup/irena-REBORN-20261023-audit3-marks-source.zip';changes={};hashes={}
with zipfile.ZipFile(source) as z:
 for name in z.namelist():
  if not name.startswith('irena-reborn/'):continue
  rel=name.removeprefix('irena-reborn/');p=r/rel
  if not p.is_file() or not (rel.startswith(('web/','tests/','tools/','assets/')) or rel in ['index.html','package.json']):continue
  old=z.read(name);new=p.read_bytes();hashes[rel]=hashlib.sha256(old).hexdigest()
  if old!=new:changes[rel]={'before':old.decode(),'beforeSHA256':hashlib.sha256(old).hexdigest(),'afterSHA256':hashlib.sha256(new).hexdigest()}
(r/'reports/finale-audit4/authorized-changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2));(r/'reports/finale-audit4/baseline-files.json').write_text(json.dumps(hashes,indent=2))
