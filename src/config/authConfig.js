// Base URL for Firebase custom email action handler.
// Override via VITE_CONTINUE_URL env var for non-production environments.
const AUTH_BASE = import.meta.env.VITE_CONTINUE_URL || "https://familyforever.ca";

export const AUTH_ACTION_URL = `${AUTH_BASE}/auth/action`;

// Shared base settings — use buildAuthActionSettings() when you need
// to pre-fill email/role in the redirect URL.
export const authActionCodeSettings = {
  url: AUTH_ACTION_URL,
  handleCodeInApp: true,
};

// Builds actionCodeSettings with optional email and role pre-filled so the
// /auth/action handler can skip the "enter your email" prompt.
export function buildAuthActionSettings(email, role) {
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (role) params.set("role", role);
  const qs = params.toString();
  return {
    url: qs ? `${AUTH_ACTION_URL}?${qs}` : AUTH_ACTION_URL,
    handleCodeInApp: true,
  };
}
