import { createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";

const COOKIE = "fungpt_operator";

function tokenFor(password: string) {
  return createHmac("sha256", password).update("fungpt-operator-v1").digest("base64url");
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isOperator(event: H3Event) {
  const password = useRuntimeConfig(event).operatorPassword;
  const cookie = getCookie(event, COOKIE);
  return Boolean(password && cookie && same(cookie, tokenFor(password)));
}

export function requireOperator(event: H3Event) {
  if (!isOperator(event)) throw createError({ statusCode: 401, statusMessage: "Not the model" });
}

export function loginOperator(event: H3Event, attempt: string) {
  const password = useRuntimeConfig(event).operatorPassword;
  if (!password) {
    throw createError({ statusCode: 503, statusMessage: "Set NUXT_OPERATOR_PASSWORD first" });
  }
  if (!same(tokenFor(attempt), tokenFor(password))) {
    throw createError({ statusCode: 401, statusMessage: "Wrong password" });
  }
  setCookie(event, COOKIE, tokenFor(password), {
    httpOnly: true,
    sameSite: "strict",
    secure: !import.meta.dev,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}
