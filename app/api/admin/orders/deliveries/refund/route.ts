import prisma from "@/lib/db";
import { sendEmail } from "@/lib/nodemailer";
import { ApiResponse } from "@/lib/response";
import { Item, OrderItem } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { refundQuantities, selectedDeliveryId, orderId, orderType } =
      await req.json();


      


    if (!refundQuantities || !selectedDeliveryId || !orderId || !orderType) {
      return ApiResponse(false, "Invalid request", 400);
    }

    // Add validation to check if any quantities have changed
    const hasChanges = await prisma.orderItem.findMany({
      where: { id: { in: Object.keys(refundQuantities) } },
      select: { id: true, refundQuantity: true }
    }).then(existingItems => 
      Object.entries(refundQuantities).some(([itemId, newQty]) => {
        const existingItem = existingItems.find(item => item.id === itemId);
        return typeof newQty === 'number' && newQty > 0 && newQty !== existingItem?.refundQuantity;
      })
    );

    if (!hasChanges) {
      return ApiResponse(false, "No changes in refund quantities", 400);
    }

    const getOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
    });

    let order;
    if (orderType == "SUBSCRIPTION") {
      order = await prisma.subOrders.findFirst({
        where: {
          id: selectedDeliveryId,
          orderId: orderId,
        },
        include: {
          items: true,
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
          items: true,
          order: {
            select: {
              customerId: true,
            },
          },
        },
      });
    } else if (orderType == "PICKUP") {
      order = await prisma.pickupOrder.findFirst({
        where: {
          id: selectedDeliveryId,
          orderId: orderId,
        },
        include: {
          items: true,
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

    let getOrderItem;
    if(orderType == "SUBSCRIPTION"){  
    getOrderItem = await prisma.orderItem.findMany({
      where: {
        subOrderId: selectedDeliveryId,
      },
    });
    }else if(orderType == "DABBHAH"){
      getOrderItem =  getOrderItem = await prisma.orderItem.findMany({
        where: {
          dabbahId: selectedDeliveryId,
        },
      });
    }else if(orderType == "PICKUP"){
      getOrderItem = await prisma.orderItem.findMany({
        where: {
          pickupOrderId: selectedDeliveryId,
        },
      });
    }


    if (!getOrderItem) {
      return ApiResponse(false, "Order item not found", 404);
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

    let refundedItems: { name: string; quantity: number; amount: number }[] =
      [];

    // Replace the forEach loop with Object.entries
    for (const [itemId, refundQuantity] of Object.entries(refundQuantities)) {
      const refundItem = getOrderItem.find(
        (item) => item.itemId === itemId
      ) as OrderItem;

      if (!refundItem) {
        return ApiResponse(
          false,
          `Item with ID ${itemId} not found in the order`,
          400
        );
      }

      const refundQuantityClient = refundQuantity as number;

      // Skip processing if refund quantity is 0
      if (refundQuantityClient === 0) {
        continue;
      }

      const checkValidQuantity =
        refundItem.quantity - refundItem.refundQuantity;

      const itemPrice = (await prisma.item.findFirst({
        where: {
          id: refundItem.itemId,
        },
      })) as Item;


     

      if (!itemPrice) {
        return ApiResponse(false, "Item not found", 404);
      }

      if (
        refundQuantityClient <= 0 ||
        refundQuantityClient > refundItem.quantity ||
        refundQuantityClient > checkValidQuantity ||
        refundItem.refundQuantity + refundQuantityClient > refundItem.quantity
      ) {
        return ApiResponse(
          false,
          `Invalid refund quantity for item ${itemPrice.itemName}`,
          400
        );
      }

      const refundAmount = itemPrice.price * refundQuantityClient;
      await prisma.orderItem.update({
        where: {
          id: refundItem.id,
        },
        data: {
          refundQuantity: refundItem.refundQuantity + refundQuantityClient,
        },
      });
      console.log(refundItem.refundQuantity);
      console.log(refundQuantityClient);
      console.log(refundAmount);

      // Add refunded item to the list
      refundedItems.push({
        name: itemPrice.itemName,
        quantity: refundQuantityClient,
        amount: refundAmount,
      });

      const refundOnWallet = await prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          wallet: {
            increment: refundAmount,
          },
        },
      });

      const findUserPreference = await prisma.userPreference.findFirst({
        where: {
          customerId: customer.id,
        },
      });

      if (findUserPreference?.orderUpdates) {
        const transaction = await prisma.notification.create({
          data: {
            type: "ORDER",
            title: "Order Refund",
            message: `A refund of $${refundAmount.toFixed(2)} has been processed for ${itemPrice.itemName} in order #${orderId}. The refunded amount has been added to your wallet.`,
           customerId:customer.id
          },
        });
      }
    }

    if (refundedItems.length > 0) {
      //   await sendEmail(customer.email, refundedItems, orderId);
    }

    return ApiResponse(true, "Items refunded successfully", 200);
  } catch (error) {
    console.log("Error while refunding items", error);
    return ApiResponse(
      false,
      "Something went wrong. Please try again later.",
      500
    );
  }
}
