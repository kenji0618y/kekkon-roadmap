/* 博士タブ「家計の分け方」（book.household）。見本のデータだけを使う。 */
import {bookSchema,emptyBook,emptyHousehold,sameHousehold} from '../../src/lib/model';
import {mergeBooks} from '../../src/lib/book-merge';
import data from '../../src/data/household-patterns.json';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};

const old=JSON.parse(JSON.stringify(emptyBook));delete old.household;
const parsed=bookSchema.parse(old);
ok('old book without household still parses (defaulted)',sameHousehold(parsed.household,emptyHousehold));
ok('bad pattern falls back to empty',bookSchema.parse({...old,household:{pattern:'zz',note:'',review:'',updatedAt:''}}).household.pattern==='');
const a={...parsed,household:{pattern:'p2' as const,note:'見本のメモ',review:'',updatedAt:'2030-01-01T00:00:00.000Z'}};
const b={...parsed,household:{pattern:'p4' as const,note:'',review:'',updatedAt:'2030-01-02T00:00:00.000Z'}};
ok('merge keeps the newer choice (either order)',mergeBooks(a,b).household.pattern==='p4'&&mergeBooks(b,a).household.pattern==='p4');
ok('5 patterns, ids p1..p5, all with names',data.patterns.length===5&&data.patterns.map(p=>p.id).join()==='p1,p2,p3,p4,p5'&&data.patterns.every(p=>p.name&&p.suits.endsWith('におすすめ')));
ok('source url is the Zexy article',data.source.url==='https://zexy.net/article/app002112015/');
ok('no yen amounts in the pattern text',!JSON.stringify(data.patterns).match(/[0-9０-９]+\s*(円|万)/));

console.log(`household: ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
