import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { ApiResponse } from "@/lib/response";
import { render } from "@react-email/components";

import { sendEmail } from "@/lib/nodemailer";
import prisma from "@/lib/db";
import SubscriptionCancellationTemplate from "@/components/EmailTemplates/templates/SubscriptionCancellation";

export async function GET(req: Request) {
  try {
    const user = await getServerSession(authOptions);
    if (!user || user.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const userSubscription = await prisma.subscription.findFirst({
      where: {
        customer: {
          userId: user.user.id,
        },
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!userSubscription) {
      return ApiResponse(false, "No active subscription found", 404);
    }

    const getOrder = await prisma.order.findFirst({
      where: {
        subscriptionId: userSubscription?.id,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!getOrder) {
      return ApiResponse(false, "No active order found", 404);
    }

    const getStripeUser = await stripe.customers.list({
      email: user.user.email,
      limit: 1,
    });

    if (!getStripeUser.data.length) {
      return ApiResponse(false, "User not found", 404);
    }

    const stripeCustomer = getStripeUser.data[0];
    if (!stripeCustomer) {
      return ApiResponse(false, "User not found", 404);
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      userSubscription.subscriptionStripeId
    );

    if (!stripeSubscription || stripeSubscription.status !== "active") {
      return ApiResponse(false, "No active subscription found", 404);
    }

    const findAllSubOrders = await prisma.subOrders.findMany({
      where: {
        orderId: getOrder.id,
      },
    });
    //check if all suborders are accepted and their date is 48hr before next billing date and the current date is before the first delivery date
    const checkAllAccepted = findAllSubOrders.every((subOrder) => {
      const deliveryDate = new Date(subOrder.deliveryDate);
      const currentPeriodEnd = new Date(
        stripeSubscription.current_period_end * 1000
      );
      const currentDate = new Date();

      // Check if the delivery date is more than 48 hours away
      const isMoreThan48HoursAway =
        deliveryDate.getTime() - currentDate.getTime() > 48 * 60 * 60 * 1000;

      // Ensure the delivery date is before the end of the current billing period
      const isBeforeCurrentPeriodEnd = deliveryDate <= currentPeriodEnd;

      return (
        subOrder.status === "ACCEPTED" &&
        isMoreThan48HoursAway &&
        isBeforeCurrentPeriodEnd
      );
    });

    const filteredData = {
      created: new Date(stripeSubscription.created * 1000),
      days_until_due: stripeSubscription.days_until_due,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      current_period_start: new Date(
        stripeSubscription.current_period_start * 1000
      ),
      nextBilling: new Date(stripeSubscription.current_period_end * 1000),
      status: stripeSubscription.status,
      cancel_at: stripeSubscription.cancel_at
        ? new Date(stripeSubscription.cancel_at * 1000)
        : null,
      pause_collection: stripeSubscription.pause_collection,
      isCancelableNow: checkAllAccepted,
    };

    return ApiResponse(true, "Active subscription found", 200, filteredData);
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Something went wrong.Please try again later",
      500
    );
  }
}

export async function POST(req: Request) {
  try {
    const { reason } = await req.json();
    const query = new URL(req.url);
    const cancelInPeriod = query.searchParams.get("cancelInPeriod");
    if (!reason) {
      return ApiResponse(false, "Reason is required", 400);
    }
    const user = await getServerSession(authOptions);
    if (!user || user.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const getStripeUser = await stripe.customers.list({
      email: user.user.email,
      limit: 1,
    });

    const stripeCustomer = getStripeUser.data[0];
    if (!stripeCustomer) {
      return ApiResponse(false, "No subscription found", 404);
    }

    const getActiveSubscription = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      status: "active",
    });
    if (!getActiveSubscription.data.length) {
      return ApiResponse(false, "No active subscription found", 404);
    }

    const subscription = getActiveSubscription.data[0];

    if (subscription.status !== "active") {
      return ApiResponse(false, "No active subscription found", 404);
    }
    if (subscription.cancel_at_period_end) {
      return ApiResponse(
        false,
        "You have already requested for cancellation",
        400
      );
    }

    if (cancelInPeriod === "true") {
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: reason,
        },
      });

      const html = await render(
        SubscriptionCancellationTemplate({
          username: user.user.name,
          reason,
          cancellationDate: new Date(
            subscription.current_period_end * 1000
          ).toLocaleString() as string,
        })
      );

      await sendEmail(
        user.user.email,
        "Subscription Cancellation Request",
        html
      );

      return ApiResponse(
        true,
        "Your subscription will be cancelled at the end of the billing period",
        200
      );
    } else {
      const subscriptionCreatedDate = new Date(subscription.created * 1000);

      const currentTime = new Date();

      const timeDifference =
        currentTime.getTime() - subscriptionCreatedDate.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      if (hoursDifference > 24) {
        return ApiResponse(
          false,
          "You can only cancel within 24 hours of subscription creation",
          400
        );
      }

      const order = await prisma.order.findFirst({
        where: {
          subscription: {
            subscriptionStripeId: subscription.id,
          },
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          firstDeliveryDate: true,
        },
      });

      if (!order) {
        return ApiResponse(false, "No active order found", 404);
      }

      const updateSubscription = await stripe.subscriptions.cancel(
        subscription.id
      );

      const lastInvoice = await stripe.invoices.retrieve(
        subscription.latest_invoice as string
      );
      const refundAmount = lastInvoice.amount_paid - (lastInvoice.tax || 0);

      const refund = await stripe.refunds.create({
        charge: lastInvoice.charge as string,
        amount: refundAmount,
        reason: "requested_by_customer",
        metadata: {
          reason: reason,
        },
      });

      if (refund.status === "succeeded") {
        await prisma.subscription.update({
          where: {
            subscriptionStripeId: subscription.id,
          },
          data: {
            isActive: false,
          },
        });

        await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: "CANCELLED",
          },
        });

        await prisma.subOrders.updateMany({
          where: {
            orderId: order.id,
          },
          data: {
            status: "CANCELLED",
          },
        });

        return ApiResponse(
          true,
          "Your subscription has been cancelled and your amount will be refunded shortly.",
          200
        );
      } else {
        return ApiResponse(false, "Refund failed. Please try again later", 500);
      }
    }
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Something went wrong. Please try again later",
      500
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getServerSession(authOptions);
    if (!user || user.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const getStripeUser = await stripe.customers.list({
      email: user.user.email,
      limit: 1,
    });

    const stripeCustomer = getStripeUser.data[0];
    if (!stripeCustomer) {
      return ApiResponse(false, "User not found", 404);
    }

    const getActiveSubscription = await stripe.subscriptions.list({
      customer: stripeCustomer.id,
      status: "active",
    });
    if (!getActiveSubscription.data.length) {
      return ApiResponse(false, "No active subscription found", 404);
    }

    const subscription = getActiveSubscription.data[0];

    if (subscription.status !== "active") {
      return ApiResponse(false, "No active subscription found", 404);
    }
    if (!subscription.cancel_at_period_end) {
      return ApiResponse(false, "You have not requested for cancellation", 400);
    }
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });

    return ApiResponse(
      true,
      "Your subscription cancellation request has been cancelled.",
      200
    );
  } catch (error) {
    return ApiResponse(
      false,
      "Something went wrong.Please try again later",
      500
    );
  }
}
