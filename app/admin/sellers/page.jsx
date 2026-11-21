import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSession, isAdminUser, SESSION_COOKIE } from "../../../lib/auth";
import AdminTransferQueue from "../transfers/transfer-queue";

export const metadata = { title: "Seller account purchases — RSU Mart" };

export default async function SellerPurchasesDashboard() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fadmin%2Fsellers");
  if (!isAdminUser(user)) redirect("/");
  return <AdminTransferQueue />;
}
