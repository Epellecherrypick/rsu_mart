import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSession, isAdminUser, SESSION_COOKIE } from "../../../lib/auth";
import AdminReportsDashboard from "./reports-dashboard";

export const metadata = { title: "Reports and monitoring — RSU Mart" };

export default async function AdminReportsPage() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fadmin%2Freports");
  if (!isAdminUser(user)) redirect("/");
  return <AdminReportsDashboard />;
}
