import {bookSchema,emptyBook,emptyRecord,type Book,type Status} from './model';
import {taskById} from '../data/catalog';
import {practices as practiceList,agreements as agreementList} from '../data/catalog';
const practiceIds=new Set(practiceList.map(p=>p.id));
const agreementIds=new Set(agreementList.map(a=>a.id));
export function validateCatalogBook(book:Book){for(const [id,r] of Object.entries(book.records)){if(!Object.hasOwn(taskById,id))throw new Error('この手帳にない項目が含まれています。');if(r.steps.some(i=>i>=taskById[id].steps.length))throw new Error('チェック項目の番号を確認してください。');if(taskById[id].type==='investment'&&(r.moneyKind!=='none'||r.amount!==null))throw new Error('投資の金額は給付・節約の集計に含められません。');}if(new Set(book.memories.map(m=>m.id)).size!==book.memories.length)throw new Error('記念のIDが重複しています。');for(const id of Object.keys(book.practices))if(!practiceIds.has(id))throw new Error('この手帳にない行動が含まれています。');for(const id of Object.keys(book.agreements))if(!agreementIds.has(id))throw new Error('この手帳にない話題が含まれています。');return book;}
export function readBackup(value:unknown):{book:Book,legacy:boolean}{
 if(!value||typeof value!=='object')throw new Error('手帳のJSONファイルを選んでください。');
 const data=value as Record<string,unknown>;
 const candidate=data.format==='futari-miraicho'?(data.book as unknown):value;
 const parsed=bookSchema.safeParse(candidate);if(parsed.success)return {book:validateCatalogBook(parsed.data),legacy:false};
 if(data.format==='futari-miraicho')throw new Error('手帳の形式が正しくありません。日付や項目を確認してください。');
 if(!data.statuses||typeof data.statuses!=='object'||!data.profile||typeof data.profile!=='object')throw new Error('対応するバックアップではありません。');
 const p=data.profile as Record<string,unknown>,book:Book=structuredClone(emptyBook);
 for(const key of ['wdate','movedate'] as const)if(typeof p[key]==='string')book.profile[key]=p[key] as string;
 const choices={ceremony:['unknown','yes','no'],work:['unknown','dual','dependent'],move:['unknown','yes','already','no'],child:['unknown','none','someday','pregnant','born'],home:['unknown','rent','soon','buying','owned'],car:['unknown','yes','no'],foreign:['unknown','yes','no']};
 for(const [key,options] of Object.entries(choices))if(typeof p[key]==='string'&&options.includes(p[key] as string))Object.assign(book.profile,{[key]:p[key]});
 if(typeof p.birthdate==='string'){if(book.profile.child==='pregnant')book.profile.duedate=p.birthdate;else if(book.profile.child==='born')book.profile.birthdate=p.birthdate;}
 const statuses:Record<string,Status>={todo:'todo',checked:'learned',done:'done',unknown:'preparing',na:'na'};
 const steps=data.steps&&typeof data.steps==='object'?data.steps as Record<string,unknown>:{};
 for(const [id,status] of Object.entries(data.statuses as object)){if(!Object.hasOwn(taskById,id))continue;const r=structuredClone(emptyRecord);r.status=statuses[String(status)]||'todo';r.note='旧版から移行しました。チェックリストと制度の条件を改めて確認してください。';if(Object.keys(steps).some(k=>k.startsWith(id+'#')&&steps[k]))r.note+=' 旧版のチェック内容は新しい手順と異なるため、自動では引き継いでいません。';book.records[id]=r;}
 return {book:validateCatalogBook(bookSchema.parse(book)),legacy:true};
}
export function backupText(book:Book){return JSON.stringify({format:'futari-miraicho',version:1,exportedAt:new Date().toISOString(),book},null,2);}
