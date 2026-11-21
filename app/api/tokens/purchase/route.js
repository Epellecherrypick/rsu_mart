import { z } from "zod";
import { ObjectId } from "mongodb";
import { getUserFromRequest, isSameOrigin } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { isDevelopmentAuthEnabled } from "../../../../lib/dev-auth";
import { inspectRequest, logSecurityEvent } from "../../../../lib/security";
import { clientIp, discountedPriceTokens, sellerAmountForPrice, tokenReference } from "../../../../lib/tokens";

const schema=z.object({productId:z.string().min(1),variantId:z.string().optional()});

export async function POST(request){
  if(!isSameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});
  const buyer=await getUserFromRequest(request); if(!buyer)return Response.json({error:"Sign in to continue."},{status:401});
  const blocked=await inspectRequest(request,"token-purchase",`${clientIp(request)}:${buyer._id}`,10,15*60*1000); if(blocked)return blocked;
  let body;try{body=await request.json()}catch{return Response.json({error:"Invalid request body."},{status:400})}
  const parsed=schema.safeParse(body);if(!parsed.success)return Response.json({error:"Choose a valid product."},{status:400});

  if(isDevelopmentAuthEnabled()){
    const state=globalThis.__rsuMartDevelopmentAuth;
    const ledger=state.tokenLedger.filter((entry)=>String(entry.userId)===String(buyer._id));
    const derived=ledger.reduce((sum,entry)=>sum+entry.tokens,0);
    if(derived!==Number(buyer.tokenBalance||0)){
      buyer.accountFlag={type:"token_balance_mismatch",createdAt:new Date()};
      await logSecurityEvent({type:"account_flagged",reason:"token_balance_mismatch",userId:buyer._id.toString()});
      return Response.json({error:"Purchase cancelled. Your token balance could not be verified."},{status:409});
    }
    const product=[...state.productsById.values()].find((item)=>item._id===parsed.data.productId&&item.isActive);
    if(!product)return Response.json({error:"Product not found."},{status:404});
    const variant=parsed.data.variantId?product.variants.find((item)=>item.id===parsed.data.variantId):product.variants.find((item)=>item.id===product.defaultVariantId)||product.variants[0];
    if(!variant||variant.inventory<1)return Response.json({error:"This product is out of stock."},{status:409});
    const price=discountedPriceTokens(product,buyer._id);
    if(price>derived){
      buyer.accountFlag={type:"token_spend_exceeds_balance",createdAt:new Date()};
      await logSecurityEvent({type:"account_flagged",reason:"token_spend_exceeds_balance",userId:buyer._id.toString()});
      return Response.json({error:"Purchase cancelled. Insufficient verified tokens."},{status:409});
    }
    const now=new Date(); const reference=tokenReference("PUR");
    buyer.tokenBalance=derived-price;
    variant.inventory-=1;
    const seller=state.usersById.get(product.ownerId);
    const sellerCredit=sellerAmountForPrice(price);
    if(seller){seller.tokenBalance=Number(seller.tokenBalance||0)+sellerCredit}
    state.tokenLedger.push({reference:`${reference}-BUYER`,userId:buyer._id,type:"purchase",tokens:-price,purchaseReference:reference,createdAt:now});
    state.tokenLedger.push({reference:`${reference}-SELLER`,userId:product.ownerId,type:"sale_credit",tokens:sellerCredit,purchaseReference:reference,createdAt:now});
    state.tokenLedger.push({reference:`${reference}-FEE`,userId:"platform",type:"platform_fee",tokens:price-sellerCredit,purchaseReference:reference,createdAt:now});
    state.tokenPurchasesByReference.set(reference,{reference,buyerId:buyer._id,sellerId:product.ownerId,productId:product._id,amount:price,sellerCredit,status:"pending_reconciliation",createdAt:now});
    await logSecurityEvent({type:"token_purchase",buyerId:buyer._id.toString(),reference,amount:price});
    return Response.json({success:true,purchase:{reference,amount:price,sellerCredit,status:"pending_reconciliation"}}, {status:201});
  }

  const database=await getDatabase();
  const session=database.client.startSession();
  try{
    let result;
    await session.withTransaction(async()=>{
      const users=database.collection("users"); const products=database.collection("products");
      const buyerCurrent=await users.findOne({_id:buyer._id},{session});
      const ledger=await database.collection("token_ledger").aggregate([{$match:{userId:buyer._id}},{$group:{_id:null,total:{$sum:"$tokens"}}}],{session}).toArray();
      const derived=ledger[0]?.total||0;
      if(derived!==Number(buyerCurrent?.tokenBalance||0))throw Object.assign(new Error("balance_mismatch"),{code:"balance_mismatch"});
      let productId;try{productId=new ObjectId(parsed.data.productId)}catch{throw Object.assign(new Error("product_not_found"),{code:"product_not_found"})}
      const product=await products.findOne({_id:productId,isActive:true},{session});if(!product)throw Object.assign(new Error("product_not_found"),{code:"product_not_found"});
      const variantId=parsed.data.variantId;
      const variant=variantId?product.variants.find((item)=>item.id===variantId):product.variants.find((item)=>item.id===product.defaultVariantId)||product.variants[0];
      if(!variant||variant.inventory<1)throw Object.assign(new Error("out_of_stock"),{code:"out_of_stock"});
      const price=discountedPriceTokens(product,buyer._id);if(price>derived)throw Object.assign(new Error("insufficient_tokens"),{code:"insufficient_tokens"});
      const sellerCredit=sellerAmountForPrice(price);const now=new Date();const reference=tokenReference("PUR");
      await users.updateOne({_id:buyer._id},{$inc:{tokenBalance:-price}}, {session});
      await users.updateOne({_id:product.ownerId},{$inc:{tokenBalance:sellerCredit}}, {session});
      await products.updateOne({_id:product._id,"variants.id":variant.id},{$inc:{ "variants.$.inventory":-1}}, {session});
      await database.collection("token_ledger").insertMany([
        {reference:`${reference}-BUYER`,userId:buyer._id,type:"purchase",tokens:-price,purchaseReference:reference,createdAt:now},
        {reference:`${reference}-SELLER`,userId:product.ownerId,type:"sale_credit",tokens:sellerCredit,purchaseReference:reference,createdAt:now},
        {reference:`${reference}-FEE`,userId:"platform",type:"platform_fee",tokens:price-sellerCredit,purchaseReference:reference,createdAt:now},
      ],{session});
      await database.collection("token_purchases").insertOne({reference,buyerId:buyer._id,sellerId:product.ownerId,productId:product._id,variantId:variant.id,amount:price,sellerCredit,status:"pending_reconciliation",createdAt:now},{session});
      result={reference,amount:price,sellerCredit,status:"pending_reconciliation"};
    });
    await logSecurityEvent({type:"token_purchase",buyerId:buyer._id.toString(),reference:result.reference,amount:result.amount});
    return Response.json({success:true,purchase:result},{status:201});
  }catch(error){
    if(error?.code==="balance_mismatch"){
      await usersFlag(database,buyer._id,"token_balance_mismatch");return Response.json({error:"Purchase cancelled. Your token balance could not be verified."},{status:409});
    }
    if(error?.code==="insufficient_tokens"){
      await usersFlag(database,buyer._id,"token_spend_exceeds_balance");return Response.json({error:"Purchase cancelled. Insufficient verified tokens."},{status:409});
    }
    if(error?.code==="product_not_found")return Response.json({error:"Product not found."},{status:404});
    if(error?.code==="out_of_stock")return Response.json({error:"This product is out of stock."},{status:409});
    console.error("Token purchase failed:",error);return Response.json({error:"Purchase could not be completed."},{status:503});
  }finally{await session.endSession();}
}
async function usersFlag(database,userId,type){
  await database.collection("users").updateOne({_id:userId},{$set:{accountFlag:{type,createdAt:new Date()}}});
  await logSecurityEvent({type:"account_flagged",reason:type,userId:userId.toString()});
}
