import type { User } from "@supabase/supabase-js";
import type { AuthProvider, Profile } from "@/lib/domain";

const PROFILE_COLORS = ["#a34324", "#315d67", "#657b54", "#8f4f3a", "#b9855f"];

function metadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function sanitizeProfileUsername(value: string | undefined, fallbackId: string) {
  const base = value?.trim() || `artist-${fallbackId.slice(0, 8)}`;
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 32);

  if (slug.length >= 3) return slug;
  return `artist-${fallbackId.replaceAll("-", "").slice(0, 8)}`;
}

export function getUserAuthProvider(user: User): AuthProvider {
  const provider = user.app_metadata.provider ?? user.identities?.[0]?.provider;
  if (provider === "email" || provider === "google" || provider === "sso") return provider;
  if (provider === "magiclink" || provider === "magic_link") return "magic_link";
  return provider ? "unknown" : "email";
}

export function getUserAvatarUrl(user: User) {
  return metadataString(user.user_metadata, ["avatar_url", "picture"]);
}

export function getUserDisplayName(user: User) {
  const emailPrefix = user.email?.split("@")[0];
  return (
    metadataString(user.user_metadata, [
      "full_name",
      "name",
      "display_name",
      "preferred_username",
      "user_name",
    ]) ??
    emailPrefix ??
    "Ceramic artist"
  );
}

export function getUserProviderId(user: User) {
  return (
    metadataString(user.user_metadata, ["sub", "provider_id"]) ??
    user.identities?.[0]?.id ??
    user.id
  );
}

export function getUserAvatarColor(seed: string) {
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PROFILE_COLORS[total % PROFILE_COLORS.length];
}

export function profileFromSupabaseUser(user: User, baseProfile: Profile): Profile {
  const displayName = getUserDisplayName(user);
  const usernameSource =
    metadataString(user.user_metadata, ["user_name", "preferred_username", "name"]) ??
    user.email?.split("@")[0];
  const authProvider = getUserAuthProvider(user);

  return {
    ...baseProfile,
    id: user.id,
    displayName,
    username: sanitizeProfileUsername(usernameSource, user.id),
    avatarColor: getUserAvatarColor(user.id),
    avatarUrl: getUserAvatarUrl(user),
    email: user.email,
    authProvider,
    authProviderId: getUserProviderId(user),
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
    identityLabel:
      baseProfile.identityLabel ??
      (authProvider === "google" ? "Google-connected ceramic profile" : "Ceramic profile"),
  };
}
