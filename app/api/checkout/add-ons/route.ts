import { ApiResponse } from "@/lib/response";
import shipDayInstance from "@/lib/shipday";
import { BillingInfo, Item, ItemsWithQty } from "@/types/main";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { generateTransactionId, MINIMUM_CHARGE_AMOUNT } from "@/lib/helper";
import { createStripePayment, stripe } from "@/lib/stripe";
import OrderUpdatedTemplate from "@/components/EmailTemplates/templates/OrderUpdated";
import { sendEmail } from "@/lib/nodemailer";
import { render } from "@react-email/render";

type JSONData = {
  additionalItems: ItemsWithQty[];
  paymentMethodId?: string;
  subOrderId: string;
  orderId: string;
  useWalletCredit: boolean;
  saveUpcoming: boolean;
};

export async function POST(request: Request) {
  try {
    const {
      additionalItems,
      paymentMethodId,
      subOrderId,
      orderId,
      useWalletCredit,
      saveUpcoming,
    }: JSONData = await request.json();

    if (!additionalItems || !paymentMethodId || !subOrderId || !orderId) {
      return ApiResponse(false, "All fields are required.", 400);
    }

    let fetchedOrder;
    fetchedOrder = await shipDayInstance.fetchOrder(subOrderId);

    // Check on shipday order is valid
    if (
      !fetchedOrder ||
      fetchedOrder.length === 0 ||
      !fetchedOrder[0].orderId
    ) {
      return ApiResponse(false, "Delivery order not found.", 400);
    }

    // Check on user is authenticated or not
    const user = await getServerSession(authOptions);
    if (!user || user.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized.", 401);
    }

    // Check on customer is exist or not
    const customer = await prisma.customer.findFirst({
      where: {
        userId: user.user.id,
      },
      select: {
        id: true,
        wallet: true,
        phone: true,
      },
    });

    // Check on customer is exist or not
    if (!customer) {
      return ApiResponse(false, "User not found.", 400);
    }

    // Check on order is exist or not
    const findOrder = await prisma.order.findFirst({
      where: {
        orderID: orderId,
        planType: "SUBSCRIPTION",
        customerId: customer.id,
        status: "ACTIVE",
      },
      select: {
        id: true,
        billingInfo: true,
        subscriptionId: true,
      },
    });

    if (!findOrder) {
      return ApiResponse(false, "Order not found.", 400);
    }

    // Check on sub order is exist or not
    const checkExistingOrder = await prisma.subOrders.findUnique({
      where: {
        subOrderID: subOrderId,
        orderId: findOrder.id,
        status: "ACCEPTED",
      },
      select: {
        id: true,
        items: true,
      },
    });
    if (!checkExistingOrder) {
      return ApiResponse(false, "Order not found.", 400);
    }

    // Fetch all items from database
    const allItems = await prisma.item.findMany();

    // Check and validate additional items
    const dwConfig = await prisma.dwConfig.findUnique({
      where: {
        uniqueKey: "dwsettings",
      },
    });

    const minQty = dwConfig?.minQtyOfItem || 0;
    const maxQty = dwConfig?.maxQtyOfItem || 8;

    let itemsWithAdditional;
    try {
      itemsWithAdditional = allItems
        .filter((item) => {
          const additionalItem = additionalItems.find(
            (additionalItem) => additionalItem.id === item.id
          );
          const defaultQtyItems = checkExistingOrder.items.find(
            (orderItem) => orderItem.itemId === item.id
          );
          const additionalQty = additionalItem?.quantity || 0;
          const defaultQty = defaultQtyItems?.quantity || 0;
          const totalQty = defaultQty + additionalQty;
          return additionalQty > 0;
        })
        .map((item: Item) => {
          const additionalItem = additionalItems.find(
            (additionalItem) => additionalItem.id === item.id
          );
          const defaultQtyItems = checkExistingOrder.items.find(
            (orderItem) => orderItem.itemId === item.id
          );
          const additionalQty = additionalItem?.quantity || 0;
          const defaultQty = defaultQtyItems?.quantity || 0;
          const totalQty = defaultQty + additionalQty;

          // Check if the total quantity is within the allowed range
          if (totalQty < minQty) {
            throw new Error(
              `Quantity for item ${item.itemName} cannot be less than ${minQty}.`
            );
          }
          if (totalQty > maxQty) {
            throw new Error(
              `Quantity for item ${item.itemName} cannot exceed ${maxQty}.`
            );
          }

          return {
            ...item,
            price: item.price,
            defaultQty,
            additionalQty,
          };
        });
    } catch (error: any) {
      return ApiResponse(false, error.message, 400);
    }
    // Calculate total amount of additional items
    const totalAmount = itemsWithAdditional.reduce((total, myItem) => {
      return total + (myItem.price || 0) * myItem.additionalQty;
    }, 0);

    // Prepare items to update
    const itemsToUpdate = itemsWithAdditional.map((item) => {
      return {
        id: item.id,
        quantity: item.additionalQty,
      };
    });

    if (totalAmount === 0) {
      return ApiResponse(false, "No items to add.", 400);
    }

    let taxRate = 0;
    let amountToPay = totalAmount;

    // Calculate tax by billing info
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + "/api/checkout/calculate-tax",
        {
          method: "POST",
          body: JSON.stringify({
            total: totalAmount,
            address: findOrder.billingInfo,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        taxRate = parseFloat(data.data.tax_rate);
        amountToPay = totalAmount + (totalAmount * taxRate) / 100;
        amountToPay = Math.round(amountToPay * 100) / 100;
      } else {
        return ApiResponse(false, "Failed to calculate tax.", 500);
      }
    } catch (error) {
      console.log(error);
      return ApiResponse(false, "Failed to calculate tax.", 500);
    }

    let walletDeduction = 0;
    let stripeAmount = 0;

    // Check on wallet credit is valid or not
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
        await updateOrderItems({
          itemsToUpdate,
          subOrderId,
          order: findOrder,
          paidAmount: amountToPay,
          totalAmount: totalAmount,
          shipdayOrderId: fetchedOrder[0].orderId,
          saveUpcoming,
          customerId: customer.id,
          allItems,
        });

        await prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            wallet: {
              decrement: walletDeduction,
            },
          },
        });

        await prisma.transactionHistory.create({
          data: {
            customerId: customer.id,
            amount: walletDeduction,
            transactionType: "WALLET",
            transactionId: generateTransactionId(),
            type: "DEBIT",
            description: `Wallet deduction for adding items to order. #${subOrderId}`,
          },
        });
        const userPreference = await prisma.userPreference.findUnique({
          where: {
            customerId: customer.id,
          },
        });

        if (userPreference?.orderUpdates) {
          const html = await render(
            OrderUpdatedTemplate({
              type: "ADDONS",
              username: user?.user.name,
              orderId: subOrderId,
            })
          );
          await sendEmail(
            user?.user.email,
            `New items added to your order.`,
            html
          );

          await prisma.notification.create({
            data: {
              customerId: customer.id,
              message: `You have successfully added items to your order. #${subOrderId}`,
              type: "ORDER",
              title: "Order Updated",
            },
          });
        }

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
              fullName: (findOrder.billingInfo as BillingInfo)
                .fullName as string,
              phone: customer.phone || "",
            },
            paymentMethodId: paymentMethodId,
          });
        } catch (e: any) {
          console.log(e);
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

        await updateOrderItems({
          itemsToUpdate,
          subOrderId,
          order: findOrder,
          paidAmount: amountToPay,
          totalAmount: totalAmount,
          shipdayOrderId: fetchedOrder[0].orderId,
          saveUpcoming,
          customerId: customer.id,
          allItems,
        });

        await prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            wallet: {
              decrement: walletDeduction,
            },
          },
        });

        await prisma.transactionHistory.create({
          data: {
            customerId: customer.id,
            amount: walletDeduction,
            transactionType: "WALLET",
            transactionId: generateTransactionId(),
            type: "DEBIT",
            description: `Wallet deduction for adding items to order. #${subOrderId}`,
          },
        });
        const userPreference = await prisma.userPreference.findUnique({
          where: {
            customerId: customer.id,
          },
        });

        if (userPreference?.orderUpdates) {
          const html = await render(
            OrderUpdatedTemplate({
              type: "ADDONS",
              username: user?.user.name,
              orderId: subOrderId,
            })
          );
          await sendEmail(
            user?.user.email,
            `New items added to your order.`,
            html
          );

          await prisma.notification.create({
            data: {
              customerId: customer.id,
              message: `You have successfully added items to your order. #${subOrderId}`,
              type: "ORDER",
              title: "Order Updated",
            },
          });
        }
        return ApiResponse(
          true,
          "Payment Successful. Items added to your order.",
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
          fullName: (findOrder.billingInfo as BillingInfo).fullName as string,
          phone: customer.phone || "",
        },
        paymentMethodId: paymentMethodId,
      });
    } catch (e: any) {
      console.log(e);
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

    await updateOrderItems({
      itemsToUpdate,
      subOrderId,
      order: findOrder,
      paidAmount: amountToPay,
      totalAmount: totalAmount,
      shipdayOrderId: fetchedOrder[0].orderId,
      saveUpcoming,
      customerId: customer.id,
      allItems,
    });

    const userPreference = await prisma.userPreference.findUnique({
      where: {
        customerId: customer.id,
      },
    });

    if (userPreference?.orderUpdates) {
      const html = await render(
        OrderUpdatedTemplate({
          type: "ADDONS",
          username: user?.user.name,
          orderId: subOrderId,
        })
      );
      await sendEmail(user?.user.email, `New items added to your order.`, html);

      await prisma.notification.create({
        data: {
          customerId: customer.id,
          message: `You have successfully added items to your order. #${subOrderId}`,
          type: "ORDER",
          title: "Order Updated",
        },
      });
    }
    return ApiResponse(
      true,
      "Payment Successful. Items added to your order.",
      200
    );
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong. Please try again.", 500);
  }
}

