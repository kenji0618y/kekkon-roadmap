import {bookSchema,type Book,type Profile} from './model';
import {mergeFutari} from './futari';
import {mergeBoard} from './board';
import {validateCatalogBook} from './backup';

/**
 * 二つの手帳を「どちらの書き込みも消さない」ように合わせる。
 * 使うのは、ふだんの同期ではなく「合流のとき」だけ：
 *   - 暗号化した同期先へ移るとき（この端末の手帳 × 古い同期先 × 新しい同期先）
 *   - 移行中、まだ古い版のスマホが古い同期先に書いた分を取り込むとき
 *   - キーが合わず読めなかった期間のあと、もう一度そろえるとき
 * primary は新しい方（revision / savedAt が大きい方）。時刻があるものは新しい方、無いものは primary を残し、
 * 片方にしか無いものは必ず残す（消したものが戻ることはあっても、書いたものは消えない）。
 */
export function mergeBooks(primary:Book,secondary:Book):Book{
  const p=primary,s=secondary;
  const records={...s.records};
  for(const [id,r] of Object.entries(p.records)){
    const o=records[id];
    records[id]=!o||(r.updatedAt||'')>=(o.updatedAt||'')?r:o;
  }
  const memIds=new Set(p.memories.map(m=>m.id));
  const memories=[...p.memories,...s.memories.filter(m=>!memIds.has(m.id))].slice(0,1000);
  const practices={...s.practices};
  for(const [id,r] of Object.entries(p.practices)){
    const o=practices[id];
    const empty=r.status==='none'&&!r.note;
    practices[id]=o&&empty?o:r;
  }
  const agreements={...s.agreements};
  for(const [id,r] of Object.entries(p.agreements)){
    const o=agreements[id];
    const empty=!r.mine&&!r.theirs&&!r.agreed&&!r.review;
    agreements[id]=o&&empty?o:r;
  }
  const evMap=new Map<string,Book['events'][number]>();
  for(const e of s.events||[])evMap.set(e.id,e);
  for(const e of p.events||[]){
    const o=evMap.get(e.id);
    evMap.set(e.id,!o||(e.updatedAt||'')>=(o.updatedAt||'')?e:o);
  }
  const pIds=(p.events||[]).map(e=>e.id);
  const events=[...pIds,...(s.events||[]).map(e=>e.id).filter(id=>!pIds.includes(id))].map(id=>evMap.get(id)!).slice(0,500);
  const profile:Profile={...p.profile};
  for(const k of Object.keys(profile) as (keyof Profile)[]){
    const v=profile[k];
    if((v===''||(k==='ward'&&v==='未設定'))&&s.profile[k]&&s.profile[k]!=='未設定')(profile as Record<string,string>)[k]=s.profile[k] as string;
  }
  const merged={
    ...s,...p,
    profile,records,memories,practices,agreements,events,
    futari:mergeFutari(p.futari,s.futari),
    board:mergeBoard(p.board,s.board),
  };
  return validateCatalogBook(bookSchema.parse(merged));
}

/** どちらが新しいか（同期の revision → savedAt）。 */
export function newerFirst<T extends {revision:number,savedAt?:string}>(a:T,b:T):[T,T]{
  if(a.revision!==b.revision)return a.revision>b.revision?[a,b]:[b,a];
  return (a.savedAt||'')>=(b.savedAt||'')?[a,b]:[b,a];
}
