import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSession, isAdminUser, SESSION_COOKIE } from "../../../lib/auth";
import AdminFinanceDashboard from "./finance-dashboard";

export const metadata = { title: "Token requests and withdrawals — RSU Mart" };

export default async function AdminFinancePage() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fadmin%2Ffinance");
  if (!isAdminUser(user)) redirect("/");
  return <AdminFinanceDashboard />;
}
