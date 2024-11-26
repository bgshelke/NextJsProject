export const dynamic = "force-dynamic";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import OrderUpdatedTemplate from "@/components/EmailTemplates/templates/OrderUpdated";
import prisma from "@/lib/db";
import { generateTransactionId, kitchen } from "@/lib/helper";
import { sendEmail } from "@/lib/nodemailer";

import { ApiResponse } from "@/lib/response";
import shipday from "@/lib/shipday";
import { ResponseType, ShippingInfo } from "@/types/main";

import { render } from "@react-email/components";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type JsonBody = {
  orderId: string;
  action: "SKIP" | "UNSKIP";
  isUpcoming: boolean;
};
export async function POST(request: Request) {
  try {
    const { orderId, action, isUpcoming }: JsonBody = await request.json();
    const user = await getServerSession(authOptions);

    if (!user || user?.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: user.user?.id as string,
      },
    });
    if (!customer) {
      return ApiResponse(false, "Customer not found", 404);
    }

    if (action === "SKIP" && orderId) {
      const subOrder = await prisma.subOrders.findUnique({
        where: {
          id: orderId,
        },
      });

      if (!subOrder) {
        return ApiResponse(false, "Order not found.", 404);
      }

      const order = await prisma.order.findUnique({
        where: {
          customerId: customer?.id,
          planType: "SUBSCRIPTION",
          status: isUpcoming ? "UPCOMING" : "ACTIVE",
          subOrders: {
            some: {
              id: orderId,
            },
          },
        },
      });
      if (!order) {
        return ApiResponse(false, "Order not found.", 404);
      }

      if (subOrder.status === "CANCELLED") {
        return ApiResponse(
          false,
          "Your order has been cancelled. It cannot be unskipped.",
          400
        );
      }
      if (subOrder.status === "SKIPPED") {
        return ApiResponse(
          false,
          "Your order has already been skipped. It cannot be unskipped.",
          400
        );
      }
      if (subOrder.status === "DELIVERED") {
        return ApiResponse(
          false,
          "Your order has already been delivered. It cannot be unskipped.",
          400
        );
      }
      if (subOrder.status === "PREPARING") {
        return ApiResponse(
          false,
          "Your order is currently being prepared. It cannot be unskipped.",
          400
        );
      }
      if (subOrder.status === "OUT_FOR_DELIVERY") {
        return ApiResponse(
          false,
          "Your order is out for delivery. It cannot be unskipped.",
          400
        );
      }

      if (subOrder.status === "ACCEPTED") {
        const fetchedOrder = await shipday.fetchOrder(subOrder?.subOrderID);
        if (
          !fetchedOrder ||
          fetchedOrder.length === 0 ||
          !fetchedOrder[0].orderId
        ) {
          return ApiResponse(false, "Order not found", 404);
        }

        if (!order) {
          return ApiResponse(false, "Order not found", 404);
        }

        const checkItemsQty = await prisma.orderItem.findMany({
          where: {
            subOrder: {
              id: subOrder.id,
            },
          },
        });
        if (checkItemsQty.length === 0) {
          return ApiResponse(false, "Order not found", 404);
        }
        const getItems = await prisma.item.findMany({
          where: {
            id: {
              in: checkItemsQty.map((item) => item.itemId),
            },
          },
        });

        const totalPriceItems = checkItemsQty.reduce((total, item) => {
          const itemData = getItems.find((i) => i.id === item.itemId);
          return (
            total +
            (itemData?.price || 0) *
              (item.quantity - (item.refundQuantity || 0))
          );
        }, 0);

        const orderTotalAfterSkip =
          order.totalAmount - (order.skippedAmount || 0) - totalPriceItems;

        if (orderTotalAfterSkip < 100) {
          return ApiResponse(
            false,
            "Your order total is below $100, You can't skip this order.",
            400
          );
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            skippedAmount: { increment: totalPriceItems },
            totalAmount: orderTotalAfterSkip,
          },
        });

        await prisma.subOrders.update({
          where: {
            id: subOrder.id,
          },
          data: {
            status: "SKIPPED",
          },
        });

        await prisma.customer.update({
          where: {
            id: customer?.id,
          },
          data: {
            wallet: {
              increment: totalPriceItems,
            },
          },
        });

        try {
          await shipday.deleteOrder(`${fetchedOrder[0].orderId}`);
        } catch (error) {
          console.log(error);
          return ApiResponse(false, "Failed to skip order.", 500);
        }

        const userPrefrence = await prisma.userPreference.findUnique({
          where: {
            customerId: customer?.id,
          },
        });

        if (userPrefrence?.orderUpdates) {
          await prisma.notification.create({
            data: {
              title: "Order Skipped",
              message: `Your order #${subOrder.subOrderID} has been skipped successfully. The amount has been credited to your wallet.`,
              type: "ORDER",
              customer: {
                connect: {
                  id: customer?.id,
                },
              },
            },
          });

          const html = await render(
            OrderUpdatedTemplate({
              type: "SKIP",
              username: user?.user.name,
              orderId: subOrder.subOrderID,
            })
          );
          await sendEmail(
            user?.user.email,
            "Your order has been skipped.",
            html
          );
        }
        await prisma.transactionHistory.create({
          data: {
            amount: totalPriceItems,
            transactionType: "WALLET",
            type: "CREDIT",
            transactionId: generateTransactionId(),
            description: `Wallet credit for order #${subOrder.subOrderID} skipped.`,
            customer: {
              connect: {
                id: customer?.id,
              },
            },
          },
        });
        return ApiResponse(
          true,
          "Order skipped. The order amount will be credited to your wallet.",
          200
        );
      }
    }

    if (action === "UNSKIP" && orderId) {
      const subOrder = await prisma.subOrders.findUnique({
        where: {
          id: orderId,
        },
      });

      if (!subOrder) {
        return ApiResponse(false, "Order not found.", 404);
      }

      const order = await prisma.order.findUnique({
        where: {
          customerId: customer?.id,
          planType: "SUBSCRIPTION",
          status: isUpcoming ? "UPCOMING" : "ACTIVE",
          subOrders: {
            some: {
              id: orderId,
            },
          },
        },
      });
      if (!order) {
        return ApiResponse(false, "Order not found.", 404);
      }

      const checkItemsQty = await prisma.orderItem.findMany({
        where: {
          subOrder: {
            id: subOrder.id,
          },
        },
      });
      if (checkItemsQty.length === 0) {
        return ApiResponse(false, "Order not found", 404);
      }
      const getItems = await prisma.item.findMany({
        where: {
          id: {
            in: checkItemsQty.map((item) => item.itemId),
          },
        },
      });

      const totalPriceItems = checkItemsQty.reduce((total, item) => {
        const itemData = getItems.find((i) => i.id === item.itemId);
        return (
          total +
          (itemData?.price || 0) * (item.quantity - (item.refundQuantity || 0))
        );
      }, 0);

      if (subOrder.status === "CANCELLED") {
        return ApiResponse(
          false,
          "Your order has been cancelled. It cannot be unskipped.",
          400
        );
      }
      if (subOrder.status === "ACCEPTED") {
        return ApiResponse(
          false,
          "Your order is already accepted. It cannot be unskipped.",
          400
        );
      }

      if (subOrder.status === "DELIVERED") {
        return ApiResponse(
          false,
          "Your order has already been delivered. It cannot be unskipped.",
          400
        );
      }

      if (subOrder.status === "PREPARING") {
        return ApiResponse(
          false,
          "Your order is currently being prepared. It cannot be unskipped.",
          400
        );
      }

      if (subOrder.status === "OUT_FOR_DELIVERY") {
        return ApiResponse(
          false,
          "Your order is out for delivery. It cannot be unskipped.",
          400
        );
      }
      if (subOrder.status === "SKIPPED") {
        if (customer!.wallet < totalPriceItems) {
          return ApiResponse(
            false,
            "Insufficient wallet amount. You can try other payment method.",
            400
          );
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            skippedAmount: { decrement: totalPriceItems },
            totalAmount: {
              increment: totalPriceItems,
            },
          },
        });

        const updatedSubOrder = await prisma.subOrders.update({
          where: {
            id: subOrder.id,
          },
          data: {
            status: "ACCEPTED",
          },
        });

        await prisma.customer.update({
          where: {
            id: customer?.id,
          },
          data: {
            wallet: {
              decrement: totalPriceItems,
            },
          },
        });

        const shippingInfo = order?.shippingInfo as unknown as ShippingInfo;
        const customerAddress = `${shippingInfo.addressLine1}${
          shippingInfo.addressLine2 ? `, ${shippingInfo.addressLine2},` : ""
        }${shippingInfo.city},${shippingInfo.state},"US",${
          shippingInfo.zipCode
        }`;

        const deliveryTime = updatedSubOrder.timeSlotEnd + ":00";
        const expectedPickupTime = updatedSubOrder.timeSlotStart + ":00";

        const orderInfoRequest = {
          customerName: shippingInfo.fullName || "",
          customerEmail: customer?.email || "",
          customerPhoneNumber: shippingInfo.phone || "",
          customerAddress: customerAddress,
          deliveryInstruction: shippingInfo.deliveryInstructions || "",
          deliveryFee: order.deliveryFees,
          restaurantName: kitchen.name,
          restaurantPhoneNumber: kitchen.phone,
          restaurantAddress: kitchen.address,
          expectedDeliveryDate: new Date(updatedSubOrder.deliveryDate)
            .toISOString()
            .split("T")[0],
          expectedDeliveryTime: deliveryTime,
          expectedPickupTime: expectedPickupTime,
          orderItem: checkItemsQty.map((item) => {
            const foundItem = getItems.find((i) => i.id === item.itemId);
            return {
              name: `${foundItem?.itemName} - ${foundItem?.unit}${foundItem?.unitType}`.trim(),
              quantity: item.quantity - (item.refundQuantity || 0),
              unitPrice: foundItem?.price || 0,
              detail: "",
            };
          }),
          orderNumber: subOrder.subOrderID,
          orderSource: "www.dabbahwala.com",
          tax: 0,
          totalOrderCost: totalPriceItems,
        };
        try {
          await shipday.createOrder(orderInfoRequest);
        } catch (error) {
          console.error("Error creating order in Shipday:", error);
          return NextResponse.json<ResponseType>(
            {
              success: false,
              message: "Failed to create delivery order",
            },
            { status: 500 }
          );
        }
        const userPrefrence = await prisma.userPreference.findUnique({
          where: {
            customerId: customer?.id,
          },
        });
        if (userPrefrence?.orderUpdates) {
          await prisma.notification.create({
            data: {
              title: "Order Unskipped",
              message: `Your order #${subOrder.subOrderID} has been unskipped successfully. The amount has been debited to your wallet.`,
              type: "ORDER",
              customer: {
                connect: {
                  id: customer?.id,
                },
              },
            },
          });

          const html = await render(
            OrderUpdatedTemplate({
              type: "UNSKIP",
              username: user?.user.name,
              orderId: updatedSubOrder.subOrderID,
            })
          );
          await sendEmail(
            user?.user.email,
            "Your order has been unskipped.",
            html
          );
        }

        await prisma.transactionHistory.create({
          data: {
            amount: totalPriceItems,
            transactionType: "WALLET",
            type: "DEBIT",
            transactionId: generateTransactionId(),
            description: `Wallet debit for order #${subOrder.subOrderID}`,
            customer: {
              connect: {
                id: customer?.id,
              },
            },
          },
        });

        return ApiResponse(
          true,
          "Order unskipped. Your wallet will be debited for the amount.",
          200
        );
      }
    }
  } catch (error) {
    console.log("Error in skipping/unskipping order", error);
    return ApiResponse(
      false,
      "Something went wrong. Please try again later.",
      500
    );
  } finally {
    await prisma.$disconnect();
  }
}
