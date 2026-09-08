import {bookSchema,type Book} from './model';
import {validateCatalogBook} from './backup';

/** localStorage key for Gist sync settings (token stays on-device only). */
export const GIST_SYNC_KEY='futari-gist-sync-v1';
const GIST_FILENAME='futari-miraicho.json';
const API='https://api.github.com';

export type GistSyncConfig={token:string,gistId:string,enabled:boolean};
export type SyncStatus='off'|'ok'|'error'|'syncing';

export type GistPayload={
  format:'futari-miraicho';
  version:1;
  revision:number;
  book:Book;
  savedAt:string;
  updatedAt:string;
};

export function readSyncConfig():GistSyncConfig{
  try{
    const raw=localStorage.getItem(GIST_SYNC_KEY);
    if(!raw)return {token:'',gistId:'',enabled:false};
    const data=JSON.parse(raw) as Partial<GistSyncConfig>;
    return {
      token:typeof data.token==='string'?data.token:'',
      gistId:typeof data.gistId==='string'?data.gistId.trim():'',
      enabled:Boolean(data.enabled),
    };
  }catch{
    return {token:'',gistId:'',enabled:false};
  }
}

export function writeSyncConfig(config:GistSyncConfig){
  const next:GistSyncConfig={
    token:config.token.trim(),
    gistId:config.gistId.trim(),
    enabled:Boolean(config.enabled),
  };
  localStorage.setItem(GIST_SYNC_KEY,JSON.stringify(next));
  return next;
}

export function buildPayload(book:Book,revision:number,savedAt?:string):GistPayload{
  const now=new Date().toISOString();
  return {
    format:'futari-miraicho',
    version:1,
    revision,
    book,
    savedAt:savedAt||now,
    updatedAt:now,
  };
}

function parsePayload(raw:unknown):GistPayload{
  if(!raw||typeof raw!=='object')throw new Error('Gistの内容が空です。');
  const data=raw as Record<string,unknown>;
  if(data.format!=='futari-miraicho')throw new Error('対応する同期形式ではありません。');
  const parsed=bookSchema.safeParse(data.book);
  if(!parsed.success)throw new Error('Gist内の手帳データが正しくありません。');
  const book=validateCatalogBook(parsed.data);
  const revision=Number(data.revision)||0;
  const savedAt=typeof data.savedAt==='string'?data.savedAt:'';
  const updatedAt=typeof data.updatedAt==='string'?data.updatedAt:savedAt;
  return {format:'futari-miraicho',version:1,revision,book,savedAt,updatedAt};
}

async function api(path:string,token:string,init:RequestInit={}):Promise<Response>{
  if(!token)throw new Error('GitHub PATを入力してください。');
  const headers=new Headers(init.headers);
  headers.set('Accept','application/vnd.github+json');
  headers.set('Authorization',`Bearer ${token}`);
  headers.set('X-GitHub-Api-Version','2022-11-28');
  if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  const res=await fetch(`${API}${path}`,{...init,headers});
  if(!res.ok){
    let detail='';
    try{
      const err=await res.json() as {message?:string};
      detail=err.message?`（${err.message}）`:'';
    }catch{/* ignore */}
    if(res.status===401)throw new Error(`認証に失敗しました。gist scopeのPATを確認してください${detail}`);
    if(res.status===404)throw new Error(`Gistが見つかりません。gistIdを確認してください${detail}`);
    if(res.status===403)throw new Error(`アクセスが拒否されました${detail}`);
    throw new Error(`GitHub APIエラー (${res.status})${detail}`);
  }
  return res;
}

export async function createSecretGist(token:string,payload:GistPayload):Promise<string>{
  const body={
    description:'ふたりの未来帖 · progress sync (secret)',
    public:false,
    files:{
      [GIST_FILENAME]:{content:JSON.stringify(payload)},
    },
  };
  const res=await api('/gists',token,{method:'POST',body:JSON.stringify(body)});
  const data=await res.json() as {id?:string};
  if(!data.id)throw new Error('Gistの作成に失敗しました。');
  return data.id;
}

export async function pushToGist(config:GistSyncConfig,payload:GistPayload):Promise<void>{
  if(!config.gistId)throw new Error('Gist IDが未設定です。新規作成するかIDを入力してください。');
  const body={
    files:{
      [GIST_FILENAME]:{content:JSON.stringify(payload)},
    },
  };
  await api(`/gists/${encodeURIComponent(config.gistId)}`,config.token,{
    method:'PATCH',
    body:JSON.stringify(body),
  });
}

export async function pullFromGist(config:GistSyncConfig):Promise<GistPayload|null>{
  if(!config.gistId)throw new Error('Gist IDが未設定です。');
  const res=await api(`/gists/${encodeURIComponent(config.gistId)}`,config.token);
  const data=await res.json() as {
    files?:Record<string,{content?:string,truncated?:boolean,raw_url?:string}>;
  };
  const file=data.files?.[GIST_FILENAME];
  if(!file)throw new Error(`Gistに ${GIST_FILENAME} がありません。`);
  let content=file.content;
  if((file.truncated||!content)&&file.raw_url){
    const rawRes=await fetch(file.raw_url,{
      headers:{Authorization:`Bearer ${config.token}`,Accept:'application/vnd.github.raw'},
    });
    if(!rawRes.ok)throw new Error('Gistの内容を取得できませんでした。');
    content=await rawRes.text();
  }
  if(!content)return null;
  return parsePayload(JSON.parse(content));
}

export async function testGistConnection(config:GistSyncConfig):Promise<string>{
  if(!config.token)throw new Error('GitHub PATを入力してください。');
  const userRes=await api('/user',config.token);
  const user=await userRes.json() as {login?:string};
  const login=user.login||'unknown';
  if(config.gistId){
    await api(`/gists/${encodeURIComponent(config.gistId)}`,config.token);
    return `接続OK（@${login} · gist ${config.gistId.slice(0,8)}…）`;
  }
  return `認証OK（@${login}）。Gist ID未設定 — 「新規作成」か既存IDを入力してください。`;
}

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
