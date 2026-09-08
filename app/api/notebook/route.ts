import { headers } from 'next/headers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { database } from '../../../db/raw';
import { bookSchema,emptyBook,profileSchema,recordSchema,memorySchema } from '../../../lib/model';
import type { Book } from '../../../lib/model';
import { z } from 'zod';
import {taskById} from '../../../data/catalog';
import {validateCatalogBook} from '../../../lib/backup';
export const dynamic='force-dynamic';
type Member={user_id:string,book_id:string,slot:number,display_name:string};
type BookRow={id:string,data:string,revision:number};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function identity(){const u=await getChatGPTUser();const h=await headers();const id=h.get('oai-authenticated-user-id');return u&&id?{id,name:u.displayName}:null;}
async function member(id:string){const d=await database();return d.prepare('SELECT user_id,book_id,slot,display_name FROM future_members WHERE user_id=?').bind(id).first<Member>();}
async function snapshot(m:Member){const d=await database();const row=await d.prepare('SELECT id,data,revision FROM future_books WHERE id=?').bind(m.book_id).first<BookRow>();if(!row)throw new Error('Book missing');const ms=await d.prepare('SELECT slot,display_name FROM future_members WHERE book_id=? ORDER BY slot').bind(m.book_id).all<{slot:number,display_name:string}>();return {book:bookSchema.parse(JSON.parse(row.data)),revision:row.revision,members:ms.results,slot:m.slot};}
function trustedOrigin(request:Request){const origin=request.headers.get('origin');return !!origin&&origin===new URL(request.url).origin&&request.headers.get('sec-fetch-site')!=='cross-site';}
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
function token(){return Array.from(crypto.getRandomValues(new Uint8Array(24))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function GET(){try{const u=await identity();if(!u)return reply({error:'保存するにはChatGPTでログインしてください。',signin:true},401);const m=await member(u.id);if(!m)return reply({book:null,revision:0,members:[],slot:0});return reply(await snapshot(m));}catch(e){console.error('notebook load',e);return reply({error:'手帳を読み込めませんでした。少し待って再読み込みしてください。'},503);}}
const requestSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create')}),
 z.object({action:z.literal('join'),code:z.string().regex(/^[a-f0-9]{48}$/)}),
 z.object({action:z.literal('invite')}),
 z.object({action:z.literal('gift'),profile:profileSchema}),
 z.object({action:z.literal('revokeInvite')}),
 z.object({action:z.literal('profile'),revision:z.number().int().min(0),profile:profileSchema}),
 z.object({action:z.literal('record'),revision:z.number().int().min(0),id:z.string().min(1).max(100),record:recordSchema}),
 z.object({action:z.literal('memory'),revision:z.number().int().min(0),memory:memorySchema}),
 z.object({action:z.literal('deleteMemory'),revision:z.number().int().min(0),id:z.string().min(1).max(100)}),
 z.object({action:z.literal('import'),revision:z.number().int().min(0),book:bookSchema}),
]);
export async function POST(request:Request){
 try{
  if(!trustedOrigin(request))return reply({error:'この画面を開き直してから操作してください。'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'形式を確認してください。'},415);
  const u=await identity();if(!u)return reply({error:'保存するにはChatGPTでログインしてください。',signin:true},401);
  const raw=await request.text();if(raw.length>2000000)return reply({error:'データが大きすぎます。'},413);
  const parsed=requestSchema.safeParse(JSON.parse(raw));if(!parsed.success)return reply({error:'入力内容を確認してください。文字数や日付・金額の形式が正しくありません。'},400);
  const p=parsed.data,d=await database();let m=await member(u.id);
  if(p.action==='gift'){
   const id=crypto.randomUUID(),code=token(),expires=new Date(Date.now()+7*86400000).toISOString();
   const gift=structuredClone(emptyBook);
   for(const key of ['name1','name2','giver','letter','wdate','ward'] as const)gift.profile[key]=p.profile[key];
   await d.batch([d.prepare('INSERT INTO future_books (id,data,revision,created_at) VALUES (?,?,0,?)').bind(id,JSON.stringify(gift),new Date().toISOString()),d.prepare('INSERT INTO future_invites (hash,book_id,slot,expires_at) VALUES (?,?,1,?)').bind(await hash(code),id,expires)]);
   return reply({code,expires,gift:true});
  }
  if(p.action==='join'){
   if(m)return reply({error:'すでに手帳を利用中です。参加する方のアカウントで開いてください。'},409);
   const invitation=await d.prepare('SELECT book_id,expires_at FROM future_invites WHERE hash=? AND expires_at>?').bind(await hash(p.code),new Date().toISOString()).first<{book_id:string,expires_at:string}>();
   if(!invitation)return reply({error:'招待コードを確認してください。有効期限は発行から7日間です。'},400);
   try{await d.batch([d.prepare('INSERT INTO future_members (user_id,book_id,slot,display_name) SELECT ?,book_id,slot,? FROM future_invites WHERE hash=? AND expires_at>?').bind(u.id,u.name,await hash(p.code),new Date().toISOString()),d.prepare('DELETE FROM future_invites WHERE hash=?').bind(await hash(p.code))]);}catch{return reply({error:'この手帳にはすでに二人が参加しています。'},409);}
   m=await member(u.id);if(!m)return reply({error:'招待の期限が切れました。新しいコードを受け取ってください。'},409);return reply(await snapshot(m));
  }
  if(p.action==='create'){
   if(!m){const id=crypto.randomUUID();await d.batch([d.prepare('INSERT INTO future_books (id,data,revision,created_at) VALUES (?,?,0,?)').bind(id,JSON.stringify(emptyBook),new Date().toISOString()),d.prepare('INSERT INTO future_members (user_id,book_id,slot,display_name) VALUES (?,?,1,?)').bind(u.id,id,u.name)]);m=await member(u.id);}
   if(!m)throw new Error('Create failed');return reply(await snapshot(m));
  }
  if(!m)return reply({error:'先に「この手帳を使う」を押してください。'},409);
  if(p.action==='invite'){
   if(m.slot!==1)return reply({error:'招待は手帳を作った方が発行できます。'},403);
   const count=await d.prepare('SELECT COUNT(*) AS n FROM future_members WHERE book_id=?').bind(m.book_id).first<{n:number}>();if(count&&count.n>=2)return reply({error:'二人とも参加しています。'},409);
   const code=token(),expires=new Date(Date.now()+7*86400000).toISOString();await d.prepare('INSERT INTO future_invites (hash,book_id,expires_at) VALUES (?,?,?) ON CONFLICT(book_id) DO UPDATE SET hash=excluded.hash,expires_at=excluded.expires_at').bind(await hash(code),m.book_id,expires).run();return reply({code,expires});
  }
  if(p.action==='revokeInvite'){if(m.slot!==1)return reply({error:'作成者のみ変更できます。'},403);await d.prepare('DELETE FROM future_invites WHERE book_id=?').bind(m.book_id).run();return reply({ok:true});}
  const row=await d.prepare('SELECT id,data,revision FROM future_books WHERE id=?').bind(m.book_id).first<BookRow>();if(!row)throw new Error('Book missing');
  if(row.revision!==p.revision)return reply({error:'もう一人の更新を読み込みました。入力中の内容はそのまま残っています。内容を確かめて、もう一度保存してください。',conflict:true,...await snapshot(m)},409);
  let book:Book=bookSchema.parse(JSON.parse(row.data));
  if(p.action==='profile')book.profile=p.profile;
  if(p.action==='record'){if(!Object.hasOwn(taskById,p.id))return reply({error:'項目を確認してください。'},400);book.records[p.id]={...p.record,updatedAt:new Date().toISOString()};}
  if(p.action==='memory'){book.memories=book.memories.filter(x=>x.id!==p.memory.id).concat(p.memory);}
  if(p.action==='deleteMemory')book.memories=book.memories.filter(x=>x.id!==p.id);
  if(p.action==='import')book=p.book;
  const clean=bookSchema.parse(book);
  try{validateCatalogBook(clean);}catch(e){return reply({error:e instanceof Error?e.message:'内容を確認してください。'},400);}
  const changed=await d.prepare('UPDATE future_books SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(clean),m.book_id,p.revision).run();
  if(changed.meta.changes!==1)return reply({error:'更新が重なりました。最新内容を確認し、もう一度保存してください。',conflict:true,...await snapshot(m)},409);
  return reply(await snapshot(m));
 }catch(e){if(e instanceof SyntaxError||e instanceof z.ZodError)return reply({error:'読み込むデータの形式を確認してください。'},400);console.error('notebook write',e);return reply({error:'保存できませんでした。入力内容を残しています。接続を確認して再試行してください。'},503);}
}
