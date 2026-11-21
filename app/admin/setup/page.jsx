import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSession, isAdminUser, isAllowlistedAdminEmail, SESSION_COOKIE } from "../../../lib/auth";
import AdminSetupForm from "./setup-form";

export const metadata = { title: "Admin account setup — RSU Mart" };

export default async function AdminSetupPage() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fadmin%2Fsetup");
  if (!isAllowlistedAdminEmail(user.email)) redirect("/");
  if (isAdminUser(user)) redirect("/admin");
  return <AdminSetupForm />;
}
