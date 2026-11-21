import { getUserFromRequest,isAdminUser } from "../../../../lib/auth";
import { getDatabase } from "../../../../lib/mongodb";
import { isDevelopmentAuthEnabled } from "../../../../lib/dev-auth";

export async function GET(request){
 const user=await getUserFromRequest(request);if(!isAdminUser(user))return Response.json({error:"Admin access required."},{status:403});
 if(isDevelopmentAuthEnabled())return Response.json({events:[...globalThis.__rsuMartDevelopmentAuth.securityEvents].reverse().slice(0,500)});
 const database=await getDatabase();const events=await database.collection("security_events").find().sort({createdAt:-1}).limit(500).toArray();return Response.json({events});
}
