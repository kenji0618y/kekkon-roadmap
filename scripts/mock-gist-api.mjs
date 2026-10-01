/**
 * テスト用の GitHub Gist API のまね（本物の GitHub には一切つながない）。
 * node のテスト（test-sync-crypt.mjs）と、ブラウザ2台のテスト（test-sync-browser.mjs）で使う。
 * - トークン → ログイン名 で認証（知らないトークンは 401）
 * - 秘密 Gist は ID を知っていれば誰でも GET できる（本物と同じ。今回の問題そのもの）
 * - 履歴（revisions）も残す：暗号化前の平文が履歴に残ることの確認用
 */
export class MockGitHub {
  constructor(users) {
    this.users = users; // {token: login}
    this.gists = new Map();
    this.seq = 0;
    this.log = [];
  }
  seed({ id, owner, files, description = '' }) {
    const now = new Date(Date.now() - 86400000).toISOString();
    const g = { id, owner, description, public: false, files: {}, created_at: now, updated_at: now, history: [] };
    for (const [name, content] of Object.entries(files)) g.files[name] = { filename: name, content };
    g.history.push(JSON.parse(JSON.stringify(g.files)));
    this.gists.set(id, g);
    return g;
  }
  view(g, full = true) {
    const files = {};
    for (const [n, f] of Object.entries(g.files)) files[n] = full ? { filename: n, content: f.content, truncated: false, raw_url: '' } : { filename: n };
    return { id: g.id, description: g.description, public: false, owner: { login: g.owner }, files, created_at: g.created_at, updated_at: g.updated_at };
  }
  /** returns {status, body} */
  handle(method, url, auth, bodyText) {
    const u = new URL(url);
    const token = (auth || '').replace(/^Bearer\s+/i, '');
    const login = this.users[token];
    this.log.push({ method, path: u.pathname, body: bodyText || '' });
    const send = (status, body) => ({ status, body });
    if (!login && !(method === 'GET' && /^\/gists\/[^/]+$/.test(u.pathname))) return send(401, { message: 'Bad credentials' });
    if (u.pathname === '/user' && method === 'GET') return send(200, { login });
    if (u.pathname === '/gists' && method === 'GET') {
      const page = Number(u.searchParams.get('page') || '1');
      const per = Number(u.searchParams.get('per_page') || '30');
      const mine = [...this.gists.values()].filter((g) => g.owner === login).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return send(200, mine.slice((page - 1) * per, page * per).map((g) => this.view(g, false)));
    }
    if (u.pathname === '/gists' && method === 'POST') {
      const b = JSON.parse(bodyText || '{}');
      const id = 'e' + String(++this.seq).padStart(31, '0');
      const now = new Date(Date.now() + this.seq).toISOString();
      const g = { id, owner: login, description: b.description || '', public: !!b.public, files: {}, created_at: now, updated_at: now, history: [] };
      for (const [n, f] of Object.entries(b.files || {})) g.files[n] = { filename: n, content: f.content };
      g.history.push(JSON.parse(JSON.stringify(g.files)));
      this.gists.set(id, g);
      return send(201, this.view(g));
    }
    const m = u.pathname.match(/^\/gists\/([^/]+)$/);
    if (m) {
      const g = this.gists.get(m[1]);
      if (!g) return send(404, { message: 'Not Found' });
      if (method === 'GET') return send(200, this.view(g));
      if (g.owner !== login) return send(404, { message: 'Not Found' });
      if (method === 'PATCH') {
        const b = JSON.parse(bodyText || '{}');
        for (const [n, f] of Object.entries(b.files || {})) {
          if (f === null) delete g.files[n];
          else g.files[n] = { filename: n, content: f.content };
        }
        g.updated_at = new Date(Math.max(Date.now(), Date.parse(g.updated_at) + 1)).toISOString();
        g.history.push(JSON.parse(JSON.stringify(g.files)));
        return send(200, this.view(g));
      }
      if (method === 'DELETE') {
        this.gists.delete(g.id);
        return send(204, null);
      }
    }
    return send(404, { message: 'Not Found' });
  }
  /** fetch 互換（node テスト用） */
  fetch = async (url, init = {}) => {
    const h = new Headers(init.headers || {});
    const r = this.handle(init.method || 'GET', String(url), h.get('Authorization') || '', init.body || '');
    return new Response(r.body === null ? null : JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  };
}