const updateOrderItems = async ({
  itemsToUpdate,
  subOrderId,
  order,
  paidAmount,
  totalAmount,
  shipdayOrderId,
  saveUpcoming,
  customerId,
  allItems,
}: {
  itemsToUpdate: ItemsWithQty[];
  subOrderId: string;
  order: {
    id: string;
    subscriptionId: string | null;
  };
  paidAmount: number;
  totalAmount: number;
  shipdayOrderId: string;
  saveUpcoming: boolean;
  customerId: string;
  allItems: Item[];
}) => {
  try {
    // find the suborder
    const mysuborder = await prisma.subOrders.findFirst({
      where: {
        subOrderID: subOrderId,
      },
    });

    if (!mysuborder) {
      throw new Error("Order not found");
    }

    // // Update or create order items
    await Promise.all(
      itemsToUpdate.map(async (item) => {
        await prisma.orderItem.upsert({
          where: {
            subOrderId: mysuborder.id,
            itemId: item.id,
          },
          update: {
            quantity: {
              increment: item.quantity,
            },
          },
          create: {
            subOrderId: mysuborder.id,
            itemId: item.id,
            quantity: item.quantity,
          },
        });
      })
    );

    // update order and their amount
    const updatedOrder = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        totalAmount: {
          increment: totalAmount,
        },
        paidAmount: {
          increment: paidAmount,
        },
      },
    });

    if (saveUpcoming) {
      // find the preference order
      const findPreferenceOrder = await prisma.preferenceOrder.findUnique({
        where: {
          subscriptionId: order.subscriptionId || "",
          customerId: customerId,
        },
      });

      const findUpcomingOrder = await prisma.order.findFirst({
        where: {
          customerId: customerId,
          status: "UPCOMING",
          subscriptionId: order.subscriptionId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const subscriptionID = await prisma.subscription.findUnique({
        where: {
          id: order.subscriptionId as string,
        },
      });

      const subscription = await stripe.subscriptions.retrieve(
        subscriptionID?.subscriptionStripeId as string
      );
      console.log(updatedOrder.totalAmount, "Total Amount");
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

      


      if (findUpcomingOrder) {
        const getUpcomingSuborder = await prisma.subOrders.findFirst({
          where: {
            orderId: findUpcomingOrder.id,
            deliveryDate: new Date(
              mysuborder.deliveryDate.setDate(
                mysuborder.deliveryDate.getDate() + 7
              )
            ),
            status: "ACCEPTED",
          },
        });

        await Promise.all(
          itemsToUpdate.map(async (item) => {
            await prisma.orderItem.upsert({
              where: {
                subOrderId: getUpcomingSuborder?.id,
                itemId: item.id,
              },
              update: {
                quantity: {
                  increment: item.quantity,
                },
              },
              create: {
                subOrderId: getUpcomingSuborder?.id,
                itemId: item.id,
                quantity: item.quantity,
              },
            });
          })
        );

        const preferenceSubOrder = await prisma.preferenceSubOrder.findFirst({
          where: {
            weekDay: new Date(
              mysuborder?.deliveryDate || new Date()
            ).toLocaleDateString("en-US", {
              weekday: "long",
            }),
          },
        });

        if (preferenceSubOrder) {
          for (const item of itemsToUpdate) {
            await prisma.orderItem.upsert({
              where: {
                preferenceSubOrderId: preferenceSubOrder.id,
                itemId: item.id,
              },
              update: {
                quantity: {
                  increment: item.quantity,
                },
              },
              create: {
                preferenceSubOrderId: preferenceSubOrder.id,
                itemId: item.id,
                quantity: item.quantity,
              },
            });
          }
        }
        const upcomingOrderUpdate = await prisma.order.update({
          where: {
            id: findUpcomingOrder?.id,
            customerId: customerId,
          },
          data: {
            totalAmount: {
              increment: totalAmount,
            },
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
            items: [{
              id: subscription.items.data[0].id,
              price_data: {
                currency: 'usd',
                product: subscription.items.data[0].price.product as string,
                recurring: {
                  interval: 'week'
                },
                unit_amount: Math.round(upcomingOrderUpdate.totalAmount * 100),
              },
            }],
            proration_behavior: 'none',
            billing_cycle_anchor: 'unchanged', 
          }
        );
  
    
      }
      }

      



    // // find menu items
    const menuItem = await prisma.menuItem.findMany({
      where: {
        itemId: {
          in: allItems.map((item) => item.id || ""),
        },
        dailyMenus: {
          some: {
            dailyMenu: {
              date: mysuborder.deliveryDate,
            },
          },
        },
      },
      select: {
        itemId: true,
        name: true,
      },
    });

    // prepare items for shipday
    const itemsForShipday = itemsToUpdate.map((itemUpdate) => {
      const menuItemData = menuItem.find((mi) => mi.itemId === itemUpdate.id);
      const itemsData = allItems.find((i) => i.id === itemUpdate.id);

      return {
        name: `${itemsData?.itemName}`,
        unitPrice: itemsData?.price,
        quantity: itemUpdate.quantity,
        detail: menuItemData ? menuItemData.name : "",
      };
    });
    const orderInfoRequest = {
      orderId: `${shipdayOrderId}`,
      totalCost: `${Number(paidAmount.toFixed(2))}`,
      orderItems: itemsForShipday,
    };
    const orderResponse = await shipDayInstance.editOrder(
      `${shipdayOrderId}`,
      orderInfoRequest
    );

    if (!orderResponse.success) {
      return ApiResponse(false, "Something went wrong. Please try again", 500);
    }



    

    return ApiResponse(true, "Items added to your order.", 200, {
      orderId: order.id,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Failed to update order items");
  }
};
