const CSRF_COOKIE_NAME = "csrf_token";

export function getCsrfTokenFromCookie() {
  if (typeof document === "undefined") {
    return "";
  }

  const cookieParts = document.cookie ? document.cookie.split(";") : [];

  for (const cookiePart of cookieParts) {
    const [name, ...valueParts] = cookiePart.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return "";
}

export function createCsrfHeaders(headers = {}) {
  const token = getCsrfTokenFromCookie();

  if (!token) {
    return headers;
  }

  return {
    ...headers,
    "X-CSRF-Token": token,
  };
}

