from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[2]
source=root.parent/'backup/irena-REBORN-20261023-audit2-art-source.zip'
changed={}
with zipfile.ZipFile(source) as z:
 for folder in ['web','tests','tools']:
  for p in (root/folder).rglob('*'):
   key=str(p.relative_to(root));name='irena-reborn/'+key
   if not p.is_file() or name not in z.namelist():continue
   old=z.read(name);new=p.read_bytes()
   if old!=new:changed[key]={'before':old.decode(),'beforeSHA256':hashlib.sha256(old).hexdigest(),'afterSHA256':hashlib.sha256(new).hexdigest()}
(root/'reports/tactical-marks-audit3/authorized-changes.json').write_text(json.dumps(changed,ensure_ascii=False,indent=2))
