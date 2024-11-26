import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { Item, OrderItemType, ShippingInfo } from "@/types/main";

import { createStripePayment, stripe } from "@/lib/stripe";
import shipDayInstance from "@/lib/shipday";
import { generateOrderId } from "@/lib/helper";

import { render } from "@react-email/render";
import { sendEmail } from "@/lib/nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { MINIMUM_CHARGE_AMOUNT } from "@/lib/helper";
import { BillingInfo, Customer, Order } from "@prisma/client";
import { kitchen } from "@/lib/helper";
import OrderUpdatedTemplate from "@/components/EmailTemplates/templates/OrderUpdated";

type JSONData = {
  selectedDate: string;
  slotId: string;
  items: OrderItemType[];
  saveUpcoming: boolean;
  paymentMethodId: string;
  useWalletCredit: boolean;
};

export async function POST(request: Request) {
  try {
    const {
      selectedDate,
      slotId,
      items,
      saveUpcoming,
      paymentMethodId,
      useWalletCredit,
    }: JSONData = await request.json();

    if (!selectedDate || !slotId || !items) {
      return ApiResponse(false, "Invalid request", 400);
    }
    const deliveryDate = new Date(selectedDate);

    const user = await getServerSession(authOptions);

    if (!user || user.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthenticated", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: user.user.id,
      },
    });

    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    const order = await prisma.order.findFirst({
      where: {
        customerId: customer.id,
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!order) {
      return ApiResponse(false, "Order not found", 404);
    }
    const existingOrder = await prisma.subOrders.findFirst({
      where: {
        orderId: order?.id,
        deliveryDate,
      },
    });

    if (existingOrder) {
      return ApiResponse(false, "Order already exists with this date", 404);
    }

    const allItems = await prisma.item.findMany({
      where: {
        id: {
          in: items.map((item) => item.itemId),
        },
      },
    });

    const totalAmount = items.reduce((total, myItem) => {
      const menuItem = allItems.find((item) => item.id === myItem.itemId);
      return total + (menuItem?.price || 0) * myItem.quantity;
    }, 0);

    let taxRate = 0;
    let amountToPay = totalAmount;

    // Calculate tax
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/checkout/calculate-tax",
        {
          method: "POST",
          body: JSON.stringify({
            total: totalAmount,
            address: order.billingInfo,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        taxRate = parseFloat(data.data.tax_rate);
        amountToPay = totalAmount + (totalAmount * taxRate) / 100;
        amountToPay = Math.round(amountToPay * 100) / 100;
      } else {
        return ApiResponse(false, "Failed to create order.", 500);
      }
    } catch (error) {
      console.log(error);
      return ApiResponse(false, "Failed to create order.", 500);
    }

    let walletDeduction = 0;
    let stripeAmount = 0;

    if (useWalletCredit && customer.wallet && customer.wallet > 0) {
      walletDeduction = Math.min(customer.wallet, amountToPay);
      stripeAmount = amountToPay - walletDeduction;

      if (stripeAmount > 0 && stripeAmount < MINIMUM_CHARGE_AMOUNT) {
        // Adjust wallet deduction to meet minimum Stripe charge amount
        walletDeduction = Math.max(0, amountToPay - MINIMUM_CHARGE_AMOUNT);
        stripeAmount = amountToPay - walletDeduction;
      } else {
        stripeAmount = amountToPay;
      }

      if (stripeAmount === 0) {
        // Pay entirely with wallet
        await createOrderForEntireWalletAmount({
          order,
          walletDeduction,
          customer,
          items,
          allItems,
          selectedDate,
          slotId,
          shippingInfo: order.shippingInfo as ShippingInfo,
          totalAmount,
          amountToPay: parseFloat(amountToPay.toFixed(2)),
          saveUpcoming,
        });

        return ApiResponse(
          true,
          "Payment Successful. Items added to your order.",
          200
        );
      } else {
        let createPayment;
        try {
          createPayment = await createStripePayment({
            amountToPay: stripeAmount,
            customer: {
              email: user?.user.email,
              fullName: (order.billingInfo as BillingInfo).fullName as string,
              phone: customer.phone || "",
            },
            paymentMethodId: paymentMethodId,
          });
        } catch (e: any) {
          const charge = await stripe.charges.retrieve(
            e.payment_intent.latest_charge
          );
          if (e.type === "StripeCardError") {
            if (charge.outcome?.type === "blocked") {
              return ApiResponse(
                false,
                "Payment blocked for suspected fraud.",
                400
              );
            } else if (e.code === "card_declined") {
              return ApiResponse(false, "Payment declined by the issuer.", 400);
            } else if (e.code === "expired_card") {
              return ApiResponse(false, "Your card has expired.", 400);
            } else {
              return ApiResponse(false, "Other card error.", 400);
            }
          }
        }

        if (!createPayment) {
          return ApiResponse(false, "Payment Failed. Please try again.", 400);
        }

        if (createPayment?.status !== "succeeded") {
          return ApiResponse(false, "Payment Failed. Please try again.", 400);
        }

        await confirmOrderFunction({
          order,
          walletDeduction,
          customer,
          items,
          allItems,
          selectedDate,
          slotId,
          totalAmount,
          shippingInfo: order.shippingInfo as ShippingInfo,
          saveUpcoming,
          amountToPay: parseFloat(amountToPay.toFixed(2)),
        });

        await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            totalAmount: order.totalAmount + totalAmount,
          },
        });

        await prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            wallet: customer.wallet - walletDeduction,
          },
        });

        await prisma.transactionHistory.create({
          data: {
            customerId: customer.id,
            amount: walletDeduction,
            type: "DEBIT",
            description:
              "Wallet deduction amount " +
              walletDeduction +
              " for order #" +
              order.id,
            transactionId: order.id,
            transactionType: "WALLET",
          },
        });

        const findUserPreference = await prisma.userPreference.findFirst({
          where: {
            customerId: customer.id,
          },
        });

        if (
          findUserPreference?.orderUpdates ||
          findUserPreference?.walletUpdates
        ) {
          const html = await render(
            OrderUpdatedTemplate({
              type: "ADDONS",
              username: customer.firstName + " " + customer.lastName,
              orderId: order.id,
            })
          );
          await sendEmail(
            customer.email,
            "New item added to your order.",
            html
          );

          await prisma.notification.create({
            data: {
              title: "New item added",
              message:
                "New item added to your order. and Wallet deduction of " +
                walletDeduction +
                " for Order ID: #" +
                order.id,
              customerId: customer.id,
              type: "ORDER",
            },
          });
        }
        return ApiResponse(
          true,
          "Payment Successful. New day added to your subscription order.",
          200
        );
      }
    }

    let createPayment;
    try {
      createPayment = await createStripePayment({
        amountToPay: amountToPay,
        customer: {
          email: user?.user.email,
          fullName: (order.billingInfo as BillingInfo).fullName as string,
          phone: customer.phone || "",
        },
        paymentMethodId: paymentMethodId,
      });
    } catch (e: any) {
      const charge = await stripe.charges.retrieve(
        e.payment_intent.latest_charge
      );
      if (e.type === "StripeCardError") {
        if (charge.outcome?.type === "blocked") {
          return ApiResponse(
            false,
            "Payment blocked for suspected fraud.",
            400
          );
        } else if (e.code === "card_declined") {
          return ApiResponse(false, "Payment declined by the issuer.", 400);
        } else if (e.code === "expired_card") {
          return ApiResponse(false, "Your card has expired.", 400);
        } else {
          return ApiResponse(false, "Other card error.", 400);
        }
      }
    }

    if (!createPayment) {
      return ApiResponse(false, "Payment Failed. Please try again.", 400);
    }

    if (createPayment?.status !== "succeeded") {
      return ApiResponse(false, "Payment Failed. Please try again.", 400);
    }

    await confirmOrderFunction({
      order,
      walletDeduction,
      customer,
      items,
      allItems,
      selectedDate,
      slotId,
      amountToPay,
      totalAmount,
      shippingInfo: order.shippingInfo as ShippingInfo,
      saveUpcoming,
    });

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        totalAmount: order.totalAmount + totalAmount,
      },
    });
    return ApiResponse(
      true,
      "Payment Successful. New day added to your subscription order.",
      200
    );
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong. Please try again.", 500);
  }
}

