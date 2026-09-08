import profile from '../data/profile.json';

export function ProfileLocks() {
  return (
    <div className="locks" aria-label="固定プロフィール">
      {profile.ui_notes.map((n) => (
        <span key={n}>{n}</span>
      ))}
    </div>
  );
}
