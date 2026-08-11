import { Dashboard } from "@/components/dashboard";
import { redirect } from "next/navigation";
import { getCurrentViewer, getManagedMockUsers } from "@/lib/mock-auth";

export default async function Home() {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/login");

  const managedUsers = viewer.role === "admin" ? getManagedMockUsers() : [];

  return <Dashboard viewer={viewer} managedUsers={managedUsers} />;
}
