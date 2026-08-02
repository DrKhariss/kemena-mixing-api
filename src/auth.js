import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production";
const COOKIE_NAME = "mixing_session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const crossSite = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    // Cross-origin (Kemena frontend → Hostinger API) needs none + secure.
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite,
    maxAge: MAX_AGE_MS,
    path: "/",
  };
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.full_name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

export function readAuthToken(req) {
  return req.cookies?.[COOKIE_NAME] || null;
}

export function authMiddleware(req, res, next) {
  const token = readAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
  req.user = payload;
  next();
}

export function adminMiddleware(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

export { COOKIE_NAME };
