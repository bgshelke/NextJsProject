import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { SubOrderStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let date = searchParams.get("date");
    const to = searchParams.get("to");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const isValidDate = (date: string) => !isNaN(Date.parse(date));

    if (!date) date = new Date().toISOString().split("T")[0];
    if (!isValidDate(date))
      return ApiResponse(false, "Invalid date format", 400);

    const startDate = date ? new Date(date) : new Date();
    const endDate =
      to && to !== "undefined" && isValidDate(to) ? new Date(to) : startDate;

    const statusFilter = status ? (status as SubOrderStatus) : undefined;

    const subOrders = await prisma.subOrders.findMany({
      where: {
        order: {
          status: { not: "UPCOMING"},
          customerId: customerId ? customerId : undefined,
        },
        status: statusFilter,
        deliveryDate: {
          lte: endDate,
          gte: startDate,
        },
      },
      orderBy: {
        deliveryDate: "desc",
      },
      select: {
        id: true,
        deliveryDate: true,
        timeSlotStart: true,
        timeSlotEnd: true,
        subOrderID: true,
        total: true,
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

  
    const dabbah = await prisma.dabbah.findMany({
      where: {
        order: {
          status: { not: "UPCOMING" },
          customerId: customerId ? customerId : undefined,
        },
        status: statusFilter,
        deliveryDate: {
          lte: endDate,
          gte: startDate,
        },
      },
      orderBy: {
        deliveryDate: "desc",
      },
      select: {
        id: true,
        deliveryDate: true,
        timeSlotStart: true,
        timeSlotEnd: true,
        dabbahID: true,
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

 
    let guestDabbah
    if(!customerId){
    guestDabbah = await prisma.guestDabbah.findMany({
        where: {
          order: {
            status: { not: "UPCOMING" },
          },
          status: statusFilter,
          deliveryDate: {
            lte: endDate,
            gte: startDate,
          },
        },
        orderBy: {
          deliveryDate: "desc",
        },
        select: {
          id: true,
          deliveryDate: true,
          timeSlotStart: true,
          timeSlotEnd: true,
          dabbahID: true,
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
    }

    
    const guestDabbahItems = await prisma.orderItem.findMany({
      where: {
        guestDabbahId: {
          in: guestDabbah?.map((order) => order.id),
        },
      },
    });
    const dabbahItems = await prisma.orderItem.findMany({
      where: {
        dabbahId: {
          in: dabbah?.map((order) => order.id),
        },
      },
    });


    const subItems = await prisma.orderItem.findMany({
      where: {
        subOrderId: {
          in: subOrders?.map((order) => order.id),
        },
      },
    });


    const combinedData = [
      ...subOrders.map((order) => ({
        ...order,
        items: subItems.map((item) => ({
          id: item.itemId,
          quantity: item.quantity,
          refundQuantity: item.refundQuantity,
        })),
        deliveryId: order.subOrderID,
        orderType: "SUBSCRIPTION",
      })),
      ...dabbah.map((order) => ({
        ...order,
        items: dabbahItems.map((item) => ({
          id: item.itemId,
          quantity: item.quantity,
          refundQuantity: item.refundQuantity,
        })),
        deliveryId: order.dabbahID,
        orderType: "DABBHAH",
      })),
      ...(guestDabbah || []).map((order) => ({
        ...order,
        items: guestDabbahItems.map((item) => ({
          id: item.itemId,
          quantity: item.quantity,
          refundQuantity: item.refundQuantity,
        })),
        deliveryId: order.dabbahID,
        orderType: "GUESTDABBHAH",
      })),
    ];
 
    return ApiResponse(
      true,
      "Deliveries fetched successfully",
      200,
      combinedData
    );
  } catch (error) {
    console.log("Error while fetching deliveries", error);
    return ApiResponse(false, "Error while fetching deliveries", 500);
  }
}
