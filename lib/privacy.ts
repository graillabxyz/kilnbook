import type { Profile, UserPlan, Visibility } from "./domain";

export interface ViewerContext {
  viewerId?: string;
  followingProfileIds: string[];
  studioIds: string[];
  blockedProfileIds: string[];
  plan: UserPlan;
}

export interface RecordAccessSubject {
  ownerId: string;
  studioId?: string;
  visibility: Visibility;
}

export function canViewRecord(
  viewer: ViewerContext,
  subject: RecordAccessSubject,
): boolean {
  if (viewer.blockedProfileIds.includes(subject.ownerId)) return false;
  if (viewer.viewerId === subject.ownerId) return true;
  if (subject.visibility === "public") return true;
  if (subject.visibility === "followers") {
    return viewer.followingProfileIds.includes(subject.ownerId);
  }
  if (subject.visibility === "studio" && subject.studioId) {
    return viewer.studioIds.includes(subject.studioId);
  }
  return false;
}

export function redactPrivateProfile(profile: Profile, viewer: ViewerContext): Profile {
  if (canViewRecord(viewer, { ownerId: profile.id, visibility: profile.profileVisibility })) {
    return profile;
  }

  return {
    ...profile,
    biography: "",
    email: undefined,
    authProviderId: undefined,
    locationLabel: undefined,
    website: undefined,
    specialties: [],
  };
}
