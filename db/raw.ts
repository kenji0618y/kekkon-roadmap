/** Resolve the Worker binding only when a request actually uses storage.
 * Keeping this import lazy also lets the static page renderer be inspected in
 * ordinary Node tooling; Cloudflare resolves the module in production. */
export async function database():Promise<D1Database>{const {env}=await import('cloudflare:workers');const db=env.DB;if(!db)throw new Error('Storage is unavailable');return db;}
