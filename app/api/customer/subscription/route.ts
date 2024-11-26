export const dynamic = "force-dynamic";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { utcTimeZone } from "@/lib/helper/dateFunctions";
import { ApiResponse } from "@/lib/response";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get("isActive");
    const getTotal = searchParams.get("getTotal");
    const status = searchParams.get("status");
    const user = await getServerSession(authOptions);
    if (!user) {
      return ApiResponse(false, "Unauthorized", 404);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: user?.user?.id,
        email: user?.user?.email,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    const order = await prisma.order.findFirst({
      where: {
        status:
          status === "active"
            ? "ACTIVE"
            : status === "upcoming"
            ? "UPCOMING"
            : "ACTIVE",
        planType: "SUBSCRIPTION",
        customerId: customer?.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        shippingInfo: true,
        orderID: true,
        totalAmount: true,
        status: true,
        planType: true,
        firstDeliveryDate: true,
        deliveryInstructions: true,
        deliveryFees: true,
        invoiceId: true,
        createdAt: true,
      },
    });

    if (!order) {
      return ApiResponse(false, "Order not found", 404);
    }

    const subscriptionItems = await prisma.subOrders.findMany({
      where: {
        orderId: order?.id,
        status: {
          notIn: ["SKIPPED", "REFUNDED"],
        },
      },
      select: {
        id: true,
        items: true,
        deliveryDate: true,
        status: true,
      },
    });

    const mysubItems = await Promise.all(
      subscriptionItems.map(async (subOrder) => {
        const findItems = await prisma.item.findMany({
          where: {
            id: {
              in: subOrder.items.map((item) => item.itemId),
            },
          },
          select: {
            id: true,
            itemName: true,
            price: true,
            unit: true,
          },
        });

        const itemWithQuantity = subOrder.items.map((item) => {
          const findItem = findItems.find((i) => i.id === item.itemId);
          const adjustedQuantity = item.quantity - (item.refundQuantity || 0);
          return {
            ...item,
            itemName: findItem?.itemName?.toLowerCase() || "",
            quantity: adjustedQuantity,
            price: findItem?.price || 0,
            unit: findItem?.unit,
          };
        });

        let totalCost = 0;
        let totalServings = 0;

        const dailyServings = {
          curryAndDal: 0,
          rotiAndRice: 0,
        };

        if (subscriptionItems) {
          itemWithQuantity.forEach((item) => {
            const { quantity = 0, price = 0 } = item;
            const itemName = item?.itemName?.toLowerCase();

            if (itemName?.includes("non-veg curry")) {
              dailyServings.curryAndDal += quantity * 2;
            } else if (
              itemName?.includes("veg curry") &&
              !itemName?.includes("non-veg curry")
            ) {
              dailyServings.curryAndDal += quantity * 2;
            } else if (itemName?.includes("dal")) {
              dailyServings.curryAndDal += quantity * 2;
            } else if (itemName?.includes("rice")) {
              dailyServings.rotiAndRice += quantity * 4;
            } else if (itemName?.includes("roti")) {
              dailyServings.rotiAndRice += quantity * 2;
            }

            totalCost += quantity * price;
          });

          const minServings = Math.max(
            dailyServings.curryAndDal,
            dailyServings.rotiAndRice
          );
          totalServings += minServings;
        }

        const costPerServing = totalServings > 0 ? totalCost : 0;

        const servingsPerDay = totalServings;

        return {
          totalServings,
          costPerServing,
          servingsPerDay,
        };
      })
    );
    const subscriptionDays =
      subscriptionItems.map((subOrder) =>
        format(toZonedTime(subOrder.deliveryDate, utcTimeZone), "EEEE")
      ) || [];
    const hasSubOrders = subscriptionDays.length > 0;

    const calculateAllServings = mysubItems.reduce(
      (total, item) => total + item.totalServings,
      0
    );
    const costPerServing = mysubItems.reduce(
      (total, item) => total + item.costPerServing,
      0
    );
    const totalCostPerServing =
      calculateAllServings > 0 ? costPerServing / calculateAllServings : 0;

    if (getTotal === "true" && isActive === "false") {
      return ApiResponse(true, "Subscription order fetched successfully", 200, {
        subscriptionDays: subscriptionDays.length,
        totalAmount: order.totalAmount,
      });
    }

    if (isActive === "true") {
      if (!hasSubOrders) {
        return ApiResponse(false, "No subscription days found", 404);
      }
      return ApiResponse(true, "Subscription order fetched successfully", 200, {
        ...order,
        subscriptionDays,
        totalServings: calculateAllServings,
        costPerServing: totalCostPerServing,
      });
    }

    return ApiResponse(true, "Subscription order fetched successfully", 200, {
      ...order,
      subscriptionDays,
      totalServings: calculateAllServings,
      costPerServing: totalCostPerServing,
    });
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Something went wrong. Please try again later.",
      500
    );
  }
}
