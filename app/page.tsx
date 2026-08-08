import { Dashboard } from "@/components/dashboard";
import { redirect } from "next/navigation";
import { getCurrentViewer } from "@/lib/mock-auth";

export default async function Home() {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect("/login");

  return <Dashboard viewer={viewer} />;
}
