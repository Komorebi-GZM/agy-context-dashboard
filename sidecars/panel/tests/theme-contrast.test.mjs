import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');

test('dark palette keeps high-contrast accent variables as fallback',async()=>{
  const theme=createRequire(import.meta.url)(resolve(root,'compat/theme.cjs'))();
  // The palette constants themselves are only reachable via the css text.
  const dark=theme.css('#probe');
  for(const value of ['#85a8ff','#7ea5ff','#7688b2']){
    assert.ok(dark.includes(value),`built-in dark accent ${value} must stay available as fallback`);
  }
});

test('host --primary is contrast-checked against surfaces before use',async()=>{
  const source=await readFile(resolve(root,'compat/theme.cjs'),'utf8');
  // The primary picked from the host DOM must be validated with the existing
  // contrast() helper (minimum 2.5:1) or dropped in favour of the palette.
  assert.ok(source.includes('<2.5)primary=null'), 'theme.cjs must drop host --primary below 2.5:1 contrast');
  assert.ok(/Math\.min\(\.\.\.surfaces\.map\(surface=>contrast\(primary,surface\)\)\)/.test(source),
    'contrast check must measure primary against the resolved surfaces');
  assert.ok(source.includes("hostColor(['--primary','--color-primary'])"),'guard must apply to the host --primary variable');
});
