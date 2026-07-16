import type { Post } from "./domain";

export interface RankingSignals {
  likes: number;
  comments: number;
  replies: number;
  saves: number;
  uniqueInteractors: number;
  createdAt: string;
  spamCommentCount?: number;
  blockedInteractionCount?: number;
  suspendedInteractionCount?: number;
  newAccountInteractionCount?: number;
}

export function scorePopularPost(signals: RankingSignals, now = new Date()): number {
  const ageHours = Math.max(
    (now.getTime() - new Date(signals.createdAt).getTime()) / 3_600_000,
    0,
  );
  const engagement =
    signals.likes * 1 +
    signals.comments * 2.1 +
    signals.replies * 1.35 +
    signals.saves * 2.4 +
    signals.uniqueInteractors * 1.25;
  const abusePenalty =
    (signals.spamCommentCount ?? 0) * 2.5 +
    (signals.blockedInteractionCount ?? 0) * 2 +
    (signals.suspendedInteractionCount ?? 0) * 3 +
    (signals.newAccountInteractionCount ?? 0) * 0.6;
  const timeDecay = 1 / (1 + ageHours / 22) ** 1.34;
  return roundTo(Math.max(engagement - abusePenalty, 0) * timeDecay, 3);
}

export function rankPopularPosts(posts: Post[], now = new Date()): Post[] {
  return [...posts].sort(
    (a, b) =>
      scorePopularPost(b, now) - scorePopularPost(a, now) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function roundTo(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

