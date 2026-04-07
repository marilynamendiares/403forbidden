import { getRouteErrorResponse } from "@/server/api";
import { error, json } from "@/server/http";
import { signUpWithEmail } from "@/server/services/authFlow";

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();
    if (!email || !password || !username) {
      return error("Missing fields", 400);
    }

    const result = await signUpWithEmail({ email, password, username });
    return json(result);
  } catch (routeError) {
    console.error(routeError);
    return getRouteErrorResponse(routeError, "Internal server error");
  }
}
