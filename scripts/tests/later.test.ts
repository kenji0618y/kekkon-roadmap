/* 「あとで見る」（book.later）の同期。外した印が相手の端末でも外れること（tombstone）。見本のデータだけを使う。 */
import {bookSchema,emptyBook,emptyLater,type Later} from '../../src/lib/model';
import {mergeBooks} from '../../src/lib/book-merge';
import {hasLater,laterFaqId,laterLessonId,laterTaskId,mergeLater,sameLater,toggleLater} from '../../src/lib/later';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};

const T1='2030-01-01T00:00:00.000Z',T2='2030-01-01T00:01:00.000Z',T3='2030-01-01T00:02:00.000Z',T4='2030-01-01T00:03:00.000Z';
const task={id:laterTaskId('見本の項目'),kind:'task' as const,ref:'見本の項目',title:'見本の項目'};
const faq={id:laterFaqId('見本の項目','見本の質問？'),kind:'faq' as const,ref:'見本の項目',title:'見本の質問？'};
const lesson={id:laterLessonId('見本のレッスン'),kind:'lesson' as const,ref:'見本のレッスン',title:'見本のレッスン'};

const old=JSON.parse(JSON.stringify(emptyBook));delete old.later;
ok('old book without later still parses (defaulted)',sameLater(bookSchema.parse(old).later,emptyLater));
ok('broken items are dropped, good ones kept',bookSchema.parse({...old,later:{items:[{id:'x'},{...task,by:'n1',at:T1}],deleted:{}}}).later.items.length===1);
ok('unknown "by" falls back to empty',bookSchema.parse({...old,later:{items:[{...task,by:'zz',at:T1}],deleted:{}}}).later.items[0].by==='');

// 端末A が付ける → 同期で B にも出る
const a1=toggleLater(emptyLater,{...task,by:'n1'},T1);
ok('toggle adds',hasLater(a1,task.id));
const b1=mergeLater(emptyLater,a1);
ok('mark added on A appears on B after sync',hasLater(b1,task.id));
// B が外す → A に同期すると外れる（生き返らない）
const b2=toggleLater(b1,{...task,by:'n2'},T2);
ok('toggle on a marked item removes it and leaves a tombstone',!hasLater(b2,task.id)&&b2.deleted[task.id]===T2);
const a2=mergeLater(a1,b2);
ok('removal on B propagates to A (no resurrection)',!hasLater(a2,task.id));
ok('removal propagates in either merge order',!hasLater(mergeLater(b2,a1),task.id));
// A が後でもう一度付けると、また両方に出る
const a3=toggleLater(a2,{...task,by:'n1'},T3);
ok('re-adding after removal works',hasLater(a3,task.id));
ok('re-added mark survives merge with the older tombstone',hasLater(mergeLater(b2,a3),task.id)&&hasLater(mergeLater(a3,b2),task.id));
// 同時に別々の印を付けても両方残る
const a4=toggleLater(emptyLater,{...faq,by:'n1'},T1),b4=toggleLater(emptyLater,{...lesson,by:'n2'},T2);
const m4=mergeLater(a4,b4);
ok('marks added on both devices are both kept',hasLater(m4,faq.id)&&hasLater(m4,lesson.id));
ok('newest first',m4.items[0].id===lesson.id);
ok('merge is idempotent',sameLater(mergeLater(m4,m4),m4));
ok('merge is order-independent',sameLater(mergeLater(a4,b4),mergeLater(b4,a4)));
// 付けたのと同時刻より前の tombstone しかないとき
const tomb:Later={items:[],deleted:{[faq.id]:T4}};
ok('tombstone newer than the mark removes it',!hasLater(mergeLater(a4,tomb),faq.id));
// 手帳の合わせ（参加・取り込み）でも同じ
const pb=bookSchema.parse(old),A={...pb,later:a1},B={...pb,later:b2};
ok('mergeBooks also respects removals',!hasLater(mergeBooks(A,B).later,task.id)&&!hasLater(mergeBooks(B,A).later,task.id));
// tombstone が増えすぎない
let big:Later=emptyLater;
for(let i=0;i<400;i++)big={items:[],deleted:{...big.deleted,[`task:見本${i}`]:new Date(Date.UTC(2030,0,1,0,0,i)).toISOString()}};
ok('tombstones are pruned',Object.keys(mergeLater(big,emptyLater).deleted).length<=300);

console.log(`later: ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
