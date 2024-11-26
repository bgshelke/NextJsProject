export const dynamic = "force-dynamic";
import { ApiResponse } from "@/lib/response";
import { getServerSession } from "next-auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { PickupOption, ResponseType } from "@/types/main";
import shipDayInstance from "@/lib/shipday";
import { generateTransactionId } from "@/lib/helper";
import { render } from "@react-email/render";
import OneTimeOrderCancellation from "@/components/EmailTemplates/templates/OneTimeOrderCancellation";
import { sendEmail } from "@/lib/nodemailer";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(request: Request) {
  try {
    const user = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    if (!user) {
      return ApiResponse(false, "Not authorized", 401);
    }
    const customer = await prisma.customer.findFirst({
      where: {
        userId: user?.user?.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    if (orderId) {
      const findOrder = await prisma.order.findUnique({
        where: {
          orderID: orderId,
          planType: "ONETIME",
        },
        select: {
          dabbah: {
            select: {
              id: true,
              deliveryDate: true,
              createdAt: true,
              thumbnail: true,
              timeSlotStart: true,
              timeSlotEnd: true,
              items: {
                select: {
                  itemId: true,
                  quantity: true,
                  itemPrice: true,
                },
              },
              status: true,
            },
          },
          pickupOrder: {
            select: {
              id: true,
              status: true,
              pickupDate: true,
              pickupTime: true,
              thumbnail: true,
              kitchenId: true,
              items: {
                select: {
                  itemId: true,
                  quantity: true,
                  itemPrice: true,
                },
              },
            },
          },
        },
      });

      if (!findOrder) {
        return ApiResponse(false, "Order not found", 404);
      }

      if (findOrder.pickupOrder) {
        return ApiResponse(true, "Pickup Order", 200, findOrder.pickupOrder);
      } else if (findOrder.dabbah) {
        return ApiResponse(true, "Dabbah Order", 200, findOrder.dabbah);
      } else {
        return ApiResponse(false, "Order not found", 404);
      }
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: customer?.id,
        status: {
          not: "UPCOMING",
        },
      },
      select: {
        id: true,
        orderID: true,
        paidAmount: true,
        status: true,
        createdAt: true,
        planType: true,

        pickupOrder: {
          select: {
            status: true,
          },
        },
        dabbah: {
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return ApiResponse(true, "Orders", 200, orders);
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

interface OrderRequest {
  orderId: string;
  orderType: PickupOption;
}

export async function DELETE(req: Request) {
  try {
    const { orderId, orderType }: OrderRequest = await req.json();
    if (!orderId || !orderType) {
      return ApiResponse(false, "Order ID and order type are required", 400);
    }
    const user = await getServerSession(authOptions);
    if (!user) {
      return ApiResponse(false, "Not authorized", 401);
    }
    const customer = await prisma.customer.findFirst({
      where: {
        userId: user?.user?.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    const currentDate = new Date().toISOString().split("T")[0];
    const order = await prisma.order.findFirst({
      where: {
        orderID: orderId,
        customerId: customer.id,
        planType: "ONETIME",
      },
      select: {
        orderID: true,
        firstDeliveryDate: true,
        dabbah: true,
        pickupOrder: true,
      },
    });

    if (!order) {
      return ApiResponse(false, "Order not found", 404);
    }

    if (orderType === "DELIVERY") {
      const dabbah = order.dabbah;

      if (!dabbah) {
        return ApiResponse(false, "Order not found", 404);
      }

      if (dabbah.status !== "ACCEPTED") {
        return ApiResponse(false, "Order is not accepted yet", 400);
      }

      const orderDate = new Date(dabbah.deliveryDate)
        .toISOString()
        .split("T")[0];

      const orderDateObj = new Date(orderDate);
      const currentDateObj = new Date(currentDate);

      if (orderDateObj <= currentDateObj) {
        return ApiResponse(
          false,
          "You can't cancel the order on or after the delivery date",
          400
        );
      }
      try {
        const fetchedOrder = await shipDayInstance.fetchOrder(dabbah?.dabbahID);
        await shipDayInstance.deleteOrder(`${fetchedOrder[0].orderId}`);
      } catch (error) {
        console.log(error);
        return ApiResponse(false, "Failed to cancel order.", 500);
      }

      await prisma.dabbah.update({
        where: {
          id: dabbah.id,
        },
        data: {
          status: "CANCELLED",
        },
      });
    }

    if (orderType === "PICKUP") {
      const pickupOrder = order.pickupOrder;
      if (!pickupOrder) {
        return ApiResponse(false, "Order not found", 404);
      }
      if (pickupOrder.status !== "ACCEPTED") {
        return ApiResponse(
          false,
          "You can't cancel the order because it's not accepted.",
          400
        );
      }

      const orderDate = new Date(pickupOrder.pickupDate)
        .toISOString()
        .split("T")[0];
      const orderDateObj = new Date(orderDate);
      const currentDateObj = new Date(currentDate);

      if (orderDateObj <= currentDateObj) {
        return ApiResponse(
          false,
          "You can't cancel the order on or after the delivery date",
          400
        );
      }

      await prisma.pickupOrder.update({
        where: {
          id: pickupOrder.id,
        },
        data: {
          status: "CANCELLED",
        },
      });
    }
    const updateWallet = await prisma.customer.update({
      where: {
        userId: user?.user?.id,
      },
      data: {
        wallet: {
          increment: order.dabbah?.total || order.pickupOrder?.total,
        },
      },
    });

    await prisma.transactionHistory.create({
      data: {
        amount: order.dabbah?.total || order.pickupOrder?.total || 0,
        transactionType: "WALLET",
        type: "CREDIT",
        transactionId: generateTransactionId(),
        description: `Wallet credit for order #${order.orderID} cancelled`,
        customer: {
          connect: {
            id: updateWallet?.id,
          },
        },
      },
    });
    const userPrefrences = await prisma.userPreference.findFirst({
      where: {
        customerId: updateWallet.id,
      },
    });

    if (userPrefrences?.orderUpdates) {
      await prisma.notification.create({
        data: {
          title: "Order Cancelled",
          message: `Your order #${order.orderID} has been cancelled successfully. The amount has been credited to your wallet.`,
          type: "ORDER",
          customer: {
            connect: {
              id: updateWallet?.id,
            },
          },
        },
      });

      const html = await render(
        OneTimeOrderCancellation({
          username: user?.user?.name,
          orderId: order?.orderID,
        })
      );
      await sendEmail(user?.user?.email, "Order Cancelled", html);
    }

    return ApiResponse(
      true,
      "Order cancelled successfully. The amount has been credited to your wallet.",
      200
    );
  } catch (error) {
    console.log("Error while cancelling order", error);
    return ApiResponse(
      false,
      "Error while cancelling order. Please try again later",
      500
    );
  }
}
