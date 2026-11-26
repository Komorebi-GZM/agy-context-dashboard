import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');

test('VSIX allowlist covers every runtime module imported by the IDE entrypoints',async()=>{
  const packagePy=await readFile(resolve(root,'ide/package.py'),'utf8');
  const compatMatch=packagePy.match(/MODULES = \[f'compat\/\{name\}' for name in \[([^\]]+)\]/);
  assert.ok(compatMatch,'compat MODULES list must exist in ide/package.py');
  const listed=new Set(compatMatch[1].split(',').map(s=>s.trim().replace(/^'|'$/g,'')));
  const ideMatch=packagePy.match(/MODULES \+= \[f'ide\/\{name\}' for name in \[([^\]]+)\]/);
  assert.ok(ideMatch);
  const listedIde=new Set(ideMatch[1].split(',').map(s=>s.trim().replace(/^'|'$/g,'')));

  // The two modules reported missing in issue #119 must be packed.
  assert.ok(listed.has('host-theme.mjs'),'compat/host-theme.mjs missing from MODULES');
  assert.ok(listed.has('remote-ssh.mjs'),'compat/remote-ssh.mjs missing from MODULES');

  // Every relative import reachable from the IDE entrypoint stays packed.
  const main=await readFile(resolve(root,'ide/main.mjs'),'utf8');
  const runtimeUi=await readFile(resolve(root,'compat/runtime-ui.mjs'),'utf8');
  for(const [source,dir] of [[main,'ide'],[runtimeUi,'compat']]){
    for(const m of source.matchAll(/from '(\.[^']+)'/g)){
      const rel=m[1].replace(/^\.\//,dir+'/').replace(/^\.\.\//,'');
      assert.ok(listed.has(rel.split('/').pop())||listedIde.has(rel.split('/').pop())||rel.startsWith('sidecars/panel/')||rel.startsWith('node:'),
        `imported module ${rel} (from ${dir}) is not in ide/package.py MODULES`);
    }
  }

  // publish-release.py verifies the same two compat modules inside the VSIX.
  const publish=await readFile(resolve(root,'tools/publish-release.py'),'utf8');
  for(const name of ['compat/host-theme.mjs','compat/remote-ssh.mjs']){
    assert.ok(publish.includes(`'${name}'`),`${name} missing from tools/publish-release.py verification list`);
  }
});
