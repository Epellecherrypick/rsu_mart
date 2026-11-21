import { z } from "zod";
import { getUserFromRequest, isSameOrigin } from "../../../lib/auth";
import { getDatabase } from "../../../lib/mongodb";
import { isDevelopmentAuthEnabled } from "../../../lib/dev-auth";
import { inspectRequest } from "../../../lib/security";
import { clientIp, tokenReference } from "../../../lib/tokens";

const schema=z.object({tokens:z.number().int().min(100).max(1_000_000),accountNumber:z.string().regex(/^\d{10}$/),accountName:z.string().trim().min(2).max(80),phone:z.string().trim().regex(/^\+?[0-9]{7,15}$/)});

export async function POST(request){
  if(!isSameOrigin(request))return Response.json({error:"Invalid request origin."},{status:403});
  const user=await getUserFromRequest(request);if(!user)return Response.json({error:"Sign in to continue."},{status:401});
  if(user.sellerStatus!=="paid")return Response.json({error:"Seller approval is required."},{status:403});
  const blocked=await inspectRequest(request,"withdrawal",`${clientIp(request)}:${user._id}`,5,15*60*1000);if(blocked)return blocked;
  let body;try{body=await request.json()}catch{return Response.json({error:"Invalid request body."},{status:400})}
  const parsed=schema.safeParse(body);if(!parsed.success)return Response.json({error:"Enter a valid token amount and Nigerian account details."},{status:400});
  if(isDevelopmentAuthEnabled()){
    const state=globalThis.__rsuMartDevelopmentAuth;
    if(Number(user.tokenBalance||0)<parsed.data.tokens)return Response.json({error:"Insufficient tokens."},{status:409});
    user.tokenBalance-=parsed.data.tokens;
    state.tokenLedger.push({reference:`${tokenReference("WDR")}-DEBIT`,userId:user._id,type:"withdrawal_reserve",tokens:-parsed.data.tokens,createdAt:new Date()});
    const record={reference:tokenReference("WDR"),userId:user._id,...parsed.data,status:"pending",createdAt:new Date()};
    state.withdrawalsByReference.set(record.reference,record);
    return Response.json({withdrawal:{reference:record.reference,amountNaira:record.tokens,status:"pending"}},{status:201});
  }
  const database=await getDatabase();
  const record={reference:tokenReference("WDR"),userId:user._id,...parsed.data,status:"pending",createdAt:new Date()};
  const session=database.client.startSession();
  try{
    await session.withTransaction(async()=>{
      const current=await database.collection("users").findOne({_id:user._id},{session});
      if(Number(current?.tokenBalance||0)<parsed.data.tokens)throw Object.assign(new Error("insufficient_tokens"),{code:"insufficient_tokens"});
      await database.collection("users").updateOne({_id:user._id},{$inc:{tokenBalance:-parsed.data.tokens}},{session});
      await database.collection("withdrawals").insertOne(record,{session});
      await database.collection("token_ledger").insertOne({reference:`${record.reference}-DEBIT`,userId:user._id,type:"withdrawal_reserve",tokens:-parsed.data.tokens,withdrawalReference:record.reference,createdAt:record.createdAt},{session});
    });
  }catch(error){if(error?.code==="insufficient_tokens")return Response.json({error:"Insufficient tokens."},{status:409});throw error;}finally{await session.endSession();}
  return Response.json({withdrawal:{reference:record.reference,amountNaira:record.tokens,status:"pending"}},{status:201});
}
