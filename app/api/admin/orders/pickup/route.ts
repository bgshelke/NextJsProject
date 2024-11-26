import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { PickupOrderStatus, SubOrderStatus } from "@prisma/client";
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let date = searchParams.get("date");
    const to = searchParams.get("to");
    const status = searchParams.get("status");

    const isValidDate = (date: string) => !isNaN(Date.parse(date));

    if (!date) date = new Date().toISOString().split("T")[0];
    if (!isValidDate(date))
      return ApiResponse(false, "Invalid date format", 400);

    const startDate = date ? new Date(date) : new Date();
    const endDate =
      to && to !== "undefined" && isValidDate(to) ? new Date(to) : startDate;

    const statusFilter = status ? (status as PickupOrderStatus) : undefined;

    const pickupOrders = await prisma.pickupOrder.findMany({
      where: {
        status: statusFilter,
        pickupDate: {
          lte: endDate,
          gte: startDate,
        },
      },
      orderBy: {
        pickupDate: "desc",
      },
      select: {
        id: true,
        pickupDate: true,
        pickupTime: true,
      
        total: true,
        kitchen: true,
        dabbahID: true,
        order: {
          select: {
            id: true,
            shippingInfo: true,
            planType: true,
          },
        },
        status: true,
      },
    });

    const pickupItems = await prisma.orderItem.findMany({
      where: {
        pickupOrderId: {
          in: pickupOrders.map((order) => order.id),
        },
      },
    });


    const guestPickupOrders = await prisma.guestPickupOrder.findMany({
      where: {
        status: statusFilter,
        pickupDate: {
          lte: endDate,
          gte: startDate,
        },
      },
      orderBy: {
        pickupDate: "desc",
      },
      select: {
        id: true,
        pickupDate: true,
        pickupTime: true,
        dabbahID: true,
        kitchen: true,
        status: true,
        total: true,
        order: {
          select: {
            id: true,
            planType: true,
            shippingInfo: true,
          },
        },
      },
    });
    const findGuestPickupItems = await prisma.orderItem.findMany({
      where: {
        pickupOrderId: {
          in: guestPickupOrders.map((order) => order.id),
        },
      },
      select: {
        id: true,
        pickupOrderId: true,
        itemId: true,
        quantity: true,
        refundQuantity: true,
      },
    });
    const combinedData = [
      ...pickupOrders.map((order) => ({
        ...order,
        items: pickupItems.map((item) => {
          return {
            id: item.itemId,
            quantity: item.quantity,
            refundQuantity: item.refundQuantity,
          };
        }),
        orderType: "PICKUP",
      })),
      ...guestPickupOrders.map((order) => ({
        ...order,
        items: findGuestPickupItems.map((item) => {
          return {
            id: item.itemId,
            quantity: item.quantity,
            refundQuantity: item.refundQuantity,
          };
        }),
        orderType: "GUESTPICKUP",
      })),
    ];

    return ApiResponse(
      true,
      "Pickup orders fetched successfully",
      200,
      combinedData
    );
  } catch (error) {
    console.log("Error while fetching pickup orders", error);
    return ApiResponse(false, "Error while fetching pickup orders", 500);
  }
}
