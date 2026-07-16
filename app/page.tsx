import { KilnbookWorkspace } from "./kilnbook-workspace";
import { previewRepository } from "@/lib/services/kilnbook-repository";

export default async function Home() {
  const snapshot = await previewRepository.getWorkspaceSnapshot("anonymous");

  return <KilnbookWorkspace snapshot={snapshot} />;
}