const createSubOrder = async ({
  order,
  customer,
  items,
  allItems,
  selectedDate,
  slotId,
  amountToPay,
  totalAmount,
  shippingInfo,
  saveUpcoming,
}: {
  order: Order;
  customer: Customer;
  items: OrderItemType[];
  allItems: Item[];
  selectedDate: string;
  slotId: string;
  amountToPay: number;
  totalAmount: number;
  shippingInfo: ShippingInfo;
  saveUpcoming: boolean;
}) => {
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
  const customerAddress = `${shippingInfo.addressLine1}${
    shippingInfo.addressLine2 && `,${shippingInfo.addressLine2}`
  },${shippingInfo.city},${shippingInfo.state},"US",${shippingInfo.zipCode}`;

  //current corder
  const subOrder = await prisma.subOrders.create({
    data: {
      status: "ACCEPTED",
      deliveryDate: new Date(selectedDate).toISOString(),
      subOrderID: generateOrderId(),
      timeSlotStart: findTimeSlot?.timeStart || "",
      timeSlotEnd: findTimeSlot?.timeEnd || "",
      total: totalAmount,
      thumbnail: menuOfTheDay?.thumbnail,
      order: { connect: { id: order.id } },
    },
  });

  if (items && items.length > 0) {
    await prisma.orderItem.createMany({
      data: items.map((item) => {
        const itemPrice = allItems.find(
          (item2) => item2.id === item.itemId
        )?.price;
        return {
          itemId: item.itemId,
          itemPrice: itemPrice,
          quantity: item.quantity,
          subOrderId: subOrder.id,
        };
      }),
    });
  }

  await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      totalAmount: order.totalAmount + totalAmount,
      paidAmount: order.paidAmount + amountToPay,
    },
  });

  const menuItem = await prisma.menuItem.findMany({
    where: {
      itemId: {
        in: items.map((item) => item.itemId || ""),
      },
      dailyMenus: {
        some: {
          dailyMenu: {
            date: selectedDate,
          },
        },
      },
    },
    select: {
      itemId: true,
      name: true,
    },
  });

  //upcoming order

  const deliveryTime = findTimeSlot?.timeEnd + ":00";
  const [hours, minutes, seconds] = deliveryTime.split(":").map(Number);
  const deliveryDate = new Date(selectedDate);
  deliveryDate.setHours(hours, minutes, seconds);
  const expectedPickupTime = findTimeSlot?.timeStart + ":00";

  const orderItem = allItems
    .filter((item) => items.some((orderItem) => orderItem.itemId === item.id))
    .map((item) => {
      const ordermenuItem = menuItem.find(
        (menuItem) => menuItem.itemId === item.id
      );
      const orderItem = items.find((orderItem) => orderItem.itemId === item.id);
      return {
        name: item.itemName || "",
        quantity: orderItem?.quantity || 0,
        unitPrice: item.price || 0,
        detail: ordermenuItem?.name || "",
      };
    });
  const orderInfoRequest = {
    customerName: shippingInfo.fullName || "",
    customerEmail: customer.email,
    customerPhoneNumber: shippingInfo.phone || "",
    customerAddress: customerAddress,
    deliveryInstruction: shippingInfo.deliveryInstructions || "",
    deliveryFee: order.deliveryFees,
    restaurantName: kitchen.name,
    restaurantPhoneNumber: kitchen.phone,
    restaurantAddress: kitchen.address,
    expectedDeliveryDate: new Date(selectedDate).toISOString().split("T")[0],
    expectedDeliveryTime: deliveryTime,
    expectedPickupTime: expectedPickupTime,
    orderItem: orderItem,
    orderNumber: subOrder.subOrderID,
    orderSource: "www.dabbahwala.com",
    tax: 0,
    totalOrderCost: totalAmount,
  };

  try {
    await shipDayInstance.createOrder(orderInfoRequest);
  } catch (error) {
    console.log(error);
    throw Error("Failed to create delivery order");
  }

  if (saveUpcoming) {
    const findUpcomingOrder = await prisma.order.findFirst({
      where: {
        customerId: order.customerId,
        status: "UPCOMING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    console.log(findUpcomingOrder?.totalAmount , "Find Upcoming Order Total Amount")
    console.log(totalAmount , "Total Amount")

    if (findUpcomingOrder) {
      const checkExistingSuborder = await prisma.subOrders.findFirst({
        where: {
          orderId: findUpcomingOrder.id,
          deliveryDate: new Date(
            new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 7)
          ),
          status: "ACCEPTED",
        },
      });

      if (!checkExistingSuborder) {
        const upcomingSubOrder = await prisma.subOrders.create({
          data: {
            status: "ACCEPTED",
            deliveryDate: new Date(
              new Date(selectedDate).setDate(
                new Date(selectedDate).getDate() + 7
              )
            ),
            subOrderID: generateOrderId(),
            timeSlotStart: findTimeSlot?.timeStart || "",
            timeSlotEnd: findTimeSlot?.timeEnd || "",
            total: totalAmount,
            thumbnail: menuOfTheDay?.thumbnail,
            order: { connect: { id: findUpcomingOrder?.id } },
          },
        });

        if (items && items.length > 0) {
          await prisma.orderItem.createMany({
            data: items.map((item) => {
              const itemPrice = allItems.find(
                (item2) => item2.id === item.itemId
              )?.price;
              return {
                itemId: item.itemId,
                itemPrice: itemPrice,
                quantity: item.quantity,
                subOrderId: upcomingSubOrder.id,
              };
            }),
          });
        }

        const updatedOrder = await prisma.order.update({
          where: {
            id: findUpcomingOrder?.id,
          },
          data: {
            totalAmount: findUpcomingOrder?.totalAmount + totalAmount,
          },
        });

        const subscriptionID = await prisma.subscription.findUnique({
          where: {
            id: findUpcomingOrder.subscriptionId as string,
          },
        });

        const subscription = await stripe.subscriptions.retrieve(
          subscriptionID?.subscriptionStripeId as string
        );

        await stripe.subscriptions.update(
          subscriptionID?.subscriptionStripeId as string,
          {
            items: [
              {
                id: subscription.items.data[0].id,
                price_data: {
                  currency: "usd",
                  product: subscription.items.data[0].price.product as string,
                  recurring: {
                    interval: "week",
                  },
                  unit_amount: Math.round(updatedOrder.totalAmount * 100),
                },
              },
            ],
            proration_behavior: "none",
            billing_cycle_anchor: "unchanged",
          }
        );
      }
    }
  }
  return { suborderId: subOrder.subOrderID };
};

const createOrderForEntireWalletAmount = async ({
  order,
  walletDeduction,
  customer,
  items,
  allItems,
  selectedDate,
  slotId,
  amountToPay,
  totalAmount,
  shippingInfo,
  saveUpcoming,
}: {
  order: Order;
  walletDeduction: number;
  customer: Customer;
  items: OrderItemType[];
  allItems: Item[];
  selectedDate: string;
  slotId: string;
  amountToPay: number;
  totalAmount: number;
  shippingInfo: ShippingInfo;
  saveUpcoming: boolean;
}) => {
  try {
    const subOrder = await createSubOrder({
      order,
      customer,
      items,
      allItems,
      amountToPay,
      selectedDate,
      slotId,
      totalAmount,
      shippingInfo,
      saveUpcoming,
    });

    const subOrderId = subOrder.suborderId as string;

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        wallet: customer.wallet - walletDeduction,
      },
    });

    const findUserPreference = await prisma.userPreference.findUnique({
      where: {
        customerId: customer.id,
      },
    });

    if (findUserPreference?.orderUpdates) {
      const html = await render(
        OrderUpdatedTemplate({
          type: "ADDONS",
          username: customer.firstName + " " + customer.lastName,
          orderId: subOrderId,
        })
      );
      await sendEmail(customer.email, "New item added to your order.", html);

      await prisma.notification.create({
        data: {
          title: "New item added",
          message: "New item added to your order. #" + subOrderId,
          customerId: customer.id,
          type: "ORDER",
        },
      });

      await prisma.transactionHistory.create({
        data: {
          customerId: customer.id,
          amount: walletDeduction,
          type: "DEBIT",
          description: "Wallet deduction for order #" + subOrderId,
          transactionId: subOrderId,
          transactionType: "WALLET",
        },
      });
    }

    // No return statement here
  } catch (error) {
    console.error("Error creating order items:", error);
    throw Error("Error creating order items");
  }
};

