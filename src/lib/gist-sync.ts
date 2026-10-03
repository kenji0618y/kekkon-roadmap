import {bookSchema,type Book} from './model';
import {validateCatalogBook} from './backup';
import {decryptJson,encryptJson,isEnvelope,KeyMismatchError} from './sync-crypto';

/**
 * 端末どうしの同期（GitHub の秘密 Gist）。
 *
 * 2026-10 から中身は暗号化（sync-crypto.ts）。秘密 Gist は URL を知っていればログインなしで読めるため、
 * 同期先に置くのは暗号文だけ。同期先の ID はビルド（公開される JS）にもドキュメントにも書かない：
 * アクセス用のキーで「自分の Gist 一覧」から、暗号化ファイル名（ENC_FILENAME）を持つものを探す。
 *
 * 古い版（平文の futari-miraicho.json）からの移行：
 *   - 古い同期先には二度と書かない（古い版のスマホが平文で上書きしても、新しい同期先には届かない）。
 *   - 移行中は古い同期先を「読むだけ」して、古い版のスマホの書き込みを取り込む（use-book.ts）。
 *   - 二人とも新しい版になったら、設定の「古い同期先を削除する」で消す（履歴ごと消えるのは削除だけ）。
 */

/** 旧設定（平文の同期先・v1）。移行のために読むだけ。古い同期先を削除したら消す。 */
export const GIST_SYNC_KEY_V1='futari-gist-sync-v1';
/** 新設定（暗号化した同期先）。キーはこの端末の中だけ。 */
export const GIST_SYNC_KEY='futari-gist-sync-v2';
export const LEGACY_FILENAME='futari-miraicho.json';
export const ENC_FILENAME='futari-sync.enc.json';
const ENC_DESCRIPTION='Amityちゃんにきく · sync (encrypted)';
const API='https://api.github.com';
const GIST_ID_RE=/^[0-9a-f]{20,40}$/i;

export type GistSyncConfig={
  token:string;
  /** 暗号化した同期先。空なら一覧から探す（なければ移行時に作る）。 */
  gistId:string;
  enabled:boolean;
  /** 移行中だけ：古い平文の同期先。読むだけ。 */
  legacyGistId:string;
  /** 古い同期先を最後に取り込んだときの updated_at。 */
  legacySeen:string;
  /** キーを新しくした直後だけ：前のキー（古い暗号文を開くため。新しいキーで送り直したら消す）。 */
  prevToken:string;
  /** この端末の印（二人とも新しい版になったかを数えるため）。 */
  deviceId:string;
};
export type SyncStatus='off'|'ok'|'error'|'syncing';
export type DeviceSeen={who:string,at:string};

export type GistPayload={
  format:'futari-miraicho';
  version:1;
  revision:number;
  book:Book;
  savedAt:string;
  updatedAt:string;
  devices?:Record<string,DeviceSeen>;
};

const blank=():GistSyncConfig=>({token:'',gistId:'',enabled:false,legacyGistId:'',legacySeen:'',prevToken:'',deviceId:''});
const str=(v:unknown)=>typeof v==='string'?v.trim():'';
const gid=(v:unknown)=>{const s=str(v);return GIST_ID_RE.test(s)?s:'';};

export function readSyncConfig():GistSyncConfig{
  try{
    const raw=localStorage.getItem(GIST_SYNC_KEY);
    if(raw){
      const d=JSON.parse(raw) as Partial<GistSyncConfig>;
      return {token:str(d.token),gistId:gid(d.gistId),enabled:Boolean(d.enabled),legacyGistId:gid(d.legacyGistId),legacySeen:str(d.legacySeen),prevToken:str(d.prevToken),deviceId:str(d.deviceId)};
    }
    // 旧設定からの引き継ぎ：キーとオン/オフはそのまま、古い同期先は「読むだけ」の移行元にする。
    const old=localStorage.getItem(GIST_SYNC_KEY_V1);
    if(old){
      const d=JSON.parse(old) as {token?:unknown,gistId?:unknown,enabled?:unknown};
      return {...blank(),token:str(d.token),enabled:Boolean(d.enabled),legacyGistId:gid(d.gistId)};
    }
  }catch{/* ignore */}
  return blank();
}

function newDeviceId(){
  const a=new Uint8Array(8);globalThis.crypto.getRandomValues(a);
  return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
}

