export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { Item, PickupOrderStatus, SubOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let date = searchParams.get("date");
    const to = searchParams.get("to");
    const orderType = searchParams.get("orderType");
    const status = searchParams.get("status");
    const pickupStatus = searchParams.get("pickupStatus");

    const isValidDate = (date: string) => !isNaN(Date.parse(date));

    if (!date) date = new Date().toISOString().split("T")[0];
    if (!isValidDate(date))
      return ApiResponse(false, "Invalid date format", 400);

    const startDate = date ? new Date(date) : new Date();
    const endDate =
      to && to !== "undefined" && isValidDate(to) ? new Date(to) : startDate;

    const statusFilter = status ? (status as SubOrderStatus) : undefined;
    const pickupStatusFilter = pickupStatus
      ? (pickupStatus as PickupOrderStatus)
      : undefined;

    let itemsToPrepare: { itemId: string; quantity: number }[] = [];
    const graphData: {
      date: Date;
      subscriptionOrders: number;
      oneTimeOrders: number;
      pickupOrders: number;
    }[] = [];
    
    // Initialize orderStats object
    const orderStats = {
      subscriptionOrders: 0,
      oneTimeOrders: 0,
      pickupOrders: 0,
      guestOrders: 0,
      guestPickupOrders: 0,
      skippedOrders: 0,
    };

    if (!orderType || orderType === "SUBSCRIPTION") {
      const findSubOrders = await prisma.subOrders.findMany({
        where: {
          status: statusFilter ? statusFilter : undefined,
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: {
            select: {
              itemId: true,
              quantity: true,
            },
          },
        },
      });
      itemsToPrepare = findSubOrders.flatMap((order) => order.items);
      orderStats.subscriptionOrders = findSubOrders.length;
      orderStats.skippedOrders = findSubOrders.filter(order => order.status === 'SKIPPED').length;
      findSubOrders.forEach((order) => {
        graphData.push({
          ...graphData[0],
          date: order.deliveryDate,
          subscriptionOrders: 1,
        });
      });
    }

    if (!orderType || orderType === "DABBHAH") {
      const findDabbahOrders = await prisma.dabbah.findMany({
        where: {
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
          status: statusFilter ? statusFilter : undefined,
        },
        include: {
          items: {
            select: {
              itemId: true,
              quantity: true,
            },
          },
        },
      });

      const findGuestDabbahOrders = await prisma.guestDabbah.findMany({
        where: {
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
          status: statusFilter ? statusFilter : undefined,
        },
        include: {
          items: {
            select: {
              itemId: true,
              quantity: true,
            },
          },
        },
      });
      
      orderStats.oneTimeOrders += findDabbahOrders.length;
      orderStats.guestOrders += findGuestDabbahOrders.length;
      itemsToPrepare = [
        ...itemsToPrepare,
        ...findDabbahOrders.flatMap((order) => order.items),
        ...findGuestDabbahOrders.flatMap((order) => order.items),
      ];
      findDabbahOrders.forEach((order) => {
        graphData.push({
          ...graphData[0],
          date: order.deliveryDate,
          oneTimeOrders: 1,
        });
      });
      findGuestDabbahOrders.forEach((order) => {
        graphData.push({
          ...graphData[0],
          date: order.deliveryDate,
          oneTimeOrders: 1,
        });
      });
    }

    if (!orderType || orderType === "PICKUP") {
      const findPickupOrders = await prisma.pickupOrder.findMany({
        where: {
          status: pickupStatusFilter ? pickupStatusFilter : undefined,
          pickupDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: {
            select: {
              itemId: true,
              quantity: true,
            },
          },
        },
      });
      const findOnetimeOrders = await prisma.guestPickupOrder.findMany({
        where: {
          pickupDate: {
            gte: startDate,
            lte: endDate,
          },
          status: pickupStatusFilter ? pickupStatusFilter : undefined,
        },
        include: {
          items: {
            select: {
              itemId: true,
              quantity: true,
            },
          },
        },
      });
      
      orderStats.pickupOrders = findPickupOrders.length;
      orderStats.guestPickupOrders = findOnetimeOrders.length;
      itemsToPrepare = [
        ...itemsToPrepare,
        ...findPickupOrders.flatMap((order) => order.items),
        ...findOnetimeOrders.flatMap((order) => order.items),
      ];
      findPickupOrders.forEach((order) => {
        graphData.push({
          ...graphData[0],
          date: order.pickupDate,
          pickupOrders: 1,
        });
      });
      findOnetimeOrders.forEach((order) => {
        graphData.push({
          ...graphData[0],
          date: order.pickupDate,
          oneTimeOrders: 1,
        });
      });
    }

    // Calculate total quantity for each unique itemId
    const consolidatedItems = itemsToPrepare.reduce((acc, item) => {
      const existingItem = acc.find(
        (i: { itemId: string }) => i.itemId === item.itemId
      );
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        acc.push({ itemId: item.itemId, quantity: item.quantity });
      }
      return acc;
    }, [] as { itemId: string; quantity: number }[]);

    // Sort items by quantity in descending order
    consolidatedItems.sort((a, b) => b.quantity - a.quantity);



    return ApiResponse(true, "Kitchen data fetched successfully", 200, {
      graphData,
      consolidatedItems,
      orderStats,
    });
  } catch (error) {
    return ApiResponse(false, "Failed to fetch kitchen data", 500);
  }
}
