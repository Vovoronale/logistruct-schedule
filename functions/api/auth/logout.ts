import { clearSessionCookie } from "../../lib/auth";
import { json } from "../../lib/http";

export const onRequestPost: PagesFunction<Env> = () => {
  return json(
    { authenticated: false },
    200,
    { "Set-Cookie": clearSessionCookie() },
  );
};
