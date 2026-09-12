import { z } from 'zod';
export const statusNames={todo:'これから',learned:'確認した',preparing:'準備中',applied:'申請した',waiting:'結果待ち',done:'完了',na:'スキップ'} as const;
export type Status=keyof typeof statusNames;
const short=z.string().max(100);
const date=z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='1900-01-01'&&v<='2100-12-31'&&Number.isFinite(new Date(v+'T00:00:00Z').getTime())&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v),'実在する日付を入力してください');
export const profileSchema=z.object({name1:short,name2:short,ward:short,wdate:date,movedate:date,reported:date,birthdate:date,duedate:date,propertydate:date,carNameDate:date,carAddressDate:date,ceremony:z.enum(['unknown','yes','no']),employment1:z.enum(['unknown','company','public','self','other']),employment2:z.enum(['unknown','company','public','self','other']),work:z.enum(['unknown','dual','dependent']),move:z.enum(['unknown','yes','already','no']),child:z.enum(['unknown','none','someday','pregnant','born']),home:z.enum(['unknown','rent','soon','buying','owned']),car:z.enum(['unknown','yes','no']),foreign:z.enum(['unknown','yes','no']),giver:short,letter:z.string().max(3000)});
export type Profile=z.infer<typeof profileSchema>;
export const defaultProfile:Profile={name1:'',name2:'',ward:'未設定',wdate:'',movedate:'',reported:'',birthdate:'',duedate:'',propertydate:'',carNameDate:'',carAddressDate:'',ceremony:'no',employment1:'company',employment2:'company',work:'dual',move:'unknown',child:'unknown',home:'unknown',car:'unknown',foreign:'unknown',giver:'',letter:''};
export const recordSchema=z.object({status:z.enum(['todo','learned','preparing','applied','waiting','done','na']),steps:z.array(z.number().int().min(0).max(30)).max(31),assignee:z.enum(['together','one','two']),note:z.string().max(3000),due:date,amount:z.number().int().min(0).max(1000000000).nullable(),moneyKind:z.enum(['received','estimate','monthlySaving','taxEstimate','none']),confirmedAt:date,updatedAt:z.string().max(40)});
export type TaskRecord=z.infer<typeof recordSchema>;
export const emptyRecord:TaskRecord={status:'todo',steps:[],assignee:'together',note:'',due:'',amount:null,moneyKind:'none',confirmedAt:'',updatedAt:''};
export const memorySchema=z.object({id:short,date:date,title:z.string().min(1).max(100),text:z.string().max(3000),kind:z.enum(['memory','monthly','dream']),complete:z.boolean()});
export type Memory=z.infer<typeof memorySchema>;
/** 「ふたり」タブ：試している行動。既存の手帳を壊さないよう既定値つき。 */
export const practiceSchema=z.object({status:z.enum(['none','try','doing','kept']).catch('none'),note:z.string().max(1000).catch('')});
export type PracticeRecord=z.infer<typeof practiceSchema>;
/** 「ふたり」タブ：二人の合意。書き込みは任意なので、すべて空でよい。 */
export const agreementSchema=z.object({mine:z.string().max(2000).catch(''),theirs:z.string().max(2000).catch(''),agreed:z.string().max(2000).catch(''),review:date.catch('')});
export type AgreementRecord=z.infer<typeof agreementSchema>;
export const bookSchema=z.object({profile:profileSchema,records:z.record(recordSchema),memories:z.array(memorySchema).max(1000),practices:z.record(practiceSchema).catch({}).default({}),agreements:z.record(agreementSchema).catch({}).default({})});
export type Book=z.infer<typeof bookSchema>;
export const emptyBook:Book={profile:defaultProfile,records:{},memories:[],practices:{},agreements:{}};
export type Source={id:string,title:string,url:string,checked:string,kind:'official'|'provider'|'document'|'planning',note?:string};
export type SeedMoney={amount_yen?:number|null,unit?:string|null,note?:string};
export type Task={id:string,title:string,pad?:string,summary:string,steps:string[],questions:string[],need:string[],stage?:number,chapter:string,group:string,who:string,sources:string[],type:'procedure'|'benefit'|'tax'|'investment'|'contract'|'conversation',rule?:string,amountNote?:string,notice?:string,verified:boolean,review?:string,why?:string,miss?:string,window?:string,faq?:{q:string,a:string}[],money_in?:SeedMoney|null,money_out?:SeedMoney|null,track?:string,eligibility?:string,hidden_if?:string[]};
export const eligibilityLabels:Record<string,string>={always:'いつも表示',child:'子あり・予定向け',company:'会社員・公務員向け',buy:'住まい購入検討時',ceremony:'式あり向け',self:'自営業向け'};
export type Group={id:string,title:string,short:string,kanji:string,chapter:string,ids:string[],subtitle?:string|null,chips?:string[]};
export const chapters=[{id:'prepare',label:'結婚準備',en:'THE BEGINNING',kanji:'結',description:'大切な日を迎える準備を。'},{id:'life',label:'新生活',en:'OUR EVERYDAY',kanji:'暮',description:'住まい、名前、ふたりの暮らし。'},{id:'annual',label:'毎年の見直し',en:'YEAR BY YEAR',kanji:'実',description:'制度と契約を、今の暮らしに合わせる。'},{id:'child',label:'子育て',en:'A NEW CHAPTER',kanji:'育',description:'必要になった時に、ひとつずつ。'},{id:'home',label:'住まい',en:'A PLACE FOR US',kanji:'住',description:'住まいの計画と、使える制度を確認。'},{id:'care',label:'もしもの備え',en:'PEACE OF MIND',kanji:'守',description:'安心のために、今できる準備。'}];
/** Ceremony / wedding-stamp tasks (W* + eligibility/need). Kept in tasks.json; lean-hidden when ceremony==='no'. */
export function isCeremonyTask(t:Task){
  if(t.eligibility==='ceremony')return true;
  if((t.need||[]).includes('ceremony'))return true;
  if(/^W\d+$/i.test(t.id))return true;
  return false;
}
export function inScope(t:Task,p:Profile){
  if(p.ceremony==='no'&&isCeremonyTask(t))return false;
  for(const n of t.need){
    if(n==='company'&&!['unknown','company','public'].includes(p.employment1)&&!['unknown','company','public'].includes(p.employment2))return false;
    if(n==='self'&&p.employment1!=='unknown'&&p.employment2!=='unknown'&&p.employment1!=='self'&&p.employment2!=='self')return false;
    if(n==='ceremony'&&p.ceremony==='no')return false;
    if(n==='move'&&p.move==='no')return false;
    if(n==='car'&&p.car==='no')return false;
    if(n==='foreign'&&p.foreign==='no')return false;
    if(n==='buy'&&p.home==='rent')return false;
    if(n==='rent'&&['buying','owned'].includes(p.home))return false;
    if(n==='child'&&['none','unknown'].includes(p.child))return false;
  }
  if(t.stage&&p.child!=='unknown'){
    const stage={none:0,someday:1,pregnant:2,born:3}[p.child];
    if(t.stage>stage)return false;
  }
  return true;
}
export function eligibilityNote(t:Task,p:Profile){if(t.need.includes('company'))return '勤務先の規程と、各自の加入制度を確認してください。';if(['A必6','C他1','C他7','D3'].includes(t.id))return p.work==='dual'?'二人の働き方・各自の所得・加入条件を別々に確認します。':'扶養・税の控除・勤務先の手当は、それぞれの条件を確認します。';if(['benefit','tax'].includes(t.type))return '候補として表示しています。すべての対象条件を確認してから申請してください。';return 'お二人に必要か、公式案内と現在の状況を確認しましょう。';}
