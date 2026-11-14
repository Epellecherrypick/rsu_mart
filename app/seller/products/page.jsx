import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSession, SESSION_COOKIE } from "../../../lib/auth";
import { getSellerShop } from "../../../lib/shop-products";
import SellerProducts from "./seller-products";

export const metadata = {
  title: "Manage products — RSU Mart",
};

export default async function SellerProductsPage() {
  const cookieStore = await cookies();
  const user = await getUserForSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login?next=%2Fseller%2Fproducts");
  if (user.sellerStatus !== "paid") redirect("/seller");

  const shop = await getSellerShop(user._id);
  if (!shop) redirect("/seller/shop");

  return <SellerProducts shopId={shop._id.toString()} shopName={shop.name} />;
}
