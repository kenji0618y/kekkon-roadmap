/* 新生活の買い物リスト（book.shopping）。品目はゼクシィのチェックリストのまま、値段なし、同期で合わせる。見本のデータだけを使う。 */
import {bookSchema,emptyBook,emptyShopping} from '../../src/lib/model';
import {mergeBooks} from '../../src/lib/book-merge';
import {addShopCustom,mergeShopping,removeShopCustom,roomProgress,sameShopping,setShopEntry,shopCategories,shopEntry,nextOwner,nextStatus} from '../../src/lib/shopping';
import data from '../../src/data/newlife-checklist.json';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};
const T1='2030-01-01T00:00:00.000Z',T2='2030-01-01T00:01:00.000Z',T3='2030-01-01T00:02:00.000Z';

const old=JSON.parse(JSON.stringify(emptyBook));delete old.shopping;
ok('old book without shopping still parses (defaulted)',sameShopping(bookSchema.parse(old).shopping,emptyShopping));
ok('bad status/owner fall back',(e=>e.status==='todo'&&e.owner==='none')(bookSchema.parse({...old,shopping:{entries:{x:{owner:'zz',status:'yy',note:'',updatedAt:T1}},custom:[],deleted:{}}}).shopping.entries.x));
ok('source url is the Zexy checklist',data.source.url==='https://zexy.net/newlife/manual/interior_checklist/');
ok('4 categories as in the article',data.categories.map(c=>c.label).join()==='家具・インテリア,家電,キッチンツール,食器');
const ids=data.categories.flatMap(c=>c.rooms.flatMap(r=>r.items.map(i=>i.id)));
ok('item ids are unique',new Set(ids).size===ids.length);
ok('85 items from the article',ids.length===85);
ok('no prices in the checklist',!JSON.stringify(data.categories).match(/[0-9０-９]+\s*(円|万)|¥/));
ok('living room furniture first item is ソファ',data.categories[0].rooms[0].items[0].name==='ソファ');

const living=shopCategories(emptyShopping)[0].rooms[0];
let s=setShopEntry(emptyShopping,living.items[0].id,{owner:'both',status:'got',note:''},T1);
s=setShopEntry(s,living.items[1].id,{owner:'none',status:'skip',note:''},T1);
s=setShopEntry(s,living.items[2].id,{owner:'one',status:'have',note:'見本のメモ'},T1);
ok('progress counts got+have, ignores skip',(p=>p.ready===2&&p.total===living.items.length-1)(roomProgress(s,living)));
ok('owner cycles 未定→ふたり→一人目→二人目→未定',[nextOwner('none'),nextOwner('both'),nextOwner('one'),nextOwner('two')].join()==='both,one,two,none');
ok('status cycles まだ→買った→持っている→いらない→まだ',[nextStatus('todo'),nextStatus('got'),nextStatus('have'),nextStatus('skip')].join()==='got,have,skip,todo');

// 同期：品目ごとに新しい方
const a=setShopEntry(emptyShopping,'furniture-living-1',{owner:'one',status:'todo',note:''},T1);
const b=setShopEntry(emptyShopping,'furniture-living-1',{owner:'two',status:'got',note:''},T2);
ok('entry: newer wins (either order)',mergeShopping(a,b).entries['furniture-living-1'].owner==='two'&&mergeShopping(b,a).entries['furniture-living-1'].owner==='two');
const c=setShopEntry(emptyShopping,'appliance-bath-1',{owner:'both',status:'todo',note:''},T1);
ok('entries on different items are both kept',(m=>!!m.entries['furniture-living-1']&&!!m.entries['appliance-bath-1'])(mergeShopping(a,c)));
// 足した品目
const add=addShopCustom(emptyShopping,{id:'c-sample',cat:'furniture',room:'living',name:'見本の品目'},T1);
ok('custom item appears in its room',shopCategories(add)[0].rooms[0].items.some(i=>i.id==='c-sample'&&i.custom));
const synced=mergeShopping(emptyShopping,add);
ok('custom item syncs to the other device',synced.custom.some(x=>x.id==='c-sample'));
const withEntry=setShopEntry(synced,'c-sample',{owner:'two',status:'todo',note:''},T2);
const removed=removeShopCustom(withEntry,'c-sample',T3);
ok('remove drops item + entry and leaves a tombstone',!removed.custom.length&&!removed.entries['c-sample']&&removed.deleted['c-sample']===T3);
ok('removal propagates (no resurrection), either order',!mergeShopping(withEntry,removed).custom.length&&!mergeShopping(removed,withEntry).custom.length&&!mergeShopping(withEntry,removed).entries['c-sample']);
ok('merge idempotent & order independent',sameShopping(mergeShopping(a,b),mergeShopping(b,a))&&sameShopping(mergeShopping(mergeShopping(a,b),mergeShopping(a,b)),mergeShopping(a,b)));
const pb=bookSchema.parse(old);
ok('mergeBooks keeps newer entry and respects removals',(m=>m.shopping.entries['furniture-living-1'].owner==='two'&&!m.shopping.custom.length)(mergeBooks({...pb,shopping:mergeShopping(b,withEntry)},{...pb,shopping:removed})));
ok('empty entry default',shopEntry(emptyShopping,'x').status==='todo');
ok('note is capped at 100',setShopEntry(emptyShopping,'x',{owner:'none',status:'todo',note:'あ'.repeat(150)},T1).entries.x.note.length===100);

console.log(`shopping: ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
