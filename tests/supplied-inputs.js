import fs from 'node:fs';
import path from 'node:path';

// Uploaded source art is kept under migration-inputs/ in this checkout. Older
// audit manifests used paths relative to the original handoff directory, so
// resolve those references here while still accepting the historical location.
export function suppliedInput(reference){
 const direct=path.resolve(reference);
 if(fs.existsSync(direct))return direct;
 const migrated=path.resolve('migration-inputs',reference.replace(/^\.\.\//,''));
 if(fs.existsSync(migrated))return migrated;
 throw new Error(`Supplied input is missing: ${reference} (also checked ${migrated})`);
}
