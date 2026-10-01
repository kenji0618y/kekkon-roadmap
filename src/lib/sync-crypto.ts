/**
 * 端末どうしの同期データの暗号化（ブラウザの WebCrypto だけを使う）。
 *
 * - 同期先（GitHub の秘密 Gist）は URL を知っていればログインなしで読める。だから中身は暗号文だけにする。
 * - 鍵は、二人の端末に入っている「アクセス用のキー（GitHub）」から HKDF-SHA256 で作る。
 *   salt は保存のたびに新しく作り、封筒（envelope）に一緒に入れる。鍵そのものはどこにも保存しない。
 * - 本文は AES-256-GCM（改ざんも検出）。iv は毎回ランダム 12 バイト。AAD に形式名を入れる。
 * - kid は同じ salt から別の info で作った確認用の値。違うキーで開こうとしたことを、
 *   復号エラーと区別して知らせるために使う（kid からキーは戻せない）。
 * - LINE 通知の合言葉（feat/board-line-notify の SHA-256("kekkon-board-line-v1\n"+キー)）とは
 *   作り方（HKDF・info・salt）が別なので、合言葉からこの鍵は作れない。
 */
export const ENC_FORMAT='futari-sync-enc';
export const ENC_VERSION=1;
const INFO_KEY='kekkon-roadmap sync v1 / aes-256-gcm';
const INFO_KID='kekkon-roadmap sync v1 / key-check';
const AAD=new TextEncoder().encode(`${ENC_FORMAT}/v${ENC_VERSION}`);

export type Envelope={
  format:typeof ENC_FORMAT;
  v:typeof ENC_VERSION;
  alg:'AES-256-GCM';
  kdf:'HKDF-SHA256';
  salt:string;
  kid:string;
  iv:string;
  ct:string;
};

/** 封筒は開けたが、入っているキーが違う（相手の端末とキーが違う／キーを新しくした）。 */
export class KeyMismatchError extends Error{
  constructor(){super('KEY_MISMATCH');this.name='KeyMismatchError';}
}

function subtle(){
  const c=globalThis.crypto;
  if(!c?.subtle)throw new Error('この端末のブラウザでは暗号化が使えません（https で開いてください）。');
  return c.subtle;
}
export function b64uEncode(bytes:Uint8Array){
  let s='';for(const b of bytes)s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function b64uDecode(s:string):Bytes{
  const t=s.replace(/-/g,'+').replace(/_/g,'/');
  const bin=atob(t+'='.repeat((4-t.length%4)%4));
  const out=new Uint8Array(new ArrayBuffer(bin.length));
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
type Bytes=Uint8Array<ArrayBuffer>;
function rand(n:number):Bytes{const a=new Uint8Array(new ArrayBuffer(n));globalThis.crypto.getRandomValues(a);return a;}

async function ikm(secret:string){
  const t=(secret||'').trim();
  if(!t)throw new Error('アクセス用のキーを入力してください。');
  return subtle().importKey('raw',new TextEncoder().encode(t),'HKDF',false,['deriveKey','deriveBits']);
}
async function deriveKid(base:CryptoKey,salt:Bytes){
  const bits=await subtle().deriveBits({name:'HKDF',hash:'SHA-256',salt,info:new TextEncoder().encode(INFO_KID)},base,128);
  return b64uEncode(new Uint8Array(bits));
}
async function deriveAes(base:CryptoKey,salt:Bytes,usage:KeyUsage[]){
  return subtle().deriveKey({name:'HKDF',hash:'SHA-256',salt,info:new TextEncoder().encode(INFO_KEY)},base,{name:'AES-GCM',length:256},false,usage);
}

export function isEnvelope(v:unknown):v is Envelope{
  if(!v||typeof v!=='object')return false;
  const e=v as Record<string,unknown>;
  return e.format===ENC_FORMAT&&e.v===ENC_VERSION&&['salt','kid','iv','ct'].every(k=>typeof e[k]==='string');
}

export async function encryptJson(secret:string,value:unknown):Promise<Envelope>{
  const base=await ikm(secret);
  const salt=rand(16),iv=rand(12);
  const key=await deriveAes(base,salt,['encrypt']);
  const pt=new TextEncoder().encode(JSON.stringify(value));
  const ct=new Uint8Array(await subtle().encrypt({name:'AES-GCM',iv,additionalData:AAD},key,pt));
  return {format:ENC_FORMAT,v:ENC_VERSION,alg:'AES-256-GCM',kdf:'HKDF-SHA256',salt:b64uEncode(salt),kid:await deriveKid(base,salt),iv:b64uEncode(iv),ct:b64uEncode(ct)};
}

/** secrets を順に試す（いまのキー → 前のキー）。どれでも開けなければ KeyMismatchError。 */
export async function decryptJson(secrets:string[],env:Envelope):Promise<{value:unknown,index:number}>{
  const salt=b64uDecode(env.salt),iv=b64uDecode(env.iv),ct=b64uDecode(env.ct);
  for(let i=0;i<secrets.length;i++){
    const s=(secrets[i]||'').trim();
    if(!s)continue;
    const base=await ikm(s);
    if(await deriveKid(base,salt)!==env.kid)continue;
    const key=await deriveAes(base,salt,['decrypt']);
    let pt:ArrayBuffer;
    try{pt=await subtle().decrypt({name:'AES-GCM',iv,additionalData:AAD},key,ct);}
    catch{throw new Error('同期データが壊れているか、書きかえられています。');}
    return {value:JSON.parse(new TextDecoder().decode(pt)),index:i};
  }
  throw new KeyMismatchError();
}
