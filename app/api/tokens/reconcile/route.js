import { getUserFromRequest, isAdminUser } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { isDevelopmentAuthEnabled } from "../../../../lib/dev-auth";
import { RECONCILIATION_DELAY_MS } from "../../../../lib/tokens";
import { logSecurityEvent } from "../../../../lib/security";

export async function POST(request) {
  const admin = await getUserFromRequest(request);
  if (!isAdminUser(admin)) return Response.json({ error:"Admin access is required." },{status:403});
  const cutoff=new Date(Date.now()-RECONCILIATION_DELAY_MS);
  let reconciled=0, flagged=0;
  if(isDevelopmentAuthEnabled()){
    const state=globalThis.__rsuMartDevelopmentAuth;
    for(const purchase of state.tokenPurchasesByReference.values()){
      if(purchase.status==="pending_reconciliation"&&purchase.createdAt<=cutoff){
        const buyerEntry=state.tokenLedger.find((entry)=>entry.reference===`${purchase.reference}-BUYER`);
        const sellerEntry=state.tokenLedger.find((entry)=>entry.reference===`${purchase.reference}-SELLER`);
        if(buyerEntry?.tokens===-purchase.amount&&sellerEntry?.tokens===purchase.sellerCredit){
          purchase.status="reconciled";purchase.reconciledAt=new Date();reconciled++;
        }else{
          purchase.status="reconciliation_failed";purchase.reconciledAt=new Date();flagged++;
          const user=state.usersById.get(purchase.buyerId);if(user)user.accountFlag={type:"purchase_not_reflected",createdAt:new Date()};
        }
      }
    }
  }else{
    const database=await getDatabase();
    const purchases=await database.collection("token_purchases").find({status:"pending_reconciliation",createdAt:{$lte:cutoff}}).toArray();
    for(const purchase of purchases){
      const entries=await database.collection("token_ledger").find({purchaseReference:purchase.reference}).toArray();
      const buyerEntry=entries.find((entry)=>entry.reference===`${purchase.reference}-BUYER`);
      const sellerEntry=entries.find((entry)=>entry.reference===`${purchase.reference}-SELLER`);
      if(buyerEntry?.tokens===-purchase.amount&&sellerEntry?.tokens===purchase.sellerCredit){
        await database.collection("token_purchases").updateOne({_id:purchase._id,status:"pending_reconciliation"},{$set:{status:"reconciled",reconciledAt:new Date()}});reconciled++;
      }else{
        await database.collection("token_purchases").updateOne({_id:purchase._id,status:"pending_reconciliation"},{$set:{status:"reconciliation_failed",reconciledAt:new Date()}});
        await database.collection("users").updateOne({_id:purchase.buyerId},{$set:{accountFlag:{type:"purchase_not_reflected",createdAt:new Date()}}});flagged++;
      }
    }
  }
  await logSecurityEvent({type:"token_reconciliation",adminEmail:admin.email,reconciled,flagged});
  return Response.json({success:true,reconciled,flagged});
}
