/* node で動かす同期の暗号化テスト（scripts/test-sync-crypt.mjs が esbuild でまとめて実行）。本物の GitHub にはつながない。 */
import {encryptJson,decryptJson,KeyMismatchError,isEnvelope} from '../../src/lib/sync-crypto';
import {mergeBooks} from '../../src/lib/book-merge';
import {emptyBook,emptyRecord,type Book} from '../../src/lib/model';
import * as gs from '../../src/lib/gist-sync';
// @ts-expect-error plain JS helper
import {MockGitHub} from '../mock-gist-api.mjs';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};
const store=new Map<string,string>();
(globalThis as any).localStorage={getItem:(k:string)=>store.has(k)?store.get(k)!:null,setItem:(k:string,v:string)=>{store.set(k,String(v));},removeItem:(k:string)=>{store.delete(k);}};

// テスト専用の偽キー（本物ではない）
const T1='ghp_TESTONLY_'+'a'.repeat(30),T2='ghp_TESTONLY_'+'b'.repeat(30),TX='ghp_TESTONLY_'+'x'.repeat(30);

function sampleBook(tag:string):Book{
  const b:Book=structuredClone(emptyBook);
  b.profile.name1='けんじ';b.profile.name2='みさき';
  b.records['A必1']={...emptyRecord,status:'learned',note:`${tag} メモ 秘密の内容`,updatedAt:'2026-09-01T00:00:00.000Z'};
  b.memories=[{id:'m1',date:'2026-09-01',title:'はじめての記念',text:`${tag} 記念`,kind:'memory',complete:false}];
  b.futari.days['2026-09-30']={cardId:'D01',mode:'answer',n1:{text:'けんじの答え',guess:'',changed:'',result:'',at:'2026-09-30T01:00:00.000Z'},n2:null};
  b.board.notes=[{id:'b1',who:'n1',text:'掲示板メモ1',pinned:false,at:'2026-09-29T00:00:00.000Z',updatedAt:'2026-09-29T00:00:00.000Z',editedAt:''}];
  return b;
}