const confirmOrderFunction = async ({
  order,
  customer,
  items,
  allItems,
  selectedDate,
  slotId,
  amountToPay,
  totalAmount,
  saveUpcoming,
}: {
  order: Order;
  walletDeduction: number;
  customer: Customer;
  items: OrderItemType[];
  allItems: Item[];
  selectedDate: string;
  slotId: string;
  amountToPay: number;
  totalAmount: number;
  shippingInfo: ShippingInfo;
  saveUpcoming: boolean;
}) => {
  const subOrder = await createSubOrder({
    order,
    customer,
    items,
    allItems,
    selectedDate,
    slotId,
    amountToPay,
    totalAmount,
    shippingInfo: order.shippingInfo as ShippingInfo,
    saveUpcoming,
  });
  const subOrderId = subOrder.suborderId as string;

  const userPreference = await prisma.userPreference.findUnique({
    where: {
      customerId: customer.id,
    },
  });

  if (userPreference?.orderUpdates) {
    const html = await render(
      OrderUpdatedTemplate({
        type: "ADDONS",
        username: customer.firstName + " " + customer.lastName,
        orderId: subOrderId,
      })
    );
    await sendEmail(customer.email, "New day added to your order.", html);

    await prisma.notification.create({
      data: {
        title: "New day added",
        message: "New day added to your order. #" + subOrderId,
        customerId: customer.id,
        type: "ORDER",
      },
    });
  }
};
