import NewWeekOrdersTemplate from "@/components/EmailTemplates/templates/NewWeekOrdersTemplate";
import prisma from "@/lib/db";
import { generateOrderId, kitchen } from "@/lib/helper";
import { sendEmail } from "@/lib/nodemailer";
import { ApiResponse } from "@/lib/response";
import { stripe } from "@/lib/stripe";
import { twilioClient } from "@/lib/twilio";
import { Item, ResponseType } from "@/types/main";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { CouponCode, OrderItem, ShippingInfo, SubOrders } from "@prisma/client";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import Stripe from "stripe";

interface CustomerDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  deliveryInstructions: string;
  deliveryFees: number;
}

export const POST = async (req: Request) => {
  try {
    const body = await req.text();
    const signature = req.headers.get("Stripe-Signature") as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );

      switch (event.type) {
        case "invoice.payment_succeeded":
          const invoice = event.data.object;
          const customer = invoice.customer;
          const subscription = invoice.subscription;

          if (
            invoice.status === "paid" &&
            invoice.billing_reason === "subscription_cycle" &&
            subscription
          ) {
            const dwCustomerId =
              invoice.metadata?.dwCustomerId ||
              invoice.subscription_details?.metadata?.dwCustomerId;

            //Create Next Order
            await createNextOrder(
              invoice,
              customer as string,
              dwCustomerId as string
            );
          }

          break;
        case "payment_method.attached":
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return NextResponse.json<ResponseType>(
        {
          success: true,
          message: "Webhook received",
        },
        { status: 200 }
      );
    } catch (error) {
      console.log(error);
      return NextResponse.json<ResponseType>(
        {
          success: false,
          message: "Webhook Error",
        },
        { status: 400 }
      );
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.log(error);
  }
};

