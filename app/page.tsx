import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { listManagedUsersFor } from "@/lib/services/auth/auth-service";
import { getCurrentViewer } from "@/lib/services/auth/session";

export default async function Home() {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/login");

  return <Dashboard viewer={viewer} managedUsers={listManagedUsersFor(viewer)} />;
}
