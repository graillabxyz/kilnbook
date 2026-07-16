import { KilnbookWorkspace } from "./kilnbook-workspace";
import { previewRepository } from "@/lib/services/kilnbook-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await previewRepository.getWorkspaceSnapshot("anonymous");

  return <KilnbookWorkspace snapshot={snapshot} />;
}
