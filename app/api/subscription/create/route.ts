import {
  ApiResponse,
  applyDiscount,
  saveAddressData,
  updateCouponData,
} from "@/lib/response";
import { Item, SubscriptionDay, UserSelectedPlan } from "@/types/main";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { getTaxRateStripe, stripe } from "@/lib/stripe";

import Stripe from "stripe";

import shipDayInstance, { OrderInfoRequest } from "@/lib/shipday";

import { render } from "@react-email/render";

import { sendEmail } from "@/lib/nodemailer";
import { twilioClient } from "@/lib/twilio";
import { generateOrderId, getTaxRate, kitchen } from "@/lib/helper";
import SubscriptionTemplate from "@/components/EmailTemplates/templates/SubscriptionTemplate";
import { addDays, isToday } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { estTimeZone } from "@/lib/helper/dateFunctions";

interface JsonData {
  selectedPlan: UserSelectedPlan;
  paymentMethodId: string;
  smsNotifications: boolean;
}

interface ItemWithQuantity extends Item {
  quantity: number;
}
export async function POST(req: Request) {
  try {
    const { selectedPlan, paymentMethodId, smsNotifications }: JsonData =
      await req.json();

    if (!selectedPlan || !paymentMethodId) {
      return ApiResponse(
        false,
        "Something went wrong. Please try again later.",
        400
      );
    }

    if (
      selectedPlan.planType !== "SUBSCRIPTION" ||
      !selectedPlan.subscriptionOrder
    ) {
      return ApiResponse(
        false,
        "Invalid plan type. Please select a subscription plan",
        400
      );
    }

    const user = await getServerSession(authOptions);
    if (!user?.user) {
      return ApiResponse(false, "Unauthorized.", 401);
    }

    const dwCustomer = await prisma.customer.findUnique({
      where: { userId: user?.user.id, email: user?.user.email },
    });

    if (!dwCustomer) {
      return ApiResponse(false, "User not found. Please try again later.", 401);
    }

    if (smsNotifications && user?.user?.orders && user?.user?.orders < 1) {
      await prisma.userPreference.update({
        where: { customerId: dwCustomer.id },
        data: {
          SMSNotification: true,
        },
      });
    }

    const existingStripeCustomer = await stripe.customers.list({
      email: dwCustomer.email,
      limit: 1,
    });

    const selectedDays = selectedPlan.subscriptionOrder.subscriptionDays;

    let customer;
    if (existingStripeCustomer.data.length > 0) {
      customer = existingStripeCustomer.data[0];
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        return ApiResponse(
          false,
          "You already have an active subscription.",
          409
        );
      }
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } else {
      customer = await stripe.customers.create({
        email: dwCustomer.email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
        address: {
          city: selectedPlan.shippingInfo?.city,
          country: "US",
          line1: selectedPlan.shippingInfo?.addressLine1,
          line2: selectedPlan.shippingInfo?.addressLine2,
          postal_code: selectedPlan.shippingInfo?.zipCode,
          state: selectedPlan.shippingInfo?.state,
        },
        name: selectedPlan.shippingInfo?.fullName,
        phone: selectedPlan.shippingInfo?.phone,
      });
    }

    let itemTotal = 0;

    //total of all the items in all the days
    for (const day of selectedDays) {
      const itemsWithQuantity = await getItemsWithQuantity(day.items);
      const totalPrice = calculateTotalPrice(
        itemsWithQuantity as ItemWithQuantity[]
      );
      itemTotal += totalPrice;
    }

    const dwConfig = await prisma.dwConfig.findFirst({
      where: {
        uniqueKey: "dwsettings",
      },
      select: {
        deliveryFees: true,
        maxAmountForFreeDelivery: true,
      },
    });

    let deliveryFees = 0;

    let totalToPay = 0;
    let totalWithoutTax = 0;
    
    const { taxRate, totalAfterTax } = await getTaxRate(
      itemTotal,
      selectedPlan.billingInfo
    );


    

    if (dwConfig && itemTotal < (dwConfig.maxAmountForFreeDelivery || 100)) {
      deliveryFees = dwConfig.deliveryFees || 5;
      totalToPay =
        totalAfterTax +
        deliveryFees *
          (selectedPlan.subscriptionOrder.subscriptionDays.length || 1);
      totalWithoutTax =
        deliveryFees *
        (selectedPlan.subscriptionOrder.subscriptionDays.length || 1);
    } else {
      deliveryFees = 0;
      totalToPay = totalAfterTax;
    }

    const { stripeDiscount, discountfromDB, success, error } =
      await applyDiscount({
        addressLine1: selectedPlan.billingInfo?.addressLine1 || "",
        totalAmount: totalToPay,
        discountCode: selectedPlan.discountCode || "",
        planType: "SUBSCRIPTION",
      });

    const isCoupon =
      stripeDiscount && stripeDiscount.id ? stripeDiscount.id : "";

    const taxRateStripe = await getTaxRateStripe(taxRate);
    const startDate = Math.floor(
      new Date(selectedPlan.subscriptionOrder.deliveryDate).getTime() / 1000
    );
    const endDate = new Date(selectedPlan.subscriptionOrder.deliveryDate);
    endDate.setDate(endDate.getDate() + 7);

    const subscriptionPrice = await stripe.prices.create({
      currency: "usd",
      recurring: {
        interval: "week",
      },
      product_data: {
        name: `Weekly Subscription - ${selectedDays.length} days`,
      },
      unit_amount:
        (itemTotal +
          deliveryFees *
            (selectedPlan.subscriptionOrder.subscriptionDays.length || 1)) *
        100,
    });

    let subscription;
    let chargedOption = "CHARGED";
    try {
      // Get current UTC time
      const currentUTC = new Date();

      // Get selected date in UTC
      const selectedDateUTC = new Date(
        selectedPlan.subscriptionOrder.deliveryDate
      );

      // Subtract EST offset (UTC-5) to account for EST timezone
      const estOffset = 5; // EST is UTC-5
      const currentUTCforEST = new Date(currentUTC);
      currentUTCforEST.setHours(currentUTC.getHours() - estOffset);

      // Calculate tomorrow's UTC date (for EST comparison)
      const tomorrowUTCforEST = new Date(currentUTCforEST);
      tomorrowUTCforEST.setDate(currentUTCforEST.getDate() + 1);

      // Format dates for comparison
      const currentDateStr = currentUTCforEST.toISOString().split("T")[0];
      const selectedDateStr = selectedDateUTC.toISOString().split("T")[0];
      const tomorrowDateStr = tomorrowUTCforEST.toISOString().split("T")[0];

      console.log("Dates for comparison:", {
        currentEST: currentDateStr,
        selectedDate: selectedDateStr,
        tomorrowEST: tomorrowDateStr,
      });

      // Create a single price for the total subscription amount
      const subscriptionItems = [
        {
          price: subscriptionPrice.id,
          quantity: 1,
        },
      ];


      const mySelectedDate = new Date(selectedPlan.subscriptionOrder.deliveryDate);
      // Set to midnight UTC for the selected date
      mySelectedDate.setUTCHours(0, 0, 0, 0);
      
      // Get current time in UTC
      const now = new Date();
      
      // Calculate the Unix timestamp
      let unixTime = Math.floor(mySelectedDate.getTime() / 1000);
      
      // If the selected date is today or in the past, add a day to ensure it's in the future
      if (unixTime <= Math.floor(now.getTime() / 1000)) {
        unixTime = Math.floor(addDays(mySelectedDate, 1).getTime() / 1000);
      }

      console.log("Selected date:", mySelectedDate.toISOString());
      console.log("Unix timestamp:", unixTime);
      console.log("Unix timestamp date:", new Date(unixTime * 1000).toISOString());



      if (selectedDateStr === tomorrowDateStr) {
        subscription = (await stripe.subscriptions.create({
          customer: customer.id,
          items: subscriptionItems,
          currency: "usd",
          proration_behavior: "none",
          description: "Dabbahwala Subscription",
          expand: ["latest_invoice.payment_intent"],
          metadata: {
            dwCustomerId: dwCustomer.id,
            type: "CURRENT",
            days: selectedPlan?.subscriptionOrder?.subscriptionDays
              .map((day: SubscriptionDay) =>
                new Date(day.date).toLocaleDateString("en-US", {
                  weekday: "long",
                })
              )
              .join(", "),
          },
          default_tax_rates: [taxRateStripe.id],
          payment_settings: {
            payment_method_types: ["card"],
          },
          coupon: isCoupon,
        })) as Stripe.Subscription;
        chargedOption = "CHARGED";
      } else {
        subscription = (await stripe.subscriptions.create({
          customer: customer.id,
          items: subscriptionItems,
          currency: "usd",
          proration_behavior: "none",
          description: "Dabbahwala Subscription",
          expand: ["latest_invoice.payment_intent"],
          metadata: {
            dwCustomerId: dwCustomer.id,
            type: "SCHEDULED",
            days: selectedPlan?.subscriptionOrder?.subscriptionDays
              .map((day: SubscriptionDay) =>
                new Date(day.date).toLocaleDateString("en-US", {
                  weekday: "long",
                })
              )
              .join(", "),
          },
          default_tax_rates: [taxRateStripe.id],
          payment_settings: {
            payment_method_types: ["card"],
          },
          coupon: isCoupon,
          billing_cycle_anchor:unixTime,
        })) as Stripe.Subscription;
        chargedOption = "NOT_CHARGED";
      }
    } catch (e: any) {
      if (chargedOption === "CHARGED") {
        console.log("e", e);
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
    }

    if (!subscription) {
      return ApiResponse(false, "Payment Failed. Please try again.", 400);
    }

    const invoice = subscription.latest_invoice as Stripe.Invoice;

    let paymentIntent;

    if (chargedOption === "CHARGED") {
      paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
    }

    if (paymentIntent && paymentIntent.status !== "succeeded") {
      return ApiResponse(false, "Payment Failed. Please try again.", 400);
    }

    if (
      (chargedOption === "CHARGED" &&
        paymentIntent &&
        paymentIntent.status === "succeeded") ||
      (chargedOption === "NOT_CHARGED" && subscription.status === "active")
    ) {
      await updateCouponData(
        selectedPlan.shippingInfo?.addressLine1 || "",
        discountfromDB?.id || ""
      );

      const customerAddress = `${selectedPlan.shippingInfo.addressLine1},${
        selectedPlan.shippingInfo.addressLine2 &&
        selectedPlan.shippingInfo.addressLine2 + ","
      }${selectedPlan.shippingInfo.city},${
        selectedPlan.shippingInfo.state
      },"US",${selectedPlan.shippingInfo.zipCode}`;

      const createSubscriptionDw = await prisma.subscription.create({
        data: {
          customerId: dwCustomer.id,
          isActive: true,
          firstDeliveryDate: new Date(subscription.current_period_start * 1000),
          subscriptionStripeId: subscription.id ? subscription.id : "",
          stripePriceId: subscriptionPrice.id,
        },
      });

      const currentWeekDate = new Date(
        selectedPlan?.subscriptionOrder?.deliveryDate || new Date()
      );
      let upcomingWeekDate = new Date(currentWeekDate);

      const createSubscriptionOrder = async (isUpcoming: boolean) => {
        const getUpcomingDate = (date: Date) => {
          const upcomingDate = new Date(date);
          upcomingDate.setDate(upcomingDate.getDate() + 7);
          return upcomingDate;
        };
        
        
        totalWithoutTax = itemTotal + deliveryFees * (selectedPlan?.subscriptionOrder?.subscriptionDays.length || 1)
        console.log("totalWithoutTax", totalWithoutTax);

        const userOrder = await prisma.order.create({
          data: {
            customerId: dwCustomer.id,
            orderID: generateOrderId(),
            totalAmount: totalWithoutTax || 0,
            paidAmount: chargedOption === "CHARGED" ? invoice?.total / 100 : 0,
            billingInfo: {
              ...selectedPlan.billingInfo,
            },
            shippingInfo: {
              ...selectedPlan.shippingInfo,
            },
            deliveryFees: deliveryFees,
            firstDeliveryDate: isUpcoming
              ? getUpcomingDate(currentWeekDate)
              : currentWeekDate,

            couponCodeId:
              !isUpcoming && discountfromDB?.id ? discountfromDB.id : undefined,
            status: isUpcoming ? "UPCOMING" : "ACTIVE",
            planType: "SUBSCRIPTION",
            invoiceId: !isUpcoming && invoice?.id ? invoice?.id : undefined,
            subscriptionId: createSubscriptionDw?.id
              ? createSubscriptionDw?.id
              : undefined,
          },
        });

        // Now create sub-orders and their items
        for (const subDay of selectedDays) {
          const myItems = await getItemsWithQuantity(subDay.items);
          const totalSubOrder = myItems.reduce(
            (acc: number, item) =>
              acc + (item.price || 0) * (item.quantity || 0),
            0
          );
          const findMenu = await prisma.dailyMenu.findUnique({
            where: {
              date: subDay.date,
            },
            select: {
              thumbnail: true,
              menuItems: {
                select: {
                  menuItem: {
                    select: {
                      itemId: true,
                      name: true,
                    },
                  },
                  dailyMenu: {
                    select: {
                      thumbnail: true,
                    },
                  },
                },
              },
            },
          });

          const thumnail = findMenu?.thumbnail;
          const menuItems = findMenu?.menuItems;

          const timeSlot = await prisma.timeSlots.findUnique({
            where: {
              id: subDay.slotId as string,
            },
            select: {
              id: true,
              timeStart: true,
              timeEnd: true,
            },
          });

          const findPreferenceOrder = await prisma.preferenceOrder.findFirst({
            where: {
              subscriptionId: createSubscriptionDw.id,
            },
          });
          let createPreferenceOrder = null;

          if (!findPreferenceOrder) {
            createPreferenceOrder = await prisma.preferenceOrder.create({
              data: {
                billingInfo: {
                  ...selectedPlan.billingInfo,
                },
                shippingInfo: {
                  ...selectedPlan.shippingInfo,
                },
                customerId: dwCustomer.id,
                subscriptionId: createSubscriptionDw.id,
              },
            });
          }

          const subOrder = await prisma.subOrders.create({
            data: {
              orderId: userOrder.id,
              subOrderID: generateOrderId(),
              thumbnail: thumnail || undefined,
              timeSlotStart: timeSlot?.timeStart as string,
              timeSlotEnd: timeSlot?.timeEnd as string,
              status: "ACCEPTED",
              deliveryDate: isUpcoming
                ? getUpcomingDate(
                    new Date(new Date(subDay.date).toISOString().split("T")[0])
                  )
                : new Date(new Date(subDay.date).toISOString().split("T")[0]),
              total: totalSubOrder || 0,
            },
          });

          const orderItemsData = await Promise.all(
            subDay.items.map(async (item) => ({
              itemId: item.id,
              quantity: item.quantity || 0,
              itemPrice: await getItemPriceById(item.id),
              subOrderId: subOrder.id,
            }))
          );

          await prisma.orderItem.createMany({
            data: orderItemsData,
          });

          if (!isUpcoming) {
            if (createPreferenceOrder) {
              await prisma.preferenceSubOrder.create({
                data: {
                  timeSlotStart: timeSlot?.timeStart as string,
                  timeSlotEnd: timeSlot?.timeEnd as string,
                  weekDay: new Date(subDay.date).toLocaleDateString("en-US", {
                    weekday: "long",
                  }),
                  preferenceOrderId: createPreferenceOrder?.id,
                },
              });
            }
            const preferenceOrderItemsData = await Promise.all(
              subDay.items.map(async (item) => ({
                itemId: item.id,
                quantity: item.quantity || 0,
                itemPrice: await getItemPriceById(item.id),
                preferenceSubOrderId: createPreferenceOrder?.id,
              }))
            );
            if (createPreferenceOrder) {
              await prisma.orderItem.createMany({
                data: preferenceOrderItemsData,
              });
            }
            const orderInfoRequest = {
              customerName: selectedPlan.shippingInfo.fullName as string,
              customerEmail: dwCustomer.email,
              customerPhoneNumber: selectedPlan.shippingInfo.phone as string,
              customerAddress: customerAddress as string,
              deliveryInstruction:
                selectedPlan.shippingInfo.deliveryInstructions || "",
              deliveryFee: deliveryFees,
              restaurantName: kitchen.name,
              restaurantPhoneNumber: kitchen.phone,
              restaurantAddress: kitchen.address,
              discountAmount: Number(discountfromDB?.discountAmount || 0) || 0,
              expectedDeliveryDate: new Date(subOrder.deliveryDate)
                .toISOString()
                .split("T")[0],
              expectedDeliveryTime: timeSlot?.timeEnd + ":00",
              expectedPickupTime: timeSlot?.timeStart + ":00",
              orderItem: myItems.map((item) => ({
                name: item.itemName,
                quantity: item.quantity,
                unitPrice: item.price,
                detail:
                  menuItems?.find(
                    (menuItem) => menuItem.menuItem.itemId === item.id
                  )?.menuItem.name || "",
              })),
              orderNumber: subOrder.subOrderID,
              orderSource: "www.dabbahwala.com",
              tax: 0,
              totalOrderCost: subOrder.total,
            };

            await shipDayInstance.createOrder(
              orderInfoRequest as OrderInfoRequest
            );
          }
        }

        return userOrder;
      };

      const orderId = await createSubscriptionOrder(false);
      const upcomingOrder = await createSubscriptionOrder(true);

      if (!dwCustomer.phone || dwCustomer.phone === "") {
        await prisma.customer.update({
          where: { id: dwCustomer.id },
          data: {
            phone: selectedPlan.shippingInfo.phone,
          },
        });
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
          dwCustomer.id
        );
      }

      await stripe.subscriptions.update(subscription.id, {
        metadata: {
          dwCustomerId: dwCustomer.id,
        },
      });

      const htmlContent = await render(
        SubscriptionTemplate({
          nextPaymentDate: "",
          orderDetails: selectedPlan,
          orderId: orderId.id,
          username: dwCustomer.firstName + " " + dwCustomer?.lastName,
          totalAmount: invoice?.total / 100 || 0,
        })
      );

      await sendEmail(
        dwCustomer.email,
        "Subscription created successfully",
        htmlContent
      );

      const findUserPreference = await prisma.userPreference.findUnique({
        where: {
          customerId: dwCustomer.id,
          SMSNotification: true,
        },
      });

      if (findUserPreference) {
        try {
          await twilioClient.messages.create({
            to: "+1" + selectedPlan.shippingInfo.phone || "",
            from: process.env.TWILIO_PHONE_NUMBER,
            body: `Your subscription has been created successfully. View your order at ${process.env.NEXT_PUBLIC_URL}/my-subscription`,
          });
        } catch (error) {
          console.log("Error in sending SMS", error);
        }
      }

      return ApiResponse(true, "Subscription created successfully", 200);
    }
    return ApiResponse(
      false,
      "Something went wrong. Please try again later.",
      500
    );
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Something went wrong. Please try again later.",
      500
    );
  }
}

async function getItemsWithQuantity(items: Item[]) {
  const findItems = await prisma.item.findMany({
    where: {
      id: {
        in: items.map((item) => item.id),
      },
    },
  });

  const itemsWithQuantity = items.map((item) => {
    const foundItem = findItems.find((fi) => fi.id === item.id);
    return {
      ...foundItem,
      itemPrice: foundItem?.price || 0,
      quantity: item.quantity || 0,
    };
  });

  return itemsWithQuantity;
}

async function getItemPriceById(itemId: string): Promise<number> {
  const item = await prisma.item.findUnique({
    where: {
      id: itemId,
    },
  });
  return item?.price || 0;
}

function calculateTotalPrice(items: ItemWithQuantity[]) {
  return items.reduce((total, item) => {
    return total + (item.price || 0) * (item.quantity || 0);
  }, 0);
}
