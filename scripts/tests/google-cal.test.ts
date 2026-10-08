/* カレンダータブの Google（ファミリー）表示（book.googleCal）。 */
import {bookSchema,emptyBook,emptyGoogleCal} from '../../src/lib/model';
import {mergeBooks} from '../../src/lib/book-merge';
import {FAMILY_CAL_ID,googleEmbedUrl,validCalId,GOOGLE_CAL_OPEN_URL} from '../../src/lib/google-cal';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};

const old=JSON.parse(JSON.stringify(emptyBook));delete old.googleCal;
const parsed=bookSchema.parse(old);
ok('old book without googleCal parses, prefilled with the family calendar',parsed.googleCal.id===FAMILY_CAL_ID&&emptyGoogleCal.id===FAMILY_CAL_ID);
ok('bad id falls back to the family calendar',bookSchema.parse({...old,googleCal:{id:'javascript:alert(1)',updatedAt:'x'}}).googleCal.id===FAMILY_CAL_ID);
ok('valid ids',validCalId(FAMILY_CAL_ID)&&validCalId('ja.japanese#holiday@group.v.calendar.google.com')&&validCalId('someone@gmail.com'));
ok('invalid ids',!validCalId('')&&!validCalId('abc')&&!validCalId('a@b')&&!validCalId('x@y.com" onload="')&&!validCalId('https://calendar.google.com/x@y.com'));
const u=new URL(googleEmbedUrl(FAMILY_CAL_ID));
ok('embed url: calendar.google.com/calendar/embed, src=id, ctz=Asia/Tokyo, month, ja',u.origin==='https://calendar.google.com'&&u.pathname==='/calendar/embed'&&u.searchParams.get('src')===FAMILY_CAL_ID&&u.searchParams.get('ctz')==='Asia/Tokyo'&&u.searchParams.get('mode')==='MONTH'&&u.searchParams.get('hl')==='ja');
ok('embed url encodes @ and /',googleEmbedUrl(FAMILY_CAL_ID).includes('src=family06139282484236685542%40group.calendar.google.com')&&googleEmbedUrl(FAMILY_CAL_ID).includes('ctz=Asia%2FTokyo'));
ok('open link is plain calendar.google.com',GOOGLE_CAL_OPEN_URL==='https://calendar.google.com/calendar/r');
const a={...parsed,googleCal:{id:'ja.japanese#holiday@group.v.calendar.google.com',updatedAt:'2030-01-02T00:00:00.000Z'}};
const b={...parsed,googleCal:{id:FAMILY_CAL_ID,updatedAt:'2030-01-01T00:00:00.000Z'}};
ok('merge keeps the newer id (either order)',mergeBooks(a,b).googleCal.id===a.googleCal.id&&mergeBooks(b,a).googleCal.id===a.googleCal.id);

console.log(`google-cal: ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