async function main(){
  // --- 暗号化 ---
  const payload=gs.buildPayload(sampleBook('A'),5);
  const env=await encryptJson(T1,payload);
  const envText=JSON.stringify(env);
  ok('envelope shape',isEnvelope(env)&&env.alg==='AES-256-GCM'&&env.kdf==='HKDF-SHA256');
  ok('ciphertext has no plaintext (memo / board / futari / names)',!/秘密の内容|掲示板メモ|けんじ|futari-miraicho|A必1/.test(envText));
  ok('envelope has no key material',!envText.includes(T1)&&!envText.includes('TESTONLY'));
  const back=await decryptJson([T1],env);
  ok('roundtrip same payload',JSON.stringify(back.value)===JSON.stringify(payload)&&back.index===0);
  const env2=await encryptJson(T1,payload);
  ok('fresh salt + iv every time',env2.salt!==env.salt&&env2.iv!==env.iv&&env2.ct!==env.ct);
  let mism=false;try{await decryptJson([T2],env);}catch(e){mism=e instanceof KeyMismatchError;}
  ok('wrong key → KeyMismatchError (not garbage)',mism);
  const prev=await decryptJson([T2,T1],env);
  ok('previous key fallback (index 1)',prev.index===1);
  const tampered={...env,ct:env.ct.slice(0,-4)+(env.ct.endsWith('AAAA')?'BBBB':'AAAA')};
  let tam='';try{await decryptJson([T1],tampered);}catch(e){tam=e instanceof KeyMismatchError?'mismatch':'tamper';}
  ok('tampered ciphertext rejected',tam==='tamper');

  // --- 合流（消さない） ---
  const a=sampleBook('A'),b=sampleBook('B');
  a.records['A必3']={...emptyRecord,status:'done',checkMale:true,checkFemale:true,updatedAt:'2026-09-02T00:00:00.000Z'};
  b.records['A必1']={...b.records['A必1'],status:'applied',updatedAt:'2026-09-05T00:00:00.000Z'};
  b.memories.push({id:'m2',date:'2026-09-02',title:'Bの記念',text:'',kind:'dream',complete:false});
  b.futari.days['2026-09-30']={cardId:'D01',mode:'answer',n1:null,n2:{text:'みさきの答え',guess:'',changed:'',result:'',at:'2026-09-30T02:00:00.000Z'}};
  b.board.notes.push({id:'b2',who:'n2',text:'掲示板メモ2',pinned:true,at:'2026-09-30T00:00:00.000Z',updatedAt:'2026-09-30T00:00:00.000Z',editedAt:''});
  a.board.deleted={b0:'2026-09-28T00:00:00.000Z'};
  b.board.notes.push({id:'b0',who:'n2',text:'消したメモ',pinned:false,at:'2026-09-27T00:00:00.000Z',updatedAt:'2026-09-27T00:00:00.000Z',editedAt:''});
  b.events=[{id:'e1',title:'婚姻届',date:'2026-11-22',note:'',who:'both',updatedAt:'2026-09-03T00:00:00.000Z'}];
  b.profile.ward='中区';
  const m=mergeBooks(a,b);
  ok('merge keeps both records (newer wins per item)',m.records['A必3']?.status==='done'&&m.records['A必1']?.status==='applied');
  ok('merge keeps memories from both',m.memories.some(x=>x.id==='m1')&&m.memories.some(x=>x.id==='m2'));
  ok('merge keeps both futari answers',m.futari.days['2026-09-30']?.n1?.text==='けんじの答え'&&m.futari.days['2026-09-30']?.n2?.text==='みさきの答え');
  ok('merge keeps board notes from both, deleted stays deleted',m.board.notes.some(n=>n.id==='b1')&&m.board.notes.some(n=>n.id==='b2')&&!m.board.notes.some(n=>n.id==='b0'));
  ok('merge keeps events + fills empty profile',m.events.length===1&&m.profile.ward==='中区'&&m.profile.name1==='けんじ');

  // --- Gist の読み書き（まねの API） ---
  const gh=new MockGitHub({[T1]:'kenji',[TX]:'stranger'});
  (globalThis as any).fetch=gh.fetch;
  const LEGACY='1'.repeat(32);
  gh.seed({id:LEGACY,owner:'kenji',files:{[gs.LEGACY_FILENAME]:JSON.stringify(gs.buildPayload(sampleBook('OLD'),7))}});
  store.set(gs.GIST_SYNC_KEY_V1,JSON.stringify({token:T1,gistId:LEGACY,enabled:true}));
  let cfg=gs.readSyncConfig();
  ok('old settings carried over (key kept, old gist becomes read-only source)',cfg.token===T1&&cfg.enabled&&cfg.gistId===''&&cfg.legacyGistId===LEGACY);
  cfg=gs.writeSyncConfig(cfg);
  ok('device id created',/^[0-9a-f]{16}$/.test(cfg.deviceId));
  const d0=await gs.discoverGists(T1);
  ok('discover finds old gist by key (no id in the app)',d0.legacy[0]?.id===LEGACY&&d0.encrypted.length===0);
  const strangerView=await gs.discoverGists(TX);
  ok('other accounts do not see it in their list',strangerView.legacy.length===0);
  const leg=await gs.pullLegacy(T1,LEGACY);
  ok('legacy plaintext loads',leg.payload?.book.records['A必1']?.note.includes('OLD')===true&&!leg.missing);
  const id=await gs.createEncryptedGist(cfg,gs.buildPayload(leg.payload!.book,8));
  cfg=gs.writeSyncConfig({...cfg,gistId:id});
  const created=gh.gists.get(id);
  ok('new gist is secret and holds ciphertext only (incl. its whole history)',created.public===false&&Object.keys(created.files).join()===gs.ENC_FILENAME&&created.history.every((h:any)=>!/OLD|けんじ|futari-miraicho/.test(JSON.stringify(h))));
  ok('nothing written to the old gist',gh.log.filter((l:any)=>l.path===`/gists/${LEGACY}`&&l.method!=='GET').length===0);
  const pulled=await gs.pullEncrypted(cfg);
  ok('encrypted pull decodes',pulled.payload?.revision===8&&pulled.payload.book.records['A必1']?.note.includes('OLD')===true);
  ok('device list recorded inside the ciphertext',Object.keys(pulled.payload?.devices||{}).includes(cfg.deviceId));
  const anon=await gh.fetch(`https://api.github.com/gists/${id}`);
  const anonText=await anon.text();
  ok('anyone with the id sees only ciphertext',anon.status===200&&!/OLD|けんじ|秘密/.test(anonText));
  // 古い版が新しい同期先に平文を足してしまった場合
  gh.gists.get(id).files[gs.LEGACY_FILENAME]={filename:gs.LEGACY_FILENAME,content:JSON.stringify(gs.buildPayload(sampleBook('STRAY'),3))};
  const stray=await gs.pullEncrypted(cfg);
  ok('stray plaintext in the new gist is detected',stray.strayPlain?.book.records['A必1']?.note.includes('STRAY')===true);
  await gs.pushEncrypted(cfg,gs.buildPayload(stray.payload!.book,9),{dropStrayPlain:true});
  ok('stray plaintext removed on next push',!gh.gists.get(id).files[gs.LEGACY_FILENAME]);
  const lastPush=gh.log.filter((l:any)=>l.method==='PATCH').pop();
  ok('push body is ciphertext only',!!lastPush&&!/OLD|けんじ|STRAY|秘密/.test(lastPush.body));
  // 違うキー
  const wrong={...cfg,token:T2,prevToken:''};
  gh.users[T2]='kenji';
  let km=false;try{await gs.pullEncrypted(wrong);}catch(e){km=e instanceof KeyMismatchError;}
  ok('different key on the other phone → KeyMismatchError',km);
  // キーの切りかえ：前のキーで開ける
  const rotated=gs.writeSyncConfig({...cfg,token:T2});
  ok('key change keeps previous key for reading',rotated.prevToken===T1&&rotated.token===T2);
  const rp=await gs.pullEncrypted(rotated);
  ok('reads data sealed with previous key',rp.usedPrevKey===true&&rp.payload?.revision===9);
  gs.writeSyncConfig({...rotated,token:T1});
  // 削除の安全装置
  let refused=false;try{await gs.deleteLegacyGist({...cfg,legacyGistId:id});}catch{refused=true;}
  ok('refuses to delete the encrypted gist as "legacy"',refused&&gh.gists.has(id));
  await gs.deleteLegacyGist({...cfg,legacyGistId:LEGACY});
  ok('old gist deleted (mock) with its history',!gh.gists.has(LEGACY));
  const gone=await gs.pullLegacy(T1,LEGACY);
  ok('after deletion, legacy reported missing',gone.missing);
  gs.forgetLegacyConfig();
  ok('old settings (with the old id) forgotten',!store.has(gs.GIST_SYNC_KEY_V1));

  // 古い同期先が「空の置き場所」（book:null・revision 0）でも、エラーにせず空として扱う。中身が壊れた手帳はエラーのまま。
  const EMPTY='f'.repeat(32),BROKEN='d'.repeat(32);
  gh.seed({id:EMPTY,owner:'kenji',files:{[gs.LEGACY_FILENAME]:JSON.stringify({format:'futari-miraicho',version:1,revision:0,book:null,savedAt:'2026-09-01T00:00:00.000Z'})}});
  gh.seed({id:BROKEN,owner:'kenji',files:{[gs.LEGACY_FILENAME]:JSON.stringify({format:'futari-miraicho',version:1,revision:0,book:{profile:'壊れた'},savedAt:'2026-09-01T00:00:00.000Z'})}});
  let emptyErr='';let emptyLeg:Awaited<ReturnType<typeof gs.pullLegacy>>|null=null;
  try{emptyLeg=await gs.pullLegacy(T1,EMPTY);}catch(e){emptyErr=String(e);}
  ok('empty legacy placeholder (book null, revision 0) → payload null, no error',!emptyErr&&!!emptyLeg&&emptyLeg.payload===null&&!emptyLeg.missing);
  ok('isEmptyLegacyPayload: missing book + revision 0 → empty; revision>0 or a book → not',gs.isEmptyLegacyPayload({format:'futari-miraicho',version:1,revision:0})&&!gs.isEmptyLegacyPayload({format:'futari-miraicho',revision:3,book:null})&&!gs.isEmptyLegacyPayload({format:'futari-miraicho',revision:0,book:{}})&&!gs.isEmptyLegacyPayload(null));
  let brokenErr='';try{await gs.pullLegacy(T1,BROKEN);}catch(e){brokenErr=String(e);}
  ok('malformed non-empty legacy book still errors',brokenErr.includes('同期先の手帳データが正しくありません'));
  let nullRevErr='';gh.seed({id:'c'.repeat(32),owner:'kenji',files:{[gs.LEGACY_FILENAME]:JSON.stringify({format:'futari-miraicho',version:1,revision:5,book:null})}});
  try{await gs.pullLegacy(T1,'c'.repeat(32));}catch(e){nullRevErr=String(e);}
  ok('book null with revision>0 still errors (not a fresh placeholder)',nullRevErr.includes('同期先の手帳データが正しくありません'));

  console.log(`\nsync-crypt tests: ${pass} passed, ${fail} failed`);
  if(fail)process.exit(1);
}
main().catch(e=>{console.error(e);process.exit(1);});
