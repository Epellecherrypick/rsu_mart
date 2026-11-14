import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSession, SESSION_COOKIE } from "../../../lib/auth";
import SellerShopForm from "./seller-shop-form";

export const metadata = {
  title: "Set up your shop — RSU Mart",
};

export default async function SellerShopPage() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fseller%2Fshop");
  if (user.sellerStatus !== "paid") redirect("/seller");

  return <SellerShopForm />;
}
