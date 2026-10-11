function firstCorsOrigin() {
  const raw = process.env.CORS_ORIGIN || "http://localhost:3000";
  return raw.split(",")[0]?.trim() || "http://localhost:3000";
}

/** Public site origin for CTA links (no trailing slash). */
export function frontendOrigin() {
  const configured = (process.env.FRONTEND_URL || process.env.APP_PUBLIC_URL || "").replace(/\/+$/, "");
  return configured || firstCorsOrigin().replace(/\/+$/, "");
}

export function mixingPath(path) {
  const base = frontendOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function adminEmail() {
  return (process.env.MAIL_ADMIN_TO || process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
}
