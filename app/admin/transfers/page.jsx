import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSession, isAdminUser, SESSION_COOKIE } from "../../../lib/auth";
import AdminTransferQueue from "./transfer-queue";

export const metadata = { title: "Seller transfer approvals — RSU Mart" };

export default async function AdminTransfersPage() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fadmin%2Ftransfers");
  if (!isAdminUser(user)) redirect("/");
  return <AdminTransferQueue />;
}
