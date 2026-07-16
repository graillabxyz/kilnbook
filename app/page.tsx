import { KilnbookWorkspace } from "./kilnbook-workspace";
import { previewRepository } from "@/lib/services/kilnbook-repository";

export default async function Home() {
  const snapshot = await previewRepository.getWorkspaceSnapshot("profile-mara");

  return <KilnbookWorkspace snapshot={snapshot} />;
}

