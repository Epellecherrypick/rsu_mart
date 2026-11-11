import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SellerDashboard from "./seller-dashboard";
import { getUserForSession, publicUser, SESSION_COOKIE } from "../../lib/auth";

export const metadata = {
  title: "Seller onboarding — RSU Mart",
};

export default async function SellerPage() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fseller");

  return <SellerDashboard user={publicUser(user)} />;
}
