export const dynamic = "force-dynamic";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  try {
    const orderID = new URL(request.url).searchParams.get("orderID");
    const days = new URL(request.url).searchParams.get("days");
    const user = await getServerSession(authOptions);

    if (!user) {
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

    if (orderID && days) {
      const order = await prisma.order.findUnique({
        where: {
          orderID,
          customerId: customer?.id,
          status: {
            in: ["ACTIVE", "UPCOMING"],
          },
        },
        select: {
          id: true,
          orderID: true,
          firstDeliveryDate: true,
          deliveryFees: true,
          subOrders: {
            orderBy: {
              deliveryDate: "asc",
            },
            select: {
              id: true,
              deliveryDate: true,
              timeSlotEnd: true,
              timeSlotStart: true,
              subOrderID: true,
            },
          },
        },
      });

      return ApiResponse(
        true,
        "Order details fetched successfully",
        200,
        order
      );
    }

    if (orderID) {
      const myOrder = await prisma.order.findUnique({
        where: {
          orderID,
          customerId: customer?.id,
        },

        select: {
          id: true,
          orderID: true,
          status: true,
          shippingInfo: true,
          billingInfo: true,
          planType: true,
          deliveryFees: true,
          createdAt: true,
          firstDeliveryDate: true,
          deliveryInstructions: true,
        },
      });

      if (!myOrder) {
        return ApiResponse(false, "Order not found", 404);
      }

      const dabbah = await prisma.dabbah.findUnique({
        where: {
          orderId: myOrder.id,
        },
        select:{
          items:{
            select:{
              itemId:true,
              quantity:true,
            }
          }
        }
      });
      const pickupOrder = await prisma.pickupOrder.findUnique({
        where: {
          orderId: myOrder.id,
        },
        select:{
          kitchenId:true,
          items:{
            select:{
              itemId:true,
              quantity:true,
            }
          }
        }
      });
      const order = dabbah || pickupOrder;
    
      const findItems = await prisma.item.findMany({
        where: {
          id: {
            in: order?.items.map((item) => item.itemId),
          },
        },
        select: {
          id: true,
          itemName: true,
          price: true,
          unit: true,
        },
      });

      const itemWithQuantity = order?.items?.map((item) => {
        const findItem = findItems.find((i) => i.id === item.itemId);
        return {
          ...item,
          itemName: findItem?.itemName?.toLowerCase() || "",
          quantity: item.quantity,
          price: findItem?.price || 0,
          unit: findItem?.unit,
        };
      });

      
        // Updated serving calculation logic
        let totalCost = 0;
        let totalServings = 0;

        const dailyServings = {
          curryAndDal: 0,
          rotiAndRice: 0,
        };

        itemWithQuantity?.forEach((item) => {
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

        const costPerServing =
          totalServings > 0 ? totalCost / totalServings : 0;

        const servingsPerDay = totalServings; // Assuming this is for one day

        return ApiResponse(true, "Subscription order fetched successfully", 200, {
          order: myOrder,
          kitchenId: pickupOrder?.kitchenId,
          items: itemWithQuantity,
          totalServings,
          costPerServing,
          servingsPerDay,
        });
      

    }

    return ApiResponse(false, "Something went wrong", 500);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong", 500);
  }
}
