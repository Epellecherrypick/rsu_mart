import { redirect } from "next/navigation";

export default function AdminWithdrawalsAlias() {
  redirect("/admin/finance#withdrawals");
}
