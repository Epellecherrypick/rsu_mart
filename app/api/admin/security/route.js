import { getUserFromRequest,isAdminUser } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { isDevelopmentAuthEnabled } from "../../../../lib/dev-auth";

export async function GET(request){
 const user=await getUserFromRequest(request);if(!isAdminUser(user))return Response.json({error:"Admin access required."},{status:403});
 if(isDevelopmentAuthEnabled()){
  const state=globalThis.__rsuMartDevelopmentAuth;
  const flaggedAccounts=[...(state.usersById?.values()||[])].filter((account)=>account.accountFlag).map((account)=>({id:account._id,name:account.name,email:account.email,accountFlag:account.accountFlag}));
  const purchases=[...(state.tokenPurchasesByReference?.values()||[])].sort((a,b)=>b.createdAt-a.createdAt);
  return Response.json({events:[...state.securityEvents].reverse().slice(0,500),flaggedAccounts,purchases:purchases.map((item)=>({reference:item.reference,amount:item.amount,status:item.status,createdAt:item.createdAt}))});
 }
 const database=await getDatabase();
 const [events,flaggedAccounts,purchases]=await Promise.all([
  database.collection("security_events").find().sort({createdAt:-1}).limit(500).toArray(),
  database.collection("users").find({accountFlag:{$exists:true}}, {projection:{name:1,email:1,accountFlag:1}}).sort({ "accountFlag.createdAt":-1 }).limit(200).toArray(),
  database.collection("token_purchases").find().sort({createdAt:-1}).limit(200).toArray(),
 ]);
 return Response.json({
  events,
   flaggedAccounts: flaggedAccounts.map((account) => ({
     id: account._id.toString(),
     name: account.name,
     email: account.email,
     accountFlag: account.accountFlag,
   })),
   purchases: purchases.map((purchase) => ({
     reference: purchase.reference,
     amount: purchase.amount,
     status: purchase.status,
     createdAt: purchase.createdAt,
   })),
 });
}
