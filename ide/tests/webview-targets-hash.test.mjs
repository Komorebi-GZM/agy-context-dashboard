import test from 'node:test';
import assert from 'node:assert/strict';
import {backendUrl} from '../webview-targets.mjs';

const ok='http://127.0.0.1:7000/c/11111111-1111-1111-1111-111111111111?extensionView=true&extensionVariant=vs-code&useWebSocket=true&platform=electron';

test('backendUrl accepts the IDE 1.13 session-token fragment #t=<hex>',()=>{
  for(const hash of ['', '#'+'t='+'a'.repeat(32), '#t='+'0f1e2d3c4b5a6978'.repeat(2), '#t='+'A'.repeat(16), '#t='+'ab'.repeat(64)]){
    const u=backendUrl(ok+hash);
    if(hash==='#t='+'ab'.repeat(64)){ // 128 hex chars is the upper bound, still valid
      assert.ok(u,'expected #t=<128hex> to be accepted');
      assert.equal(u.hash,hash);
    }else{
      assert.ok(u,'expected hash '+JSON.stringify(hash)+' to be accepted');
      if(hash)assert.equal(u.hash,hash);
    }
  }
});

test('backendUrl still rejects every other fragment',()=>{
  for(const hash of ['#untrusted','#t='+'a'.repeat(8),'#t='+'a'.repeat(200),'#t=zzzz','#fragment','#t','#tabcdef0123456789;url']){
    assert.equal(backendUrl(ok+hash),null,'expected hash '+JSON.stringify(hash)+' to be rejected');
  }
});

test('backendUrl rejects non-token fragments on non-composer paths too',()=>{
  assert.equal(backendUrl('http://127.0.0.1:7000/?extensionView=true&extensionVariant=vs-code&useWebSocket=true&platform=electron#untrusted'),null);
});
