import { isAuthenticated } from "../../lib/auth";
import { json } from "../../lib/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  return json({ authenticated: await isAuthenticated(request, env.SESSION_SECRET) });
};
