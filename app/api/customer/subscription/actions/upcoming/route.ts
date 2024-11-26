import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { getServerSession } from "next-auth";
import { BillingInfo, Item, ItemsWithQty, OrderItemType, SubscriptionDay } from "@/types/main";
import { generateOrderId } from "@/lib/helper";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  return ApiResponse(false, "Upcoming orders", 500);
}

interface JsonData {
  subOrderId: string;
  additionalItems: ItemsWithQty[];
  reqType: string;
  items: OrderItemType[];
  slotId: string;
  orderId: string;
  selectedDate: string;
}

export async function POST(request: Request) {
  try {
    const {
      subOrderId,
      reqType,
      additionalItems,
      items,
      slotId,
      orderId,
      selectedDate,
    } = await request.json();

    if (!reqType) {
      return ApiResponse(false, "Invalid request", 400);
    }
    const user = await getServerSession(authOptions);
    if (!user) {
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

    if (reqType === "REMOVE") {
      if (!subOrderId) {
        return ApiResponse(false, "Invalid request", 400);
      }

      const findOrder = await prisma.order.findFirst({
        where: {
          orderID: orderId,
          status: "UPCOMING",
          planType: "SUBSCRIPTION",
          customerId: customer.id,
        },
      });
      if (!findOrder) {
        return ApiResponse(false, "Order not found", 404);
      }
      const checkLength = await prisma.subOrders.count({
        where: {
          orderId: findOrder?.id,
        },
      });

      if (checkLength === 1) {
        return ApiResponse(
          false,
          "At least one order is required for your upcoming orders.",
          400
        );
      }

      const subOrder = await prisma.subOrders.findUnique({
        where: {
          id: subOrderId,
          status: "ACCEPTED",
          orderId: findOrder?.id,
        },
      });
      if (!subOrder) {
        return ApiResponse(
          false,
          "Order not found. You cannot remove this order.",
          404
        );
      }
      await prisma.subOrders.delete({
        where: {
          id: subOrderId,
        },
      });
      const updateTotalAmount = findOrder.totalAmount - subOrder.total;

      if (updateTotalAmount < 100) {
        await prisma.order.update({
          where: {
            id: findOrder?.id,
          },
          data: {
            deliveryFees: findOrder.deliveryFees + checkLength * 5,
          },
        });
      } else if (updateTotalAmount > 100) {
        await prisma.order.update({
          where: {
            id: findOrder?.id,
          },
          data: {
            deliveryFees: 0,
          },
        });
      } else {
        await prisma.order.update({
          where: {
            id: findOrder?.id,
          },
          data: {
            totalAmount: updateTotalAmount,
          },
        });
      }

      return ApiResponse(true, "Order removed from your upcoming orders", 200);
    }

    if (reqType === "ADD_DAY") {
      if (!selectedDate || !orderId || !items || !slotId) {
        return ApiResponse(false, "Invalid request", 400);
      }

      const findOrder = await prisma.order.findFirst({
        where: {
          orderID: orderId,
          status: "UPCOMING",
          planType: "SUBSCRIPTION",
          customerId: customer.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!findOrder) {
        return ApiResponse(false, "Order not found", 404);
      }

      const checkExistingOrder = await prisma.subOrders.findFirst({
        where: {
          orderId: findOrder.id,
          deliveryDate: new Date(selectedDate).toISOString(),
        },
      });

      if (checkExistingOrder) {
        return ApiResponse(false, "Order already exists", 400);
      }
      const allItems = await prisma.item.findMany({
        where: {
          id: {
            in: items.map((item: OrderItemType) => item.itemId),
          },
        },
      });

      const totalAmount = items.reduce(
        (total: number, myItem: OrderItemType) => {
          const menuItem = allItems.find((item) => item.id === myItem.itemId);
          return total + (menuItem?.price || 0) * myItem.quantity;
        },
        0
      );

   
      const menuOfTheDay = await prisma.dailyMenu.findUnique({
        where: {
          date: new Date(selectedDate).toISOString(),
        },
        select: {
          thumbnail: true,
        },
      });
      const findTimeSlot = await prisma.timeSlots.findUnique({
        where: {
          id: slotId,
        },
        select: {
          timeStart: true,
          timeEnd: true,
        },
      });

      const subOrderCount = await prisma.subOrders.count({
        where: {
          orderId: findOrder.id,
          status: {
            not: "CANCELLED",
          },
        },
        
      });
      const dwConfig = await prisma.dwConfig.findUnique({
        where: {
          uniqueKey: "dwsettings",
        },
      });

      const subOrder = await prisma.subOrders.create({
        data: {
          status: "ACCEPTED",
          deliveryDate: new Date(selectedDate).toISOString(),
          subOrderID: generateOrderId(),
          timeSlotEnd: findTimeSlot?.timeEnd || "",
          timeSlotStart: findTimeSlot?.timeStart || "",
          total: totalAmount,
          thumbnail: menuOfTheDay?.thumbnail,
          order: { connect: { id: findOrder.id } },
        },
      });
      const orderItems = items.map((item: OrderItemType) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        subOrderId: subOrder.id,
      }));

      if (orderItems && orderItems.length > 0) {
        await prisma.orderItem.createMany({
          data: orderItems,
        });
      }


      const finalOrderTotal = findOrder.totalAmount + totalAmount;

      if (finalOrderTotal < 100 && finalOrderTotal > 0) {
        //under this amount we will add delivery fees
        await prisma.order.update({
          where: {
            id: findOrder.id,
          },
          data: {
            totalAmount: {
              increment: totalAmount,
            },
            deliveryFees: dwConfig?.deliveryFees || 5 * subOrderCount,
          },
        });
      } else if (finalOrderTotal >= (dwConfig?.maxAmountForFreeDelivery || 100)) {
      
        await prisma.order.update({
          where: {
            id: findOrder.id,
          },
          data: {
            totalAmount: {
              increment: totalAmount,
            },
            deliveryFees: 0,
          },
        });
      } else if (finalOrderTotal <= 0) {
        return ApiResponse(false, "Total amount cannot be $0 or less", 400);
      }

      const userPreference = await prisma.userPreference.findUnique({
        where: {
          customerId: customer.id,
        },
      });


      const subscriptionID = await prisma.subscription.findUnique({
        where: {
          id: findOrder.subscriptionId as string,
        },
      });
    
      const subscription = await stripe.subscriptions.retrieve(
        subscriptionID?.subscriptionStripeId as string
      );

      await stripe.subscriptions.update(
        subscriptionID?.subscriptionStripeId as string,
        {
          items: [{
            id: subscription.items.data[0].id,
            price_data: {
              currency: 'usd',
              product: subscription.items.data[0].price.product as string,
              recurring: {
                interval: 'week'
              },
              unit_amount: Math.round(finalOrderTotal * 100),
            },
          }],
          proration_behavior: 'none',
          billing_cycle_anchor: 'unchanged', 
        }
      );


      if (userPreference?.orderUpdates) {
        const notification = await prisma.notification.create({
          data: {
            title: "Upcoming Order Added",
            message: "Order added to your upcoming orders.",
            type: "ORDER",
            customerId: customer.id,
          },
        });
      }
      return ApiResponse(true, "Order added to your upcoming orders.", 200);
    }

    if (reqType === "ITEMS") {
      if (!additionalItems || !subOrderId || !orderId) {
        return ApiResponse(false, "Invalid request", 400);
      }

      const findOrder = await prisma.order.findFirst({
        where: {
          orderID: orderId,
          status: "UPCOMING",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          billingInfo: true,
          id: true,
          deliveryFees: true,
          totalAmount: true,
          subscriptionId: true,
        },
      });
      if (!findOrder) {
        return ApiResponse(false, "Order not found", 404);
      }
      const subOrder = await prisma.subOrders.findUnique({
        where: {
          id: subOrderId,
          status: "ACCEPTED",
          orderId: findOrder?.id,
        },
      });

      const subOrderCount = await prisma.subOrders.count({
        where: {
          orderId: findOrder?.id,
          status: {
            not: "CANCELLED",
          },
        },
      });

      if (!subOrder) {
        return ApiResponse(false, "Order not found", 404);
      }

      // //checking the qty is not below the default order item qty
      const dwConfig = await prisma.dwConfig.findUnique({
        where: {
          uniqueKey: "dwsettings",
        },
      });

      const allItems = await prisma.item.findMany();
      if (additionalItems.length === 0) {
        return ApiResponse(false, "No items to update", 400);
      }

      const itemsWithPrice = additionalItems.map((item: ItemsWithQty) => {
        const menuItem = allItems.find((i) => i.id === item.id);

        // Validate quantity against min/max limits
        if (
          item.quantity < (dwConfig?.minQtyOfItem || 0) ||
          item.quantity > (dwConfig?.maxQtyOfItem || 8)
        ) {
          throw new Error(
            `Quantity cannot be less than ${dwConfig?.minQtyOfItem} or more than ${dwConfig?.maxQtyOfItem}`
          );
        }

        return {
          ...item,
          quantity: item.quantity,
          price: menuItem?.price || 0,
        };
      });

    

      const totalAmount = itemsWithPrice.reduce(
        (total: number, item: { price: number; quantity: number }) => {
          // Only include items with quantity > 0
          if (item.quantity > 0) {
            return total + item.price * item.quantity;
          }
          return total;
        },
        0
      );

      
      const currentOrderItems = await prisma.orderItem.findMany({
        where: {
          subOrderId: subOrder.id,
        },
      });

      const currentTotal = currentOrderItems.reduce((total, item) => {
        const menuItem = allItems.find((i) => i.id === item.itemId);
        return total + (menuItem?.price || 0) * item.quantity;
      }, 0);

      const amountDifference = totalAmount - currentTotal;
      const updatedOrderTotal = findOrder.totalAmount + amountDifference;

  

      if (updatedOrderTotal < 100 && updatedOrderTotal > 0) {
        //under this amount we will add delivery fees
        await prisma.order.update({
          where: {
            id: findOrder.id,
          },
          data: {
            totalAmount: updatedOrderTotal,
            deliveryFees: dwConfig?.deliveryFees || 5 * subOrderCount,
          },
        });
      } else if (updatedOrderTotal >= 100) {
        //over 100 we will not add delivery fees
        await prisma.order.update({
          where: {
            id: findOrder.id,
          },
          data: {
            totalAmount: updatedOrderTotal,
            deliveryFees: 0,
          },
        });
      } else if (updatedOrderTotal <= 0) {
        return ApiResponse(false, "Total amount cannot be $0 or less", 400);
      }

      // Filter out items with quantity > 0 for saving
      const savedItemObj = itemsWithPrice
        .filter((item: { quantity: number }) => item.quantity > 0)
        .map((item: { id: string; quantity: number; price: number }) => ({
          itemId: item.id,
          quantity: item.quantity,
          itemPrice: item.price,
        }));

      // Delete items with quantity 0
      const itemsToDelete = itemsWithPrice
        .filter((item: { quantity: number }) => item.quantity === 0)
        .map((item: { id: string }) => item.id);

      if (itemsToDelete.length > 0) {
        await prisma.orderItem.deleteMany({
          where: {
            itemId: { in: itemsToDelete },
            subOrderId: subOrder.id,
          },
        });
      }

      // Update or create remaining items
      for (const item of savedItemObj) {
        await prisma.orderItem.upsert({
          where: {
            itemId: item.itemId,
            subOrderId: subOrder.id,
          },
          update: item,
          create: item,
        });
      }

      const subscriptionID = await prisma.subscription.findUnique({
        where: {
          id: findOrder.subscriptionId as string,
        },
      });

 
    
      const subscription = await stripe.subscriptions.retrieve(
        subscriptionID?.subscriptionStripeId as string
      );

      await stripe.subscriptions.update(
        subscriptionID?.subscriptionStripeId as string,
        {
          items: [{
            id: subscription.items.data[0].id,
            price_data: {
              currency: 'usd',
              product: subscription.items.data[0].price.product as string,
              recurring: {
                interval: 'week'
              },
              unit_amount: Math.round(updatedOrderTotal * 100),
            },
          }],
          proration_behavior: 'none',
          billing_cycle_anchor: 'unchanged', 
        }
      );


      

      return ApiResponse(
        true,
        "Order updated. You will be charged for the new items on your next week order.",
        200
      );
    }
    return ApiResponse(false, "Invalid request", 400);
  } catch (error) {
    console.log("Error fetching upcoming orders", error);
    return ApiResponse(false, "Error fetching upcoming orders", 500);
  }
}
