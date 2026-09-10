import {useState} from 'react';
import {ArrowRight, Heart} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from './ui/dialog';
import {Label} from './ui/label';
import {Input} from './ui/input';
import {Action, Choice, SaveAction} from './book-controls';
import {defaultProfile, profileSchema, type Profile} from '../lib/model';

const WARDS = ['未設定', '中区', '東区', '南区', '西区', '安佐南区', '安佐北区', '安芸区', '佐伯区'] as const;

export const ONBOARD_DONE_LS = 'amity-onboarding-done';

export function markOnboardingDone() {
  try {
    localStorage.setItem(ONBOARD_DONE_LS, '1');
  } catch {
    /* ignore */
  }
}

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARD_DONE_LS) === '1';
  } catch {
    return false;
  }
}

/** First-run lean sheet: ward, optional wdate, ceremony=no, dual employment — no invented yen. */
export function OnboardingSheet({
  open,
  profile,
  busy,
  onSave,
  onSkip,
}: {
  open: boolean;
  profile: Profile;
  busy: boolean;
  onSave: (p: Profile) => Promise<void>;
  onSkip: () => void;
}) {
  const [p, setP] = useState<Profile>(() => ({
    ...defaultProfile,
    ...profile,
    ceremony: profile.ceremony === 'unknown' ? 'no' : profile.ceremony || 'no',
    work: profile.work === 'unknown' ? 'dual' : profile.work || 'dual',
    employment1: profile.employment1 === 'unknown' ? 'company' : profile.employment1 || 'company',
    employment2: profile.employment2 === 'unknown' ? 'company' : profile.employment2 || 'company',
  }));
  const [err, setErr] = useState('');

  const change = (k: keyof Profile, v: string) => setP((s) => ({...s, [k]: v}));

  const submit = async () => {
    const parsed = profileSchema.safeParse(p);
    if (!parsed.success) {
      setErr('日付や入力内容を確認してください。');
      return;
    }
    setErr('');
    await onSave(parsed.data);
    markOnboardingDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="notebook-dialog dialog-onboard" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <p className="eyebrow">FIRST STEPS</p>
          <DialogTitle>まずは、ふたりの前提を。</DialogTitle>
          <DialogDescription>
            広島市で、式は挙げない前提の共働き向けです。分かるところだけで大丈夫。金額は入れません。
          </DialogDescription>
        </DialogHeader>
        <form
          className="form-stack onboard-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset disabled={busy}>
            <div className="condition-note">
              <Heart size={18} />
              <p>区・働き方・式の有無で、表示する制度の候補が整います。あとから設定で変えられます。</p>
            </div>
            <div className="field-grid">
              <Choice
                label="お住まいの区（広島市）"
                value={p.ward}
                onChange={(v) => change('ward', v)}
                options={Object.fromEntries(WARDS.map((v) => [v, v]))}
              />
              <div className="field">
                <Label htmlFor="onboard-wdate">婚姻日・予定日（任意）</Label>
                <Input
                  id="onboard-wdate"
                  type="date"
                  value={p.wdate}
                  onChange={(e) => change('wdate', e.target.value)}
                />
              </div>
              <Choice
                label="式・披露宴"
                value={p.ceremony}
                onChange={(v) => change('ceremony', v)}
                options={{no: '予定なし', yes: '予定あり', unknown: '未定'}}
              />
              <Choice
                label="働き方・扶養"
                value={p.work}
                onChange={(v) => change('work', v)}
                options={{dual: '二人とも働く予定', dependent: '扶養を検討する', unknown: 'これから考える'}}
              />
              <Choice
                label="一人目の働き方"
                value={p.employment1}
                onChange={(v) => change('employment1', v)}
                options={{company: '会社員', public: '公務員', self: '自営業・フリーランス', other: 'その他', unknown: '未設定'}}
              />
              <Choice
                label="二人目の働き方"
                value={p.employment2}
                onChange={(v) => change('employment2', v)}
                options={{company: '会社員', public: '公務員', self: '自営業・フリーランス', other: 'その他', unknown: '未設定'}}
              />
            </div>
            <p className="hint">金額はここでは入れません。あとから各項目に、実際に分かった額だけを記録できます。</p>
            {err && (
              <p role="alert" className="inline-error">
                {err}
              </p>
            )}
            <div className="form-actions onboard-actions">
              <SaveAction busy={busy} onClick={() => void submit()}>
                この内容で始める <ArrowRight size={15} />
              </SaveAction>
              <Action
                secondary
                disabled={busy}
                onClick={() => {
                  markOnboardingDone();
                  onSkip();
                }}
              >
                あとで設定する
              </Action>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingSheet;