export function writeSyncConfig(config:Partial<GistSyncConfig>&{token:string}):GistSyncConfig{
  const prev=readSyncConfig();
  const token=config.token.trim();
  // キーが変わったら、前のキーを一時的に残す（相手の端末がまだ前のキーで暗号化していても開けるように）。
  let prevToken=str(config.prevToken??prev.prevToken);
  if(prev.token&&token&&prev.token!==token)prevToken=prev.token;
  if(prevToken===token)prevToken='';
  const next:GistSyncConfig={
    token,
    gistId:gid(config.gistId??prev.gistId),
    enabled:Boolean(config.enabled??prev.enabled),
    legacyGistId:gid(config.legacyGistId??prev.legacyGistId),
    legacySeen:str(config.legacySeen??prev.legacySeen),
    prevToken,
    deviceId:str(config.deviceId??prev.deviceId)||prev.deviceId||newDeviceId(),
  };
  localStorage.setItem(GIST_SYNC_KEY,JSON.stringify(next));
  return next;
}

/** 古い同期先がなくなったら、旧設定（平文の同期先の ID が入っている）も消す。 */
export function forgetLegacyConfig(){try{localStorage.removeItem(GIST_SYNC_KEY_V1);}catch{/* ignore */}}

export function buildPayload(book:Book,revision:number,savedAt?:string):GistPayload{
  const now=new Date().toISOString();
  return {format:'futari-miraicho',version:1,revision,book,savedAt:savedAt||now,updatedAt:now};
}

/** 古い同期先に残っていた「空の置き場所」（手帳なし・revision 0）。中身がないだけなので、読めないのではなく空として扱う。 */
export function isEmptyLegacyPayload(raw:unknown){
  if(!raw||typeof raw!=='object')return false;
  const d=raw as Record<string,unknown>;
  return d.format==='futari-miraicho'&&(d.book===null||d.book===undefined)&&(Number(d.revision)||0)===0;
}

function parsePayload(raw:unknown):GistPayload{
  if(!raw||typeof raw!=='object')throw new Error('同期先の内容が空です。');
  const data=raw as Record<string,unknown>;
  if(data.format!=='futari-miraicho')throw new Error('対応する同期形式ではありません。');
  const parsed=bookSchema.safeParse(data.book);
  if(!parsed.success)throw new Error('同期先の手帳データが正しくありません。');
  const book=validateCatalogBook(parsed.data);
  const revision=Number(data.revision)||0;
  const savedAt=typeof data.savedAt==='string'?data.savedAt:'';
  const updatedAt=typeof data.updatedAt==='string'?data.updatedAt:savedAt;
  const devices:Record<string,DeviceSeen>={};
  if(data.devices&&typeof data.devices==='object'){
    for(const [k,v] of Object.entries(data.devices as Record<string,unknown>).slice(0,20)){
      const d=v as Partial<DeviceSeen>;
      if(/^[0-9a-f]{8,32}$/.test(k)&&typeof d?.at==='string')devices[k]={who:typeof d.who==='string'?d.who.slice(0,4):'',at:d.at.slice(0,40)};
    }
  }
  return {format:'futari-miraicho',version:1,revision,book,savedAt,updatedAt,devices};
}

export class GistHttpError extends Error{
  status:number;
  constructor(status:number,message:string){super(message);this.status=status;this.name='GistHttpError';}
}

async function api(path:string,token:string,init:RequestInit={}):Promise<Response>{
  if(!token)throw new Error('アクセス用のキー（GitHub）を入力してください。');
  const headers=new Headers(init.headers);
  headers.set('Accept','application/vnd.github+json');
  headers.set('Authorization',`Bearer ${token}`);
  headers.set('X-GitHub-Api-Version','2022-11-28');
  if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  const res=await fetch(`${API}${path}`,{...init,headers,cache:'no-store'});
  if(!res.ok){
    let detail='';
    try{
      const err=await res.json() as {message?:string};
      detail=err.message?`（${err.message}）`:'';
    }catch{/* ignore */}
    if(res.status===401)throw new GistHttpError(401,`GitHub に入れませんでした。アクセス用のキー（gist の権限つき）を確かめてください${detail}`);
    if(res.status===404)throw new GistHttpError(404,`同期先が見つかりません${detail}`);
    if(res.status===403)throw new GistHttpError(403,`アクセスが拒否されました${detail}`);
    throw new GistHttpError(res.status,`GitHub のエラー (${res.status})${detail}`);
  }
  return res;
}

