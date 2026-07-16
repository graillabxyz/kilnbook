import type {
  CeramicImage,
  ClayBodyProfile,
  ConversationPreview,
  FiringEnvironmentRecord,
  FiringLogPoint,
  FiringRecord,
  FiringSegment,
  GlazeApplication,
  GlazeApplicationLayer,
  GlazeProfile,
  GlazeRecipeVersion,
  KilnProfile,
  Post,
  Profile,
} from "../domain";
import { kilnbookSeed } from "../seed-data";

export interface KilnbookWorkspaceSnapshot {
  viewer: Profile;
  profiles: Profile[];
  kilns: KilnProfile[];
  clayBodies: ClayBodyProfile[];
  glazes: GlazeProfile[];
  glazeRecipeVersions: GlazeRecipeVersion[];
  firings: FiringRecord[];
  firingSegments: FiringSegment[];
  firingLogPoints: FiringLogPoint[];
  firingEnvironmentRecords: FiringEnvironmentRecord[];
  glazeApplications: GlazeApplication[];
  glazeApplicationLayers: GlazeApplicationLayer[];
  images: CeramicImage[];
  posts: Post[];
  conversations: ConversationPreview[];
}

export interface KilnbookRepository {
  getWorkspaceSnapshot(profileId: string): Promise<KilnbookWorkspaceSnapshot>;
}

export class PreviewKilnbookRepository implements KilnbookRepository {
  async getWorkspaceSnapshot(profileId: string): Promise<KilnbookWorkspaceSnapshot> {
    const viewer =
      kilnbookSeed.profiles.find((profile) => profile.id === profileId) ??
      kilnbookSeed.profiles[0];

    return {
      viewer,
      profiles: [...kilnbookSeed.profiles],
      kilns: [...kilnbookSeed.kilns],
      clayBodies: [...kilnbookSeed.clayBodies],
      glazes: [...kilnbookSeed.glazes],
      glazeRecipeVersions: [...kilnbookSeed.glazeRecipeVersions],
      firings: [...kilnbookSeed.firings],
      firingSegments: [...kilnbookSeed.firingSegments],
      firingLogPoints: [...kilnbookSeed.firingLogPoints],
      firingEnvironmentRecords: [...kilnbookSeed.firingEnvironmentRecords],
      glazeApplications: [...kilnbookSeed.glazeApplications],
      glazeApplicationLayers: [...kilnbookSeed.glazeApplicationLayers],
      images: [...kilnbookSeed.images],
      posts: [...kilnbookSeed.posts],
      conversations: [...kilnbookSeed.conversations],
    };
  }
}

export const previewRepository = new PreviewKilnbookRepository();

