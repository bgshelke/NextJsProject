import prisma from "@/lib/db";
import { ApiResponse, applyDiscount, updateCouponData } from "@/lib/response";
import {
  Item,
  OrderItemType,
  PickupOption,
  ShippingInfo,
  UserSelectedPlan,
} from "@/types/main";

import { createStripePayment, stripe } from "@/lib/stripe";
// import { applyDiscount, updateCouponData } from "@/lib/helpers/discountApply";

// import { kitchen } from "@/lib/helpers/fetcher";
import shipDayInstance from "@/lib/shipday";
// import { generateOrderId } from "@/lib/helpers/getRandomId";

import { render } from "@react-email/render";
import { sendEmail } from "@/lib/nodemailer";
import { generateOrderId, kitchen } from "@/lib/helper";
import GuestOrderTemplate from "@/components/EmailTemplates/templates/GuestOrderTemplate";
// import GuestOrderTemplate from "@/components/EmailTemplates/GuestOrderTemplate";

type JSONData = {
  selectedPlan: UserSelectedPlan;
  email: string;
  paymentMethodId?: string;
};

export async function POST(request: Request) {
  const { selectedPlan, paymentMethodId, email }: JSONData =
    await request.json();

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

    if (planType === "ONETIME" && !oneTimeOrder) {
      return ApiResponse(
        false,
        "Invalid request: Missing one-time order.",
        400
      );
    }

    if (!email)  return ApiResponse(false, "Invalid request: Missing email.", 400);

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

    const deliveryOption = oneTimeOrder.pickupOption;

    const allItems = await prisma.item.findMany({
      where: {
        id: {
          in: items.map((item) => item.id),
        },
      },
      select: {
        id: true,
        itemName: true,
        price: true,
      },
    });

    const totalAmount = items.reduce((total, myItem) => {
      const menuItem = allItems.find((item) => item.id === myItem.id);
      return total + (menuItem?.price || 0) * myItem.quantity;
    }, 0);



    const dwConfig = await prisma.dwConfig.findFirst();

    const deliveryFees = oneTimeOrder.pickupOption === "DELIVERY" ? dwConfig?.deliveryFees || 5 : 0;

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
    const customerName = shippingInfo.fullName || billingInfo.fullName;

    let createPayment;
    try {
      createPayment = await createStripePayment({
        amountToPay: amountToPay,
        customer: {
          email: email,
          fullName: customerName || "",
          phone: shippingInfo.phone || "",
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

    const order = await confirmOrderFunction({
      selectedPlan,
      items: items as OrderItemType[],
      allItems,
      amountToPay: amountToPay,
      totalAmount: totalAmount,
      deliveryFees,
      taxRate,
      discountId: discountfromDB?.id || undefined,
      email,
    });

    await updateCouponData(
      shippingInfo.addressLine1 || "",
      discountfromDB?.id || ""
    );

    const response = ApiResponse(
      true,
      "Payment Successful. Order Placed Successfully.",
      200,
      {
        orderId: order.orderIDShort,
        amountPaid: createPayment.amount / 100,
        type: "ONETIME",
        deliveryOption: deliveryOption,
      }
    );
    return response;
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong. Please try again.", 500);
  }
}

const createSubOrder = async ({
  selectedPlan,
  items,
  allItems,
  amountToPay,
  totalAmount,
  deliveryFees,
  taxRate,
  discountId,
  paymentIntentId,
  email,
}: {
  selectedPlan: UserSelectedPlan;
  items: OrderItemType[];
  allItems: Item[];
  amountToPay: number;
  totalAmount: number;
  deliveryFees: number;
  taxRate: number;
  discountId?: string;
  paymentIntentId?: string;
  email: string;
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

  const dwOrder = await prisma.guestOrder.create({
    data: {
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
      stripeOrderId: paymentIntentId ? paymentIntentId : undefined,
    },
  });

  if (deliveryOption === "PICKUP") {
    const pickupDate = new Date(orderDate || "").toISOString().split("T")[0];
    const createPickupOrder = await prisma.guestPickupOrder.create({
      data: {
        orderId: dwOrder.id,
        pickupDate: new Date(pickupDate),
        pickupTime: selectedPlan.oneTimeOrder?.pickupTime || "",
        total: totalAmount,
        kitchenId: selectedPlan.oneTimeOrder?.selectedKitchenId,
        thumbnail: menuOfTheDay?.thumbnail,
        orderType: selectedPlan.oneTimeOrder?.orderType || "ORDERNOW",
        dabbahID: generateOrderId(),
      },
    });

    await prisma.orderItem.createMany({
      data: items.map((item) => {
        const menuItem = allItems.find((i) => i.id === item.id);
        return {
          itemId: item.id as string,
          quantity: item.quantity,
          itemPrice: menuItem?.price || 0,
          pickupOrderId: createPickupOrder.id,
        };
      }),
    });
  }

  if (deliveryOption === "DELIVERY") {
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

    const deliveryDateOrder = new Date(orderDate || "")
      .toISOString()
      .split("T")[0];
    const createDabbah = await prisma.guestDabbah.create({
      data: {
        orderId: dwOrder.id,
        deliveryDate: new Date(deliveryDateOrder),
        timeSlotStart: findTimeSlot?.timeStart || "",
        timeSlotEnd: findTimeSlot?.timeEnd || "",
        thumbnail: menuOfTheDay?.thumbnail,
        orderType: selectedPlan.oneTimeOrder?.orderType || "ORDERNOW",
        total: totalAmount,
        dabbahID: generateOrderId(),
      },
    });

    await prisma.orderItem.createMany({
      data: items.map((item) => {
        const menuItem = allItems.find((i) => i.id === item.id);
        return {
          itemId: item.id as string,
          quantity: item.quantity,
          itemPrice: menuItem?.price || 0,
          dabbahId: createDabbah.id,
        };
      }),
    });

    const deliveryTime = findTimeSlot?.timeEnd + ":00";
    const [hours, minutes, seconds] = deliveryTime.split(":").map(Number);
    const deliveryDate = new Date(selectedPlan.oneTimeOrder?.orderDate || "");
    deliveryDate.setHours(hours, minutes, seconds);
    const expectedPickupTime = findTimeSlot?.timeStart + ":00";
    const customerAddress = `${shippingInfo.addressLine1}${
      shippingInfo.addressLine2 && `,${shippingInfo.addressLine2}`
    },${shippingInfo.city},${shippingInfo.state},"US",${shippingInfo.zipCode}`;

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
      customerEmail: email,
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
    const html = await render(
      GuestOrderTemplate({
        orderId: dwOrder.orderID,
        username: shippingInfo.fullName || "",
        orderDetails: selectedPlan,
        orderType: deliveryOption,
      })
    );
    await sendEmail(email, "Order Confirmation", html);
  }

  return { orderId: dwOrder.id, orderIDShort: dwOrder.orderID };
};

const confirmOrderFunction = async ({
  selectedPlan,
  items,
  allItems,
  amountToPay,
  totalAmount,
  deliveryFees,
  taxRate,
  discountId,
  email,
}: {
  selectedPlan: UserSelectedPlan;
  items: OrderItemType[];
  allItems: Item[];
  totalAmount: number;
  amountToPay: number;
  deliveryFees: number;
  taxRate: number;
  discountId?: string;
  email: string;
}) => {
  try {
    const order = await createSubOrder({
      selectedPlan,
      items,
      allItems,
      totalAmount,
      amountToPay,
      deliveryFees,
      taxRate,
      discountId,
      email,
    });

    const orderIDShort = order.orderIDShort as string;
    return {
      orderId: order.orderId,
      orderIDShort: orderIDShort,
    };
  } catch (error) {
    console.error("Error while creating order:", error);
    throw Error("Error while creating order");
  }
};
