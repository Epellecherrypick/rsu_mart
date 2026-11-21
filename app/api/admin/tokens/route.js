import { z } from "zod";
import { getUserFromRequest, isAdminUser, isSameOrigin } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { isDevelopmentAuthEnabled } from "../../../../lib/dev-auth";
import { inspectRequest, logSecurityEvent } from "../../../../lib/security";
import { clientIp } from "../../../../lib/tokens";

async function requireAdmin(request) {
  const user = await getUserFromRequest(request);
  if (!user) return { response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (!isAdminUser(user)) return { response: Response.json({ error: "Admin access is required." }, { status: 403 }) };
  return { user };
}

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;
  if (isDevelopmentAuthEnabled()) {
    const records = [...globalThis.__rsuMartDevelopmentAuth.tokenRequestsByReference.values()].sort((a,b) => b.createdAt-a.createdAt);
    return Response.json({ requests: records.map((item) => {
      const customer = globalThis.__rsuMartDevelopmentAuth.usersById.get(item.userId);
      return { reference:item.reference, tokens:item.tokens, paymentReference:item.paymentReference, status:item.status, createdAt:item.createdAt, approvedAt:item.approvedAt || null, customer: customer ? { name: customer.name, email: customer.email } : null };
    }) });
  }
  const database = await getDatabase();
  const records = await database.collection("token_requests").find().sort({createdAt:-1}).limit(200).toArray();
  const userIds = [...new Map(records.filter((item) => item.userId).map((item) => [item.userId.toString(), item.userId])).values()];
  const customers = await database.collection("users").find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } }).toArray();
  const customersById = new Map(customers.map((item) => [item._id.toString(), item]));
  return Response.json({ requests: records.map((item) => {
    const customer = customersById.get(item.userId?.toString());
    return { reference:item.reference, tokens:item.tokens, paymentReference:item.paymentReference, status:item.status, createdAt:item.createdAt, approvedAt:item.approvedAt || null, customer: customer ? { name: customer.name, email: customer.email } : null };
  }) });
}

const schema = z.object({ reference: z.string().startsWith("TOK-"), action: z.enum(["approve","reject"]), reason:z.string().max(300).optional() });
export async function PATCH(request) {
  if (!isSameOrigin(request)) return Response.json({ error:"Invalid request origin." }, {status:403});
  const {user:admin,response}=await requireAdmin(request);
  if(response)return response;
  const blocked=await inspectRequest(request,"admin-tokens",`${clientIp(request)}:${admin._id}`,30,15*60*1000);
  if(blocked)return blocked;
  let body; try{body=await request.json()}catch{return Response.json({error:"Invalid request body."},{status:400})}
  const parsed=schema.safeParse(body); if(!parsed.success)return Response.json({error:"Enter a valid token request action."},{status:400});
  const now=new Date();
  if(isDevelopmentAuthEnabled()){
    const record=globalThis.__rsuMartDevelopmentAuth.tokenRequestsByReference.get(parsed.data.reference);
    if(!record||record.status!=="pending")return Response.json({error:"This token request was already reviewed."},{status:409});
    if(parsed.data.action==="approve"){
      record.status="approved"; record.approvedAt=now; record.approvedBy=admin.email;
      const user=globalThis.__rsuMartDevelopmentAuth.usersById.get(record.userId);
      if(!user)return Response.json({error:"Token user account was not found."},{status:404});
      user.tokenBalance=Number(user.tokenBalance||0)+record.tokens;
      globalThis.__rsuMartDevelopmentAuth.tokenLedger.push({reference:`LED-${record.reference}`,userId:record.userId,type:"approved_purchase",tokens:record.tokens,requestReference:record.reference,createdAt:now});
    }else{record.status="rejected";record.rejectedAt=now;record.rejectionReason=parsed.data.reason||"Not approved";}
  }else{
    const database=await getDatabase();
    const requests=database.collection("token_requests");
    const record=await requests.findOne({reference:parsed.data.reference,status:"pending"});
    if(!record)return Response.json({error:"This token request was already reviewed."},{status:409});
    if(parsed.data.action==="approve"){
      const session=database.client.startSession();
      try{
        await session.withTransaction(async()=>{
          const current=await requests.findOne({_id:record._id,status:"pending"},{session});
          if(!current)throw Object.assign(new Error("already_reviewed"),{code:"already_reviewed"});
          await requests.updateOne({_id:record._id,status:"pending"},{$set:{status:"approved",approvedAt:now,approvedByEmail:admin.email,approvedByUserId:admin._id}}, {session});
          await database.collection("users").updateOne({_id:record.userId},{$inc:{tokenBalance:record.tokens}}, {session});
          await database.collection("token_ledger").insertOne({reference:`LED-${record.reference}`,userId:record.userId,type:"approved_purchase",tokens:record.tokens,requestReference:record.reference,createdAt:now}, {session});
        });
      }finally{await session.endSession();}
    }else{
      await requests.updateOne({_id:record._id,status:"pending"},{$set:{status:"rejected",rejectedAt:now,rejectedByEmail:admin.email,rejectionReason:parsed.data.reason||"Not approved"}});
    }
  }
  await logSecurityEvent({type:"token_request_review",adminEmail:admin.email,reference:parsed.data.reference,action:parsed.data.action});
  return Response.json({success:true});
}
