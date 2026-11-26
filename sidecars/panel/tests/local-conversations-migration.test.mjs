import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {discoverLocalConversations} from '../local-conversations.mjs';

const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const brainId='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

async function fixture(layout){
  const home=await mkdtemp(join(tmpdir(),'agy-conv-'));
  const gemini=join(home,'.gemini');
  const legacy=join(gemini,'antigravity-ide');
  const shared=join(gemini,'antigravity');
  if(layout.migration)await mkdir(join(legacy),{recursive:true}),await writeFile(join(legacy,'.ide_migration'),'{}');
  if(layout.legacyConversations){await mkdir(join(legacy,'conversations'),{recursive:true});await writeFile(join(legacy,'conversations',id+'.db'),'');}
  if(layout.legacyBrain)await mkdir(join(legacy,'brain',brainId),{recursive:true});
  if(layout.sharedConversations){await mkdir(join(shared,'conversations'),{recursive:true});await writeFile(join(shared,'conversations',id+'.db'),'');}
  if(layout.sharedBrain)await mkdir(join(shared,'brain',brainId),{recursive:true});
  return home;
}

test('IDE host discovers migrated cross-project conversations in ~/.gemini/antigravity',async()=>{
  const home=await fixture({migration:true,sharedConversations:true,sharedBrain:true});
  try{
    const result=await discoverLocalConversations({host:'ide',home});
    assert.equal(result.errors,0);
    const ids=result.conversations.map(c=>c.id.toLowerCase());
    assert.ok(ids.includes(id),'migrated .db conversation must be discovered');
    assert.ok(ids.includes(brainId),'migrated brain directory must be discovered');
  }finally{await rm(home,{recursive:true,force:true});}
});

test('IDE host keeps scanning the legacy antigravity-ide tree while it still holds conversations',async()=>{
  const home=await fixture({legacyConversations:true});
  try{
    const result=await discoverLocalConversations({host:'ide',home});
    const ids=result.conversations.map(c=>c.id.toLowerCase());
    assert.ok(ids.includes(id),'legacy conversation must still be discovered');
  }finally{await rm(home,{recursive:true,force:true});}
});

test('IDE host falls back to ~/.gemini/antigravity when legacy subdirs are gone even without the marker',async()=>{
  const home=await fixture({sharedConversations:true});
  try{
    const result=await discoverLocalConversations({host:'ide',home});
    const ids=result.conversations.map(c=>c.id.toLowerCase());
    assert.ok(ids.includes(id),'unified root must be scanned when antigravity-ide is empty');
  }finally{await rm(home,{recursive:true,force:true});}
});

test('app host is unaffected by the IDE migration fallback',async()=>{
  const home=await fixture({migration:true,legacyConversations:true,sharedConversations:true});
  try{
    const result=await discoverLocalConversations({host:'app',home});
    const ids=result.conversations.map(c=>c.id.toLowerCase());
    assert.ok(ids.includes(id));
    assert.equal(result.errors,0);
  }finally{await rm(home,{recursive:true,force:true});}
});
