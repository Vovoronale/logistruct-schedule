import { createSessionCookie, passwordsMatch } from "../../lib/auth";
import { json, readJsonBody } from "../../lib/http";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJsonBody(request);
    const password =
      typeof body === "object" && body !== null && "password" in body
        ? (body as { password?: unknown }).password
        : null;
    if (
      typeof password !== "string" ||
      !(await passwordsMatch(password, env.ADMIN_PASSWORD))
    ) {
      return json({ error: "Неправильний пароль" }, 401);
    }

    return json(
      { authenticated: true },
      200,
      { "Set-Cookie": await createSessionCookie(env.SESSION_SECRET) },
    );
  } catch (error) {
    const status = error instanceof Error && error.message === "BODY_TOO_LARGE" ? 413 : 400;
    return json({ error: "Не вдалося виконати вхід" }, status);
  }
};
