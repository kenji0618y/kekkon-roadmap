import { GoldParticles } from './GoldParticles';

/** Sitewide lux ambient: Ken-Burns bg + soft gold/teal dust. */
export function AmbientBg() {
  return (
    <div className="ambient-bg" aria-hidden>
      <div className="ambient-kenburns">
        <img className="ambient-kenburns-img" src="/app-bg-lux.png" alt="" />
      </div>
      <div className="ambient-veil" />
      <GoldParticles sitewide />
    </div>
  );
}
