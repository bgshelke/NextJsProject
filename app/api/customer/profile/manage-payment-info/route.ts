export const dynamic = "force-dynamic";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { ApiResponse } from "@/lib/response";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";


export async function GET(req: Request) {
  try {
    const userSession = await getServerSession(authOptions);
    const user = userSession?.user;
    if (!user) {
      return ApiResponse(true, "Unauthorized", 401);
    }

    const getStripeUser = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    const stripeCustomer = getStripeUser.data[0];

    if (!stripeCustomer) {
      return ApiResponse(false, "User not found", 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.id,
      return_url: process.env.NEXT_PUBLIC_URL,
    });
    return ApiResponse(true, "Manage Payment Info", 200, session.url);
  } catch (err) {
    console.log(err);
    return ApiResponse(false, "Something went wrong. Please try again", 500);
  }
}
