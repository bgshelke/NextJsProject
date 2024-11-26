import { getUpcomingWeeks } from "@/lib/helper/dateFunctions";
import { ApiResponse } from "@/lib/response";
import { ResponseType } from "@/types/main";
import { parseISO } from "date-fns";
import { authOptions } from "../../auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import prisma from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const findSubscription = await prisma.subscription.findFirst({
      where: {
        customer: {
          userId: session.user.id,
        },
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!findSubscription) {
      return ApiResponse(false, "Subscription not found", 404);
    }

    const getActiveSubscription = await stripe.subscriptions.retrieve(
      findSubscription.subscriptionStripeId
    );
   
    if (getActiveSubscription.status !== "active") {
      return ApiResponse(false, "Subscription not active", 400);
    }

    if (getActiveSubscription.cancel_at) {
      return ApiResponse(
        false,
        "Subscription is scheduled to be cancelled",
        400
      );
    }

    const subscriptionData = {
      created: new Date(getActiveSubscription.created * 1000),
      days_until_due: getActiveSubscription.days_until_due,
      cancel_at_period_end: getActiveSubscription.cancel_at_period_end,
      current_period_start: new Date(
        getActiveSubscription.current_period_start * 1000
      ),
      nextBilling: new Date(getActiveSubscription.current_period_end * 1000),
      status: getActiveSubscription.status,
      cancel_at: getActiveSubscription.cancel_at
        ? new Date(getActiveSubscription.cancel_at * 1000)
        : null,
    };

    const { action } = await request.json();
    const currentPeriodStart = subscriptionData.current_period_start;
    const nextBilling = subscriptionData.nextBilling;
    const currentDate = new Date();



    if (action === "PAUSE_UPCOMING") {
      
      const twentyFourHoursBeforeNextBilling = new Date(nextBilling);
      twentyFourHoursBeforeNextBilling.setHours(twentyFourHoursBeforeNextBilling.getHours() - 48);


      if(getActiveSubscription.pause_collection){
        return ApiResponse(false, "Subscription is already paused", 400);
      }

      if (currentDate > twentyFourHoursBeforeNextBilling) {
        return ApiResponse(
          false,
          "Sorry, you can't pause your subscription within 24 hours of the next billing date.",
          400
        );
      }

      if (currentDate > nextBilling) {
        return ApiResponse(
          false,
          "Sorry, you can't pause your subscription this week.",
          400
        );
      }

      const startDate = parseISO(currentPeriodStart.toISOString());

      const { nextWeekRange } = getUpcomingWeeks(startDate);

      if (nextWeekRange.start < currentDate) {
        return ApiResponse(
          false,
          "Sorry, you can't pause your subscription at this time.",
          400
        );
      }

      const pauseSubscription = await stripe.subscriptions.update(
        findSubscription.subscriptionStripeId,
        {
          pause_collection: {
            behavior: "keep_as_draft",
            resumes_at: getActiveSubscription.current_period_end,
          },
        }
      );


      return ApiResponse(true, "Subscription paused successfully", 200);

    }

    if (action === "RESUME_UPCOMING") {
      
      if (!getActiveSubscription.pause_collection) {
        return ApiResponse(false, "Subscription is not paused", 400);
      }

      if (currentDate < currentPeriodStart || currentDate > nextBilling) {
        return ApiResponse(
          false,
          "Sorry, you can't resume your subscription at this time.",
          400
        );
      }

      const resumeSubscription = await stripe.subscriptions.update(
        findSubscription.subscriptionStripeId,
        {
          pause_collection: null,
        }
      );
    }

    return ApiResponse(true, "Subscription resumed successfully", 200);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Internal Server Error", 500);
  }
}
