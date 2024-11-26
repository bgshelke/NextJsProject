export const dynamic = "force-dynamic";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  try {
    const orderID = new URL(request.url).searchParams.get("orderID");
    const status = new URL(request.url).searchParams.get("status");

    const user = await getServerSession(authOptions);

    if (!user || user.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }
    const customer = await prisma.customer.findUnique({
      where: {
        userId: user?.user?.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    if (!orderID) {
      return ApiResponse(false, "Order ID is required.", 400);
    }

    const getSubOrder = await prisma.subOrders.findUnique({
      where: {
        subOrderID: orderID,
        status: "ACCEPTED",
        order: {
          customerId: customer.id,
          planType: "SUBSCRIPTION",
          status: status === "upcoming" ? "UPCOMING" : "ACTIVE",
        },
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
          },
        },
        order: {
          select: {
            orderID: true,
          },
        },
      },
    });
    if (!getSubOrder) {
      return ApiResponse(false, "Order not found.", 404);
    }

    const order = await prisma.order.findUnique({
      where: {
        orderID: getSubOrder.order.orderID,
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
      },
    });

    if (!order) return ApiResponse(false, "Order not found.", 404);

    const totalAmount = order.totalAmount;
    const subOrder = await prisma.subOrders.findMany({
      where: {
        orderId: order.id,
        status: {
          not: "CANCELLED",
        },
      },
    });

    const myorder = {
      ...getSubOrder,
      totalAmount: totalAmount,
      orderedDays: subOrder.length,
    };

    return ApiResponse(true, "Order found", 200, myorder);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong. Please try again.", 500);
  } finally {
    await prisma.$disconnect();
  }
}
