import { NavLink, useLocation } from 'react-router-dom';

export function BottomNav() {
  const { pathname } = useLocation();
  const onMain =
    pathname === '/' || pathname === '/deadlines' || pathname === '/know';

  return (
    <nav className="bottom-nav nav-main-edit" aria-label="メイン">
      <NavLink
        to="/"
        end
        className={() => (onMain ? 'active' : undefined)}
        aria-current={onMain ? 'page' : undefined}
      >
        <span className="ico" aria-hidden>
          🗺️
        </span>
        <span>ロードマップ</span>
      </NavLink>
      <NavLink
        to="/edit"
        className={({ isActive }) => `nav-edit${isActive ? ' active' : ''}`}
      >
        <span className="ico" aria-hidden>
          ✎
        </span>
        <span>編集</span>
      </NavLink>
    </nav>
  );
}
