export const dynamic = "force-dynamic";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

import { getServerSession } from "next-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderID = searchParams.get("orderID");
    const status = searchParams.get("status");

    const addOns = searchParams.get("addOns");
    const subOrderID = searchParams.get("id");
    const currentDate = new Date().toISOString().split("T")[0];

    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiResponse(false, "Unauthorized", 401);
    }
    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }
    if (addOns && subOrderID && subOrderID.length > 5) {
      const getSubOrder = await prisma.subOrders.findUnique({
        where: {
          subOrderID: subOrderID,
          status: "ACCEPTED",
          order: {
            customerId: customer.id,
            planType: "SUBSCRIPTION",
          },
        },
        select: {
          id: true,
          subOrderID: true,
          deliveryDate: true,
          timeSlotEnd: true,
          timeSlotStart: true,
          status: true,
          items: {
            select: {
              id: true,
              itemPrice: true,
              quantity: true,
              refundQuantity: true,
            },
          },
          total: true,
          thumbnail: true,
        },
      });
      if (!getSubOrder) {
        return ApiResponse(false, "Order not found", 404, []);
      }
      return ApiResponse(true, "Order found", 200, getSubOrder);
    }
    const items = await prisma.item.findMany({
      select: {
        id: true,
        mealPreference: true,
      },
    });
    if (orderID && status === "active") {
      const getActiveOrder = await prisma.subOrders.findMany({
        where: {
          order: {
            customerId: customer.id,
            orderID: orderID,
            planType: "SUBSCRIPTION",
          },
          NOT: {
            OR: [
              { status: { in: ["DELIVERED", "CANCELLED", "REFUNDED"] } },
              { deliveryDate: { lt: new Date(currentDate) } },
            ],
          },
          deliveryDate: new Date(currentDate),
        },
        orderBy: {
          deliveryDate: "asc",
        },
        select: {
          id: true,
          subOrderID: true,
          deliveryDate: true,
          timeSlotEnd: true,
          timeSlotStart: true,
          items: {
            select: {
              itemId: true,
              quantity: true,
              refundQuantity: true,
            },
          },
          status: true,
          thumbnail: true,
        },
      });

      const mealPreferencesMap = new Map(
        items.map((item) => [item.id, item.mealPreference])
      );

      const ordersWithPreferences = getActiveOrder.map((order) => {
        const uniquePreferences = Array.from(
          new Set(
            order.items.map(
              (item) => mealPreferencesMap.get(item.itemId) || "VEG"
            )
          )
        );
        return {
          ...order,
          mealPreferences: uniquePreferences,
        };
      });

      if (!ordersWithPreferences.length && !getActiveOrder) {
        return ApiResponse(false, "No active orders found", 404, []);
      }
      return ApiResponse(true, "Active orders", 200, ordersWithPreferences);
    }

    if (orderID && status === "upcoming") {
      const getUpcomingOrder = await prisma.subOrders.findMany({
        where: {
          order: {
            customerId: customer.id,
            orderID: orderID,
            planType: "SUBSCRIPTION",
          },
          deliveryDate: { gt: new Date(currentDate) },
          NOT: {
            status: { in: ["DELIVERED", "CANCELLED", "REFUNDED"] },
          },
        },
        orderBy: {
          deliveryDate: "asc",
        },
        select: {
          id: true,
          subOrderID: true,
          deliveryDate: true,
          timeSlotEnd: true,
          timeSlotStart: true,
          items: {
            select: {
              itemId: true,
              quantity: true,
              refundQuantity: true,
            },
          },
          status: true,
          thumbnail: true,
        },
      });

      const mealPreferencesMap = new Map(
        items.map((item) => [item.id, item.mealPreference])
      );

      const ordersWithPreferences = getUpcomingOrder.map((order) => {
        const uniquePreferences = Array.from(
          new Set(
            order.items.map(
              (item) => mealPreferencesMap.get(item.itemId) || "VEG"
            )
          )
        );
        return {
          ...order,
          mealPreferences: uniquePreferences,
        };
      });

      if (!getUpcomingOrder && !ordersWithPreferences.length) {
        return ApiResponse(false, "No upcoming orders found", 404, []);
      }

      return ApiResponse(true, "Upcoming orders", 200, ordersWithPreferences);
    }

    if (orderID && status === "delivered") {
      const getDeliveredOrder = await prisma.subOrders.findMany({
        where: {
          order: {
            customerId: customer.id,
            orderID: orderID,
            planType: "SUBSCRIPTION",
          },
          deliveryDate: { lt: new Date(currentDate) },
        },
        orderBy: {
          deliveryDate: "asc",
        },
        select: {
          id: true,
          subOrderID: true,
          deliveryDate: true,
          timeSlotEnd: true,
          timeSlotStart: true,
          items: {
            select: {
              itemId: true,
              quantity: true,
              refundQuantity: true,
            },
          },
          thumbnail: true,
          status: true,
        },
      });

      const mealPreferencesMap = new Map(
        items.map((item) => [item.id, item.mealPreference])
      );

      const ordersWithPreferences = getDeliveredOrder.map((order) => {
        const uniquePreferences = Array.from(
          new Set(
            order.items.map(
              (item) => mealPreferencesMap.get(item.itemId) || "VEG"
            )
          )
        );
        return {
          ...order,
          mealPreferences: uniquePreferences,
        };
      });

      if (!getDeliveredOrder && !ordersWithPreferences.length) {
        return ApiResponse(false, "No delivered orders found", 404, []);
      }

      return ApiResponse(true, "Delivered orders", 200, ordersWithPreferences);
    }

    if (orderID && status === "cancelled") {
      const getCancelledOrder = await prisma.subOrders.findMany({
        where: {
          order: {
            customerId: customer.id,
            orderID: orderID,
            planType: "SUBSCRIPTION",
          },
          status: { in: ["CANCELLED", "REFUNDED"] },
        },
        orderBy: {
          deliveryDate: "asc",
        },
        select: {
          id: true,
          subOrderID: true,
          deliveryDate: true,
          timeSlotEnd: true,
          timeSlotStart: true,
          items: {
            select: {
              itemId: true,
              quantity: true,
              refundQuantity: true,
            },
          },
          thumbnail: true,
          status: true,
        },
      });

      const mealPreferencesMap = new Map(
        items.map((item) => [item.id, item.mealPreference])
      );

      const ordersWithPreferences = getCancelledOrder.map((order) => {
        const uniquePreferences = Array.from(
          new Set(
            order.items.map(
              (item) => mealPreferencesMap.get(item.itemId) || "VEG"
            )
          )
        );
        return {
          ...order,
          mealPreferences: uniquePreferences,
        };
      });

      if (!getCancelledOrder && !ordersWithPreferences.length) {
        return ApiResponse(false, "No cancelled orders found", 404, []);
      }

      return ApiResponse(true, "Cancelled orders", 200, ordersWithPreferences);
    }

    return ApiResponse(false, "Invalid request", 400);
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Something went wrong.Please try again later",
      500
    );
  } finally {
    await prisma.$disconnect();
  }
}