type GistFile={content?:string,truncated?:boolean,raw_url?:string};
type GistData={id?:string,files?:Record<string,GistFile>,updated_at?:string,created_at?:string};

async function fetchGist(token:string,id:string):Promise<GistData>{
  const res=await api(`/gists/${encodeURIComponent(id)}`,token);
  return await res.json() as GistData;
}
async function fileText(token:string,file:GistFile|undefined):Promise<string>{
  if(!file)return '';
  let content=file.content||'';
  if((file.truncated||!content)&&file.raw_url){
    const raw=await fetch(file.raw_url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github.raw'},cache:'no-store'});
    if(!raw.ok)throw new Error('同期先の内容を取得できませんでした。');
    content=await raw.text();
  }
  return content;
}

export type Discovery={encrypted:{id:string,created:string}[],legacy:{id:string,updated:string}[]};
/** 自分の Gist 一覧から、同期先（暗号化）と古い同期先（平文）を探す。 */
export async function discoverGists(token:string):Promise<Discovery>{
  const out:Discovery={encrypted:[],legacy:[]};
  for(let page=1;page<=5;page++){
    const res=await api(`/gists?per_page=100&page=${page}`,token);
    const list=await res.json() as GistData[];
    if(!Array.isArray(list))break;
    for(const g of list){
      const names=Object.keys(g.files||{});
      if(!g.id)continue;
      if(names.includes(ENC_FILENAME))out.encrypted.push({id:g.id,created:g.created_at||''});
      else if(names.includes(LEGACY_FILENAME))out.legacy.push({id:g.id,updated:g.updated_at||''});
    }
    if(list.length<100)break;
  }
  // いちばん古い暗号化の同期先を正とする（二台が同時に作っても、同じものにそろう）。
  out.encrypted.sort((a,b)=>a.created.localeCompare(b.created)||a.id.localeCompare(b.id));
  out.legacy.sort((a,b)=>b.updated.localeCompare(a.updated));
  return out;
}

let knownDevices:Record<string,DeviceSeen>={};
export function seenDevices(){return {...knownDevices};}
function myWho(){try{const v=localStorage.getItem('futari-me-v1')||'';return v==='n1'||v==='n2'?v:'';}catch{return '';}}

export type EncryptedPull={
  payload:GistPayload|null;
  /** 前のキーで開いた（新しいキーで送り直す必要がある）。 */
  usedPrevKey:boolean;
  /** 暗号化の同期先に、古い版が平文を書き足していた。取り込んで消す。 */
  strayPlain:GistPayload|null;
};

/** 暗号化した同期先を読む。キーが合わなければ KeyMismatchError（このときは絶対に送らない）。 */
export async function pullEncrypted(config:GistSyncConfig):Promise<EncryptedPull>{
  if(!config.gistId)throw new Error('同期先がまだありません。');
  const data=await fetchGist(config.token,config.gistId);
  const files=data.files||{};
  let strayPlain:GistPayload|null=null;
  if(files[LEGACY_FILENAME]){
    try{strayPlain=parsePayload(JSON.parse(await fileText(config.token,files[LEGACY_FILENAME])));}catch{strayPlain=null;}
  }
  if(!files[ENC_FILENAME])throw new Error('この同期先は暗号化に対応していません。');
  const text=await fileText(config.token,files[ENC_FILENAME]);
  if(!text)return {payload:null,usedPrevKey:false,strayPlain};
  const env=JSON.parse(text) as unknown;
  if(!isEnvelope(env))throw new Error('同期先の内容が暗号化されていません。');
  const {value,index}=await decryptJson([config.token,config.prevToken],env);
  const payload=parsePayload(value);
  knownDevices={...knownDevices,...payload.devices};
  return {payload,usedPrevKey:index>0,strayPlain};
}

async function sealed(token:string,payload:GistPayload,deviceId:string){
  const devices={...knownDevices,...payload.devices};
  if(deviceId)devices[deviceId]={who:myWho(),at:new Date().toISOString()};
  knownDevices=devices;
  const env=await encryptJson(token,{...payload,devices});
  return JSON.stringify(env);
}

/** 暗号化して送る。平文は送らない。 */
export async function pushEncrypted(config:GistSyncConfig,payload:GistPayload,opts:{dropStrayPlain?:boolean}={}):Promise<void>{
  if(!config.gistId)throw new Error('同期先がまだありません。');
  const files:Record<string,{content:string}|null>={[ENC_FILENAME]:{content:await sealed(config.token,payload,config.deviceId)}};
  if(opts.dropStrayPlain)files[LEGACY_FILENAME]=null;
  await api(`/gists/${encodeURIComponent(config.gistId)}`,config.token,{method:'PATCH',body:JSON.stringify({files})});
}

/** 暗号化した同期先を新しく作る（中身は最初から暗号文だけ）。 */
export async function createEncryptedGist(config:GistSyncConfig,payload:GistPayload):Promise<string>{
  const body={description:ENC_DESCRIPTION,public:false,files:{[ENC_FILENAME]:{content:await sealed(config.token,payload,config.deviceId)}}};
  const res=await api('/gists',config.token,{method:'POST',body:JSON.stringify(body)});
  const data=await res.json() as {id?:string};
  if(!data.id)throw new Error('同期先を作れませんでした。');
  return data.id;
}

/** 二台が同時に作ってしまった、自分の作った空の重複だけを消す。 */
export async function deleteOwnDuplicate(config:GistSyncConfig,id:string,keepId:string){
  if(!id||id===keepId)return;
  const g=await fetchGist(config.token,id);
  const names=Object.keys(g.files||{});
  if(names.length!==1||names[0]!==ENC_FILENAME)return;
  await api(`/gists/${encodeURIComponent(id)}`,config.token,{method:'DELETE'});
}

export type LegacyPull={payload:GistPayload|null,updatedAt:string,missing:boolean};
/** 古い（平文の）同期先を読むだけ。消えていれば missing。 */
export async function pullLegacy(token:string,id:string):Promise<LegacyPull>{
  try{
    const data=await fetchGist(token,id);
    const files=data.files||{};
    if(files[ENC_FILENAME])return {payload:null,updatedAt:'',missing:true};
    const text=await fileText(token,files[LEGACY_FILENAME]);
    if(!text)return {payload:null,updatedAt:data.updated_at||'',missing:false};
    const parsed=JSON.parse(text) as unknown;
    if(isEnvelope(parsed))return {payload:null,updatedAt:data.updated_at||'',missing:false};
    if(isEmptyLegacyPayload(parsed))return {payload:null,updatedAt:data.updated_at||'',missing:false};
    return {payload:parsePayload(parsed),updatedAt:data.updated_at||'',missing:false};
  }catch(e){
    if(e instanceof GistHttpError&&e.status===404)return {payload:null,updatedAt:'',missing:true};
    throw e;
  }
}

/** 古い同期先（平文）を削除する。暗号化の同期先や、別の Gist は消さない。 */
export async function deleteLegacyGist(config:GistSyncConfig):Promise<void>{
  const id=config.legacyGistId;
  if(!id)throw new Error('古い同期先はもうありません。');
  if(id===config.gistId)throw new Error('いまの同期先は削除できません。');
  let g:GistData;
  try{g=await fetchGist(config.token,id);}
  catch(e){if(e instanceof GistHttpError&&e.status===404)return;throw e;}
  const names=Object.keys(g.files||{});
  if(names.includes(ENC_FILENAME)||!names.includes(LEGACY_FILENAME))throw new Error('古い同期先ではないため、削除しませんでした。');
  await api(`/gists/${encodeURIComponent(id)}`,config.token,{method:'DELETE'});
}

export async function testGistConnection(config:GistSyncConfig):Promise<string>{
  if(!config.token)throw new Error('アクセス用のキー（GitHub）を入力してください。');
  const userRes=await api('/user',config.token);
  const user=await userRes.json() as {login?:string};
  const login=user.login||'unknown';
  if(config.gistId){
    await pullEncrypted(config);
    return `つながりました（@${login}・暗号化した同期先を読めました）`;
  }
  return `GitHub に入れました（@${login}）。同期先は「今すぐ同期」で自動で見つけるか作ります。`;
}

export {KeyMismatchError};

/**
 * Concurrent conflict resolution:
 * Prefer higher revision; if revisions are equal, prefer the side with higher savedAt.
 * Equal revision + equal savedAt → treat as no-op (keep local).
 */
export function compareRemote(local:{revision:number,savedAt?:string},remote:GistPayload):'remote'|'local'|'equal'{
  if(remote.revision>local.revision)return 'remote';
  if(remote.revision<local.revision)return 'local';
  const ls=local.savedAt||'';
  const rs=remote.savedAt||remote.updatedAt||'';
  if(rs>ls)return 'remote';
  if(rs<ls)return 'local';
  return 'equal';
}
