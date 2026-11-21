import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSession, isAdminUser, SESSION_COOKIE } from "../../lib/auth";
import { getDatabase } from "../../lib/mongodb";
import { isDevelopmentAuthEnabled } from "../../lib/dev-auth";
import AdminDashboard from "./admin-dashboard";

export const metadata = { title: "Admin control panel — RSU Mart" };

export default async function AdminPage() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fadmin");
  if (!isAdminUser(user)) redirect("/");

  let summary = {
    pendingTokenRequests: 0,
    pendingWithdrawals: 0,
    pendingSellerTransfers: 0,
    securityEvents: 0,
  };

  if (isDevelopmentAuthEnabled()) {
    const state = globalThis.__rsuMartDevelopmentAuth;
    summary.pendingTokenRequests = [...(state?.tokenRequestsByReference?.values() || [])].filter((item) => item.status === "pending").length;
    summary.pendingWithdrawals = [...(state?.withdrawalsByReference?.values() || [])].filter((item) => item.status === "pending").length;
    summary.pendingSellerTransfers = [...(state?.paymentsByReference?.values() || [])].filter((item) => item.status === "pending").length;
    summary.securityEvents = state?.securityEvents?.length || 0;
  } else {
    const database = await getDatabase();
    summary.pendingTokenRequests = await database.collection("token_requests").countDocuments({ status: "pending" });
    summary.pendingWithdrawals = await database.collection("withdrawals").countDocuments({ status: "pending" });
    summary.pendingSellerTransfers = await database.collection("payments").countDocuments({ purpose: "seller_onboarding", status: "pending" });
    summary.securityEvents = await database.collection("security_events").countDocuments({});
  }

  return <AdminDashboard summary={summary} />;
}
