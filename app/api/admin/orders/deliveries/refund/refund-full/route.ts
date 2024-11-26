import prisma from "@/lib/db";
import { generateTransactionId } from "@/lib/helper";

import { sendEmail } from "@/lib/nodemailer";
import { ApiResponse } from "@/lib/response";

export async function POST(req: Request) {
  const { selectedDeliveryId, orderId, orderType } = await req.json();

  if (!selectedDeliveryId || !orderId || !orderType) {
    return ApiResponse(false, "Invalid request", 400);
  }

  try {
    const findOrder = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!findOrder) {
      return ApiResponse(false, "Order not found", 404);
    }

    let order;
    if (orderType == "SUBSCRIPTION") {
      order = await prisma.subOrders.findFirst({
        where: {
          id: selectedDeliveryId,
          orderId: orderId,
        },
        include: {
          order: {
            select: {
              customerId: true,
            },
          },
        },
      });
    } else if (orderType == "DABBHAH") {
      order = await prisma.dabbah.findFirst({
        where: {
          id: selectedDeliveryId,
          orderId: orderId,
        },
        include: {
          order: {
            select: {
              customerId: true,
            },
          },
        },
      });
    } else if (orderType == "GUESTDABBHAH" || orderType == "GUESTPICKUP") {
      return ApiResponse(false, "Guest order refund not supported yet", 400);
    } else {
      return ApiResponse(false, "Invalid order type or order not found", 400);
    }

    const customerId = order?.order.customerId;

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return ApiResponse(false, "Customer not found", 404);
    }

    let items;

    if (orderType == "SUBSCRIPTION" && order?.id) {
      items = await prisma.orderItem.findMany({
        where: {
          subOrderId: {
            in: [order?.id as string],
          },
        },
        select: {
          itemId: true,
          quantity: true,
          refundQuantity: true,
        },
      });
    } else if (orderType == "DABBHAH" && order?.id) {
      items = await prisma.orderItem.findMany({
        where: {
          dabbahId: {
            in: [order?.id as string],
          },
        },
        select: {
          itemId: true,
          quantity: true,
          refundQuantity: true,
        },
      });
    } else if (orderType == "PICKUP" && order?.id) {
      items = await prisma.orderItem.findMany({
        where: {
          pickupOrderId: {
            in: [order?.id as string],
          },
        },
        select: {
          itemId: true,
          quantity: true,
          refundQuantity: true,
        },
      });
    } else {
      return ApiResponse(false, "Invalid order type or order not found", 400);
    }

    if (!items) {
      return ApiResponse(false, "Order items not found", 404);
    }

    const getAllItems = await prisma.item.findMany({
      where: {
        id: { in: items.map((item) => item.itemId) },
      },
    });
    const totalAmount = items.reduce((acc, item) => {
      const itemPrice =
        getAllItems.find((i) => i?.id === item?.itemId)?.price ?? 0;
      return acc + (item.quantity - item.refundQuantity) * itemPrice;
    }, 0);

    if (totalAmount <= 0) {
      return ApiResponse(false, "No amount to refund", 400);
    }

    if (orderType !== "SUBSCRIPTION") {
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: "REFUNDED",
        },
      });
    } else if (orderType == "PICKUP") {
      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: "REFUNDED",
        },
      });
    }
    await prisma.subOrders.update({
      where: {
        id: selectedDeliveryId,
      },
      data: {
        status: "REFUNDED",
      },
    });
    await prisma.customer.update({
      where: {
        id: customerId,
      },
      data: {
        wallet: customer.wallet + totalAmount,
      },
    });

    await prisma.notification.create({
      data: {
        message:
          "Your order has been refunded. The amount of " +
          totalAmount +
          " has been refunded to your wallet.",
        customerId: customerId as string,
        type: "ORDER",
        title: "Order Refunded",
      },
    });

    await prisma.transactionHistory.createMany({
      data: {
        amount: totalAmount,
        customerId: customerId as string,
        transactionType: "WALLET",
        description: "Refunded full amount for order " + orderId,
        transactionId: generateTransactionId(),
        type: "CREDIT",
      },
    });
    await sendEmail(
      customer.email,
      "Refunded full amount",
      `<p>Your order has been refunded. The amount of ${totalAmount} has been refunded to your wallet.</p>`
    );

    return ApiResponse(true, "Refund full amount successful", 200);
  } catch (error) {
    console.log("Error while refunding full amount", error);
    return ApiResponse(false, "Error while refunding full amount", 500);
  }
}
