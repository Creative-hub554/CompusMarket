const RETURN_PATH_ORIGIN = "https://postbase.local";

export function safeReturnPath(
  value: string | null | undefined,
  fallback: string,
) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;

  try {
    const url = new URL(value, RETURN_PATH_ORIGIN);
    if (url.origin !== RETURN_PATH_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function routerReturnPath(
  value: string | null | undefined,
  locale: string,
  fallback: string,
) {
  const path = safeReturnPath(value, "");
  if (!path) return fallback;
  const prefix = `/${locale}`;
  if (path === prefix) return "/";
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : fallback;
}