async function createNextOrder(
  invoice: Stripe.Invoice,
  customer: string,
  dwCustomerId: string
) {
  try {
    const getStripeUser = await stripe.customers.retrieve(customer as string);

    if (getStripeUser.deleted) {
      return ApiResponse(false, "User not available or deleted", 400);
    }

    let customerId = dwCustomerId;

    if (!dwCustomerId) {
      const stripeUser = getStripeUser as Stripe.Customer;
      const email = stripeUser.email;
      const dwCustomer = await prisma.customer.findUnique({
        where: {
          email: email as string | "",
        },
      });
      customerId = dwCustomer?.id || "";
    }

    if (!customerId) {
      return ApiResponse(false, "User not found", 400);
    }

    //  Find the previous order from the database to make completed
    const previousOrder = await prisma.order.findFirst({
      where: {
        status: "ACTIVE",
        planType: "SUBSCRIPTION",
        customerId: customerId,
      },
      orderBy: [{ firstDeliveryDate: "desc" }, { createdAt: "desc" }],
    });

    if (!previousOrder) {
      return ApiResponse(false, "Previous order not found", 400);
    }

    //make the previous order completed
    await prisma.order.update({
      where: {
        id: previousOrder.id,
      },
      data: {
        status: "COMPLETED",
      },
    });

    //find the upcoming order and make it active
    const upcomingOrder = await prisma.order.findFirst({
      where: {
        status: "UPCOMING",
        customerId: customerId,
      },
      orderBy: {
        firstDeliveryDate: "desc",
        createdAt: "desc",
      },
    });

    const dwCustomer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (upcomingOrder) {
      // update the upcoming order to active
      const updateUpcomingOrder = await prisma.order.update({
        where: {
          id: upcomingOrder.id,
        },
        data: {
          status: "ACTIVE",
          invoiceId: invoice.id,
        },
      });

      const shippingInfo =
        upcomingOrder.shippingInfo as unknown as ShippingInfo;

      const address = `${shippingInfo?.addressLine1}, ${
        shippingInfo?.addressLine2 && `${shippingInfo?.addressLine2}, `
      } ${shippingInfo?.city}, ${shippingInfo?.state}, ${
        shippingInfo?.zipCode
      }`;

      const customerDetails = {
        fullName: shippingInfo?.fullName || "",
        email: dwCustomer?.email || "",
        phone: shippingInfo?.phone || dwCustomer?.phone || "",
        address: address,
        deliveryInstructions: upcomingOrder.deliveryInstructions || "",
        deliveryFees: upcomingOrder.deliveryFees,
      };

      //Create shipday order
      await createShipdayOrder(upcomingOrder.id, customerDetails);

      await cutDabbahwalaWallet(customerId, upcomingOrder.totalAmount, invoice);
      //Create Upcoming Order

      // new week date = upcomingOrder.firstDeliveryDate + 7 days
      const newWeekDate = new Date(upcomingOrder.firstDeliveryDate as Date);
      newWeekDate.setDate(newWeekDate.getDate() + 7);
      const nextWeekDate = new Date(newWeekDate.toISOString().split("T")[0]);

      await createNextUpcomingWeekOrder(
        nextWeekDate,
        customerId,
        upcomingOrder.subscriptionId as string,
        customerDetails
      );

      //Notify User

      await notifyUser(customerId, customerDetails);
    }

    // const getStripeUser = await stripe.customers.retrieve(customer as string);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function createShipdayOrder(
  upcomingOrderId: string,
  customerDetails: CustomerDetails
) {
  try {
    const allItems = await prisma.item.findMany();

    const findSubOrders = await prisma.subOrders.findMany({
      where: {
        orderId: upcomingOrderId,
      },
      include: {
        items: true,
      },
    });

    for (const subOrder of findSubOrders) {
      const menuDays = await prisma.dailyMenu.findFirst({
        where: {
          date: subOrder.deliveryDate,
        },
        select: {
          thumbnail: true,
          menuItems: true,
        },
      });

      const findMenuItems = await prisma.menuItem.findMany({
        where: {
          id: {
            in: menuDays?.menuItems?.map((item) => item.menuItemId),
          },
        },
      });
      const subOrderItems = subOrder.items;

      const shipdayObject = subOrderItems.map((item: OrderItem) => {
        const myItem = allItems.find((i) => i.id === item.itemId);
        return {
          name: myItem?.itemName,
          quantity: item.quantity,
          unitPrice: myItem?.price,
          detail: findMenuItems?.find(
            (menuItem) => menuItem.itemId === item.itemId
          )?.name,
        };
      });

      const orderInfoRequest = {
        customerName: customerDetails.fullName,
        customerEmail: customerDetails.email,
        customerPhoneNumber: customerDetails.phone,
        customerAddress: customerDetails.address,
        deliveryInstruction: customerDetails.deliveryInstructions,
        deliveryFee: customerDetails.deliveryFees,
        restaurantName: kitchen.name,
        restaurantPhoneNumber: kitchen.phone,
        restaurantAddress: kitchen.address,
        expectedDeliveryDate: new Date(subOrder.deliveryDate)
          .toISOString()
          .split("T")[0],
        expectedDeliveryTime: subOrder.timeSlotEnd + ":00",
        expectedPickupTime: subOrder.timeSlotStart + ":00",
        orderItem: shipdayObject,
        orderNumber: subOrder.subOrderID,
        orderSource: "www.dabbahwala.com",
        tax: 0,
        totalOrderCost: subOrder.total,
      };
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function notifyUser(
  dwCustomerId: string,
  customerDetails: CustomerDetails
) {
  const userPrefrence = await prisma.userPreference.findUnique({
    where: {
      customerId: dwCustomerId,
    },
  });

  try {
    if (userPrefrence?.SMSNotification) {
      try {
        await twilioClient.messages.create({
          body: `Your new week order has been created successfully. Please check your my subscription page for more details.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: `+1${customerDetails.phone}` || "",
        });
      } catch (error) {
        console.log(error);
      }
    }

    if (userPrefrence?.orderUpdates) {
      const email = customerDetails.email as string;
      const html = await render(
        NewWeekOrdersTemplate({
          username: customerDetails.fullName,
        })
      );
      await sendEmail(email, "New Week Subscription Order Started", html);

      await prisma.notification.create({
        data: {
          title: "Your subscription order is active.",
          message: `Your new week order has been created successfully. Please check your my subscription page for more details.`,
          type: "SUBSCRIPTION",
          customerId: dwCustomerId,
        },
      });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function cutDabbahwalaWallet(
  dwCustomerId: string,
  walletBalance: number,
  invoice: Stripe.Invoice
) {
  try {
    const discountAmount = Math.min(walletBalance, invoice.total / 100);

    // Create a coupon in Stripe
    const coupon = await stripe.coupons.create({
      amount_off: discountAmount * 100, //amount in cents
      currency: "usd",
      duration: "once",
    });

    // Apply the coupon to the subscription
    const updateStripeSubscription = await stripe.subscriptions.update(
      invoice.subscription as string,
      {
        coupon: coupon.id,
      }
    );

    await prisma.customer.update({
      where: { id: dwCustomerId },
      data: { wallet: walletBalance - discountAmount },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function createNextUpcomingWeekOrder(
  nextWeekDate: Date,
  dwCustomerId: string,
  dwSubscriptionId: string,
  customerDetails: CustomerDetails
) {
  try {
    //next delivery date for the upcoming week
    const createNextDeliveryDate = new Date(nextWeekDate);

    const dwConfig = await prisma.dwConfig.findFirst();

    const findPreferenceOrder = await prisma.preferenceOrder.findFirst({
      where: {
        subscriptionId: dwSubscriptionId,
        customerId: dwCustomerId,
      },
    });

    const subOrders = await prisma.preferenceSubOrder.findMany({
      where: {
        preferenceOrderId: findPreferenceOrder?.id,
      },
    });

    const nextUpcomingOrder = await prisma.order.create({
      data: {
        orderID: generateOrderId(),
        deliveryFees: subOrders.length * (dwConfig?.deliveryFees || 5),
        status: "UPCOMING",
        billingInfo: findPreferenceOrder?.billingInfo,
        shippingInfo: findPreferenceOrder?.shippingInfo,
        deliveryInstructions: customerDetails.deliveryInstructions,
        planType: "SUBSCRIPTION",
        paidAmount: 0,
        totalAmount: 5,
        customerId: dwCustomerId,
        subscriptionId: dwSubscriptionId,
        firstDeliveryDate: createNextDeliveryDate,
      },
    });

    for (const subOrder of subOrders) {
      // Calculate days until target weekday

      //Weekday to get date from the date to under the week

      const currentDay = subOrder.weekDay; // Monday , Tuesday , Wednesday , Thursday , Friday , Saturday , Sunday

      const deliveryDate = new Date(createNextDeliveryDate);

      // Calculate the next occurrence of the desired weekday
      const weekdayMap: { [key: string]: number } = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };

      const currentWeekday = deliveryDate.getDay();
      let daysToAdd = weekdayMap[currentDay] - currentWeekday;

      // If the day has already passed this week, don't move to next week
      // just get the day within the current week period
      if (daysToAdd < 0) {
        daysToAdd += 7;
      }

      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);

      const findThumbnail = await prisma.dailyMenu.findFirst({
        where: {
          date: deliveryDate,
        },
      });

      const findItems = await prisma.orderItem.findMany({
        where: {
          preferenceSubOrderId: subOrder.id,
        },
      });
      const subTotal = findItems.reduce(
        (acc, item) => acc + item.itemPrice * item.quantity,
        0
      );

      const newSubOrder = await prisma.subOrders.create({
        data: {
          deliveryDate: deliveryDate,
          subOrderID: generateOrderId(),
          orderId: nextUpcomingOrder.id,
          total: subTotal,
          timeSlotStart: subOrder.timeSlotStart,
          timeSlotEnd: subOrder.timeSlotEnd,
          status: "ACCEPTED",
          thumbnail: findThumbnail?.thumbnail,
        },
      });

      // await prisma.orderItem.createMany({
      //   data: findItems.map((item) => ({
      //     itemId: item.itemId,
      //     quantity: item.quantity,
      //     itemPrice: item.itemPrice,
      //     subOrderId: newSubOrder.id,
      //   })),
      // });

      for (const item of findItems) {
        const newItem = await prisma.orderItem.create({
          data: {
            itemId: item.itemId,
            quantity: item.quantity,
            itemPrice: item.itemPrice,
            subOrderId: newSubOrder.id,
          },
        });
      }

      await prisma.order.update({
        where: {
          id: nextUpcomingOrder.id,
        },
        data: {
          totalAmount: {
            increment: subTotal,
          },
        },
      });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}
