import { NextResponse } from "next/server";

import { ApiResponse } from "@/lib/response";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/db";

export async function GET(
  req: Request,
) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  try {
    if (!orderId) {
      return ApiResponse(false, "Order ID is required", 400);
    }

    const user = await getServerSession(authOptions);
    if (!user || user.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }
    const customer = await prisma.customer.findUnique({
      where: {
        userId: user.user.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }
    console.log(orderId);
    const userorder = await prisma.order.findUnique({
      where: {
        orderID: orderId,
        customerId: customer.id,
      },
      select: {
        billingInfo: true,
      },
    });

    if (!userorder) {
      return ApiResponse(false, "Order not found", 404);
    }

    const billingInfo = userorder.billingInfo;
    return ApiResponse(true, "User address", 200, billingInfo);
  } catch (error) {
    return ApiResponse(false, "Internal server error", 500, error);
  }
}
