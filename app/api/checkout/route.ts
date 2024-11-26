import prisma from "@/lib/db";
import { ApiResponse, saveAddressData } from "@/lib/response";
import {
  Item,
  OrderItemType,
  PickupOption,
  ShippingInfo,
  UserSelectedPlan,
} from "@/types/main";
import { authOptions } from "../auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { createStripePayment, stripe } from "@/lib/stripe";
import { applyDiscount, updateCouponData } from "@/lib/response";

import {
  generateOrderId,
  generateTransactionId,
  kitchen,
  MINIMUM_CHARGE_AMOUNT,
} from "@/lib/helper";
import shipDayInstance from "@/lib/shipday";

import { BillingInfo, Customer } from "@prisma/client";
import { twilioClient } from "@/lib/twilio";

type JSONData = {
  selectedPlan: UserSelectedPlan;
  useWalletAmount: boolean;
  smsNotifications: boolean;
  paymentMethodId?: string;
};

export async function POST(request: Request) {
  const {
    selectedPlan,
    paymentMethodId,
    smsNotifications,
    useWalletAmount,
  }: JSONData = await request.json();

  try {
    if (!selectedPlan || !paymentMethodId) {
      return ApiResponse(false, "Invalid request: Missing selected plan.", 400);
    }

    const {
      planType,
      oneTimeOrder,
      billingInfo,
      shippingInfo,
      items,
      discountCode,
      planName,
    } = selectedPlan;

    if (planType === "ONETIME") {
      if (!oneTimeOrder) {
        return ApiResponse(
          false,
          "Invalid request: Missing one-time order.",
          400
        );
      }
    }

    if (!oneTimeOrder || !billingInfo || !shippingInfo || !items || !planName) {
      return ApiResponse(
        false,
        "Invalid request: Missing required fields for checkout.",
        400
      );
    }

    if (selectedPlan.planType !== "ONETIME" && !selectedPlan.oneTimeOrder) {
      return ApiResponse(
        false,
        "Invalid request: Plan type must be 'ONETIME' for one-time orders.",
        400
      );
    }
    const user = await getServerSession(authOptions);

    if (!user) {
      return ApiResponse(false, "Unauthorized: User not found.", 401);
    }

    const dwCustomer = await prisma.customer.findUnique({
      where: { userId: user?.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        wallet: true,
      },
    });
    if (!dwCustomer) {
      return ApiResponse(false, "Unauthorized: User not found.", 401);
    }

    const orderCount = await prisma.order.count({
      where: {
        customerId: dwCustomer?.id,
      },
    });

    const allItems = await prisma.item.findMany({
  select: {
        id: true,
        itemName: true,
        price: true,
      },
    });

    const findDeliveryfees = await prisma.dwConfig.findFirst({
      select: {
        deliveryFees: true,
      },
    });

    const totalAmount = items.reduce((total, myItem) => {
      const menuItem = allItems.find((item) => item.id === myItem.id);
      return total + (menuItem?.price || 0) * myItem.quantity;
    }, 0);
    

    let deliveryFees = oneTimeOrder.pickupOption === "DELIVERY" ? findDeliveryfees?.deliveryFees || 5 : 0;

    const discountResponse = await applyDiscount({
      addressLine1: shippingInfo.addressLine1 || "",
      totalAmount: totalAmount,
      discountCode: discountCode || "",
      planType: "ONETIME",
    });
    if (!discountResponse.success) {
      return ApiResponse(
        false,
        discountResponse.error || "Invalid discount code.",
        400
      );
    }
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
            address: selectedPlan.billingInfo,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        taxRate = parseFloat(data.data.tax_rate);
        amountToPay = totalAmount + (totalAmount * taxRate) / 100;
        amountToPay = Math.round((amountToPay + deliveryFees) * 100) / 100;
      } else {
        throw new Error("Failed to calculate tax");
      }
    } catch (error) {
      console.log(error);
      throw new Error("Failed to calculate tax");
    }
 

    const { discountfromDB } = discountResponse;

    const discountType =
      discountfromDB?.discountAmount === 0 ? "percentage" : "amount";

    if (discountfromDB) {
      const discountAmount =
        discountType === "percentage"
          ? (amountToPay * (discountfromDB.discountPercentage as number)) / 100
          : (discountfromDB.discountAmount as number);
      amountToPay -= discountAmount;
      if (amountToPay < 0) {
        amountToPay = 0;
      }
    }


    let walletDeduction = 0;
    let stripeAmount = 0;
    if (useWalletAmount && dwCustomer.wallet && dwCustomer.wallet > 0) {
      walletDeduction = Math.min(dwCustomer.wallet, amountToPay);
      stripeAmount = amountToPay - walletDeduction;

      if (stripeAmount > 0 && stripeAmount < MINIMUM_CHARGE_AMOUNT) {
        walletDeduction = Math.max(0, amountToPay - MINIMUM_CHARGE_AMOUNT);
        stripeAmount = amountToPay - walletDeduction;
      }

      if (stripeAmount === 0) {
        const order = await createOrderForEntireWalletAmount({
          selectedPlan: selectedPlan,
          walletDeduction,
          customer: dwCustomer as Customer,
          items: items as OrderItemType[],
          allItems,
          amountToPay: parseFloat(amountToPay.toFixed(2)),
          totalAmount: totalAmount,
          deliveryFees,
          taxRate,
          discountId: discountfromDB?.id || undefined,
        });

        await updateCouponData(
          shippingInfo.addressLine1 || "",
          discountfromDB?.id || ""
        );

        if (
          (selectedPlan.saveAddressForLater && selectedPlan.addressId) ||
          selectedPlan.saveAddressForLater
        ) {
          await saveAddressData(
            false,
            selectedPlan.shippingInfo,
            selectedPlan.billingInfo,
            true,
            selectedPlan.addressId || null,
            dwCustomer.id
          );
        }

        const response = ApiResponse(
          true,
          "Payment Successful. Order placed successfully.",
          200,
          {
            orderId: order.orderIDShort,
            amountPaid: amountToPay,
          }
        );

        return response;
      } else {
       
        let createPayment;
        try {
          createPayment = await createStripePayment({
            amountToPay: stripeAmount,
            customer: {
              email: user?.user.email,
              fullName: (selectedPlan.billingInfo as BillingInfo)
                .fullName as string,
              phone: dwCustomer.phone || "",
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

        if (createPayment.status !== "succeeded") {
          return ApiResponse(false, "Payment Failed. Please try again.", 400);
        }

        if (smsNotifications && orderCount < 1) {
          await prisma.userPreference.update({
            where: { customerId: dwCustomer.id },
            data: {
              SMSNotification: true,
            },
          });
        }

        const order = await confirmOrderFunction({
          selectedPlan,
          walletDeduction,
          customer: dwCustomer as Customer,
          items: items as OrderItemType[],
          allItems,
          amountToPay: parseFloat(amountToPay.toFixed(2)),
          totalAmount: totalAmount,
          deliveryFees,
          taxRate,
          discountId: discountfromDB?.id || undefined,
        });

        await prisma.customer.update({
          where: {
            id: dwCustomer.id,
          },
          data: {
            wallet: dwCustomer.wallet - walletDeduction,
          },
        });

        await prisma.transactionHistory.create({
          data: {
            customerId: dwCustomer.id,
            amount: walletDeduction,
            type: "DEBIT",
            transactionType: "WALLET",
            description: "Wallet deduction for order #" + order?.orderIDShort,
            transactionId: generateTransactionId(),
          },
        });
        await updateCouponData(
          shippingInfo.addressLine1 || "",
          discountfromDB?.id || ""
        );

        if (
          (selectedPlan.saveAddressForLater && selectedPlan.addressId) ||
          selectedPlan.saveAddressForLater
        ) {
          await saveAddressData(
            false,
            selectedPlan.shippingInfo,
            selectedPlan.billingInfo,
            true,
            selectedPlan.addressId || null,
            dwCustomer.id
          );
        }

        const response = ApiResponse(
          true,
          "Payment Successful. New day added to your subscription order.",
          200,
          {
            orderId: order?.orderIDShort,
            amountPaid: amountToPay,
          }
        );

        return response;
      }
    }

    let createPayment;
    try {
      createPayment = await createStripePayment({
        amountToPay,
        customer: {
          email: user?.user.email,
          fullName: (selectedPlan.billingInfo as BillingInfo)
            .fullName as string,
          phone: dwCustomer.phone || "",
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

    if (smsNotifications && orderCount < 1) {
      await prisma.userPreference.update({
        where: { customerId: dwCustomer.id },
        data: {
          SMSNotification: true,
        },
      });
    }

    const order = await confirmOrderFunction({
      selectedPlan,
      walletDeduction,
      customer: dwCustomer as Customer,
      items: items as OrderItemType[],
      allItems,
      amountToPay: parseFloat(amountToPay.toFixed(2)),
      totalAmount: totalAmount,
      deliveryFees,
      taxRate,
      discountId: discountfromDB?.id || undefined,
    });

    await updateCouponData(
      shippingInfo.addressLine1 || "",
      discountfromDB?.id || ""
    );

    if (
      (selectedPlan.saveAddressForLater && selectedPlan.addressId) ||
      selectedPlan.saveAddressForLater
    ) {
      await saveAddressData(
        false,
        selectedPlan.shippingInfo,
        selectedPlan.billingInfo,
        true,
        selectedPlan.addressId || null,
        dwCustomer.id
      );
    }
    return ApiResponse(
      true,
      "Payment Successful. New day added to your subscription order.",
      200,
      {
        orderId: order?.orderIDShort,
        amountPaid: createPayment.amount / 100,
      }
    );
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong. Please try again.", 500);
  }
}

const createSubOrder = async ({
  selectedPlan,
  customer,
  items,
  allItems,
  totalAmount,
  amountToPay,
  deliveryFees,
  taxRate,
  discountId,
  paymentIntentId,
}: {
  selectedPlan: UserSelectedPlan;
  customer: Customer;
  items: OrderItemType[];
  allItems: Item[];
  totalAmount: number;
  amountToPay: number;
  deliveryFees: number;
  taxRate: number;
  discountId?: string;
  paymentIntentId?: string;
}) => {
  const orderDate = selectedPlan.oneTimeOrder?.orderDate;
  const deliveryOption = selectedPlan.oneTimeOrder
    ?.pickupOption as PickupOption;
  const shippingInfo = selectedPlan.shippingInfo as ShippingInfo;
  const menuOfTheDay = await prisma.dailyMenu.findUnique({
    where: {
      date: orderDate,
    },
    select: {
      thumbnail: true,
    },
  });

  const dwOrder = await prisma.order.create({
    data: {
      customerId: customer.id,
      orderID: generateOrderId(),
      deliveryFees: deliveryFees,
      planType: "ONETIME",
      totalAmount: totalAmount,
      paidAmount: amountToPay,
      billingInfo: {
        ...selectedPlan.billingInfo,
      },
      shippingInfo: {
        ...selectedPlan.shippingInfo,
      },
      deliveryInstructions: selectedPlan.shippingInfo?.deliveryInstructions,
      couponCodeId: discountId,
      orderStripeId: paymentIntentId ? paymentIntentId : undefined,
    },
  });

  if (deliveryOption === "PICKUP") {
    const createPickupOrder = await prisma.pickupOrder.create({
      data: {
        orderId: dwOrder.id,
        pickupDate: new Date(orderDate || ""),
        pickupTime: selectedPlan.oneTimeOrder?.pickupTime || "",
        total: totalAmount,
        kitchenId: selectedPlan.oneTimeOrder?.selectedKitchenId,
        thumbnail: menuOfTheDay?.thumbnail,
        orderType: selectedPlan.oneTimeOrder?.orderType || "ORDERNOW",
        dabbahID: generateOrderId(),
      },
    });

    const orderItems = items.map((item) => {
      const menuItem = allItems.find((i) => i.id === item.id);
      return {
        itemId: item.id || "",
        quantity: item.quantity,
        itemPrice: menuItem?.price || 0,
        pickupOrderId: createPickupOrder.id,
      };
    });

    if (orderItems && orderItems.length > 0) {
      await prisma.orderItem.createMany({
        data: orderItems,
      });
    }
  }

  if (deliveryOption === "DELIVERY") {
    const menuItem = await prisma.menuItem.findMany({
      where: {
        itemId: {
          in: items.map((item) => item.id || ""),
        },
      },
      select: {
        itemId: true,
        name: true,
      },
    });
    const findTimeSlot = await prisma.timeSlots.findUnique({
      where: {
        id: selectedPlan.oneTimeOrder?.slotId || "",
      },
      select: {
        timeStart: true,
        timeEnd: true,
      },
    });
    if (!findTimeSlot) {
      throw Error("Time slot not found");
    }

    const createDabbah = await prisma.dabbah.create({
      data: {
        orderId: dwOrder.id,
        deliveryDate: new Date(orderDate?.split("T")[0] || ""),
        timeSlotStart: findTimeSlot?.timeStart || "",
        timeSlotEnd: findTimeSlot?.timeEnd || "",
        thumbnail: menuOfTheDay?.thumbnail,
        orderType: selectedPlan.oneTimeOrder?.orderType || "ORDERNOW",
        total: totalAmount,
        dabbahID: generateOrderId(),
      },
    });

    const orderItems = items.map((item) => {
      const menuItem = allItems.find((i) => i.id === item.id);
      return {
        itemId: item.id || "",
        quantity: item.quantity,
        itemPrice: menuItem?.price || 0,
        dabbahId: createDabbah.id,
      };
    });

    if (orderItems && orderItems.length > 0) {
      await prisma.orderItem.createMany({
        data: orderItems as OrderItemType[],
      });
    }

    const deliveryTime = findTimeSlot?.timeEnd + ":00";
    const [hours, minutes, seconds] = deliveryTime.split(":").map(Number);
    const deliveryDate = new Date(selectedPlan.oneTimeOrder?.orderDate || "");
    deliveryDate.setHours(hours, minutes, seconds);
    const expectedPickupTime = findTimeSlot?.timeStart + ":00";
    const customerAddress = `${shippingInfo.addressLine1}${
      shippingInfo.addressLine2 && `,${shippingInfo.addressLine2}`
    },${shippingInfo.city},${shippingInfo.state},"US",${shippingInfo.zipCode}`;

    const orderItem = items.map((item) => {
      const menuItemData = menuItem.find((mi) => mi.itemId === item.id);
      const itemData = allItems.find((ai) => ai.id === item.id);

      return {
        name: itemData?.itemName || "",
        quantity: item.quantity,
        unitPrice: itemData?.price || 0,
        detail: menuItemData?.name || "",
      };
    });

    const orderInfoRequest = {
      customerName: shippingInfo.fullName || "",
      customerEmail: customer.email,
      customerPhoneNumber: shippingInfo.phone || "",
      customerAddress: customerAddress,
      deliveryInstruction: shippingInfo.deliveryInstructions || "",
      deliveryFee: deliveryFees,
      restaurantName: kitchen.name,
      restaurantPhoneNumber: kitchen.phone,
      restaurantAddress: kitchen.address,
      expectedDeliveryDate: new Date(orderDate || "")
        .toISOString()
        .split("T")[0],
      expectedDeliveryTime: deliveryTime,
      expectedPickupTime: expectedPickupTime,
      orderItem: orderItem,
      orderNumber: dwOrder.orderID,
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
  }

  if (
    (selectedPlan.saveAddressForLater && selectedPlan.addressId) ||
    selectedPlan.saveAddressForLater
  ) {
    await saveAddressData(
      false,
      selectedPlan.shippingInfo,
      selectedPlan.billingInfo,
      true,
      selectedPlan.addressId || null,
      customer.id
    );
  }

  return { orderId: dwOrder.id, orderIDShort: dwOrder.orderID };
};

const createOrderForEntireWalletAmount = async ({
  selectedPlan,
  customer,
  walletDeduction,
  items,
  allItems,
  totalAmount,
  amountToPay,
  deliveryFees,
  taxRate,
  discountId,
}: {
  selectedPlan: UserSelectedPlan;
  walletDeduction: number;
  customer: Customer;
  items: OrderItemType[];
  allItems: Item[];
  totalAmount: number;
  amountToPay: number;
  deliveryFees: number;
  taxRate: number;
  discountId?: string;
}) => {
  try {
    const order = await createSubOrder({
      selectedPlan,
      customer,
      items,
      allItems,
      totalAmount,
      amountToPay,
      deliveryFees,
      taxRate,
      discountId,
    });

    const orderIDShort = order.orderIDShort as string;

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        wallet: customer.wallet - walletDeduction,
      },
    });

    try {
      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error("TWILIO_PHONE_NUMBER environment variable is not set.");
      }

      const findUserPreference = await prisma.userPreference.findUnique({
        where: {
          customerId: customer.id,
        },
      });
      await prisma.transactionHistory.create({
        data: {
          customerId: customer.id,
          amount: walletDeduction,
          description: "Wallet deduction for order #" + order.orderIDShort,
          transactionType: "WALLET",
          transactionId: order.orderIDShort,
          type: "DEBIT",
        },
      });

      if (findUserPreference?.walletUpdates) {
        await prisma.notification.create({
          data: {
            customerId: customer.id,
            message: `Your wallet amount is used for order ${orderIDShort}.`,
            type: "WALLET",
            title: "Wallet Amount Used",
          },
        });
        // const html = await render(
        //   Order
        // );
        // await sendEmail({
        //   to: customer.email,
        //   subject: "Wallet Amount Used",
        //   html: `<p>Your wallet amount is used for order ${orderIDShort}.</p>`,
        // });
      }

      if (findUserPreference?.SMSNotification) {
        await twilioClient.messages.create({
          to: "+1" + selectedPlan.shippingInfo.phone || "",
          from: process.env.TWILIO_PHONE_NUMBER,
          body: `Your order has been created successfully. Please check your order details on the website. Order ID: #${orderIDShort} or Click here to view your order: ${process.env.NEXT_PUBLIC_URL}/order-history/${orderIDShort}`,
        });
      }
    } catch (error) {
      console.log("Twillio error", error);
    }
    return order;
  } catch (error) {
    console.error("Error while creating order:", error);
    throw Error("Error while creating order");
  }
};

const confirmOrderFunction = async ({
  selectedPlan,
  customer,
  walletDeduction,
  items,
  allItems,
  totalAmount,
  amountToPay,
  deliveryFees,
  taxRate,
  discountId,
}: {
  selectedPlan: UserSelectedPlan;
  walletDeduction: number;
  customer: Customer;
  items: OrderItemType[];
  allItems: Item[];
  totalAmount: number;
  amountToPay: number;
  deliveryFees: number;
  taxRate: number;
  discountId?: string;
}) => {
  try {
    const order = await createSubOrder({
      selectedPlan,
      customer,
      items,
      allItems,
      totalAmount,
      amountToPay,
      deliveryFees,
      taxRate,
      discountId,
    });

    const orderIDShort = order.orderIDShort as string;

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        wallet: customer.wallet - walletDeduction,
      },
    });

    try {
      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error("TWILIO_PHONE_NUMBER environment variable is not set.");
      }

      const findUserPreference = await prisma.userPreference.findUnique({
        where: {
          customerId: customer.id,
        },
      });

      if (findUserPreference?.SMSNotification) {
        await twilioClient.messages.create({
          to: "+1" + selectedPlan.shippingInfo.phone || "",
          from: process.env.TWILIO_PHONE_NUMBER,
          body: `Your order has been created successfully. Please check your order details on the website. Order ID: #${orderIDShort} or Click here to view your order: ${process.env.NEXT_PUBLIC_URL}/order-history/${orderIDShort}`,
        });
      }

      return order;
    } catch (error) {
      console.log("Twillio error", error);
    }
  } catch (error) {
    console.error("Error while creating order:", error);
    throw Error("Error while creating order");
  }
};
