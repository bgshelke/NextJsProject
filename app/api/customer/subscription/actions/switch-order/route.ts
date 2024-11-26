import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { ApiResponse } from "@/lib/response";
import prisma from "@/lib/db";
import shipDayInstance from "@/lib/shipday";
import { sendEmail } from "@/lib/nodemailer";
import { render } from "@react-email/render";
import OrderUpdatedTemplate from "@/components/EmailTemplates/templates/OrderUpdated";

type JsonData = {
  orderId: string;
  selectedDate: Date;
  switchDate: Date;
  slotId: string | null;
  isUpcoming: boolean;
};

export async function POST(request: Request) {
  try {
    const { orderId, selectedDate, switchDate, slotId, isUpcoming }: JsonData =
      await request.json();
    const user = await getServerSession(authOptions);

    const dateFrom = new Date(switchDate);
    const dateOfSwitch = new Date(selectedDate);

    if (!dateOfSwitch || !dateFrom) {
      return ApiResponse(false, "Invalid Request", 400);
    }
    if (dateOfSwitch < new Date()) {
      return ApiResponse(false, "You cannot switch to a past date", 400);
    }
    if (!user || user?.user?.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: user.user.id,
      },
    });

    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    const checkExistingOrder = await prisma.order.findUnique({
      where: {
        orderID: orderId,
        status: isUpcoming ? "UPCOMING" : "ACTIVE",
        customerId: customer.id,
      },
    });

    if (!checkExistingOrder || !checkExistingOrder?.firstDeliveryDate) {
      return ApiResponse(false, "Order not found", 404);
    }

    if (dateOfSwitch < checkExistingOrder?.firstDeliveryDate) {
      return ApiResponse(false, "You cannot switch to a past date", 400);
    }

    const existingSubOrder = await prisma.subOrders.findFirst({
      where: {
        orderId: checkExistingOrder.id,
        deliveryDate: dateFrom,
        status: "ACCEPTED",
      },
    });

    if (!existingSubOrder) {
      return ApiResponse(false, "Order not found with this date", 404);
    }

    const fetchShipdayOrder = await shipDayInstance.fetchOrder(
      existingSubOrder.subOrderID
    );
    if (!isUpcoming) {
      if (
        !fetchShipdayOrder ||
        fetchShipdayOrder.length === 0 ||
        !fetchShipdayOrder[0].orderId
      ) {
        return ApiResponse(false, "Delivery order not found", 404);
      }
    }

    const findMenu = await prisma.dailyMenu.findUnique({
      where: {
        date: new Date(switchDate).toISOString(),
      },
      select: {
        date: true,
        thumbnail: true,
        menuItems: {
          select: {
            menuItem: {
              select: {
                itemId: true,
                name: true,
              },
            },
          },
        },
      },
    });
    const menuThumbnail = findMenu?.thumbnail;
    const menuItems = findMenu?.menuItems;

    const findSlot = await prisma.timeSlots.findUnique({
      where: {
        id: slotId || "",
      },
    });
    if (!findSlot) {
      return ApiResponse(false, "Slot not found", 404);
    }
    const updatedSubOrder = await prisma.subOrders.update({
      where: {
        id: existingSubOrder.id,
      },
      data: {
        deliveryDate: dateOfSwitch,
        timeSlotStart: findSlot.timeStart,
        timeSlotEnd: findSlot.timeEnd,
        thumbnail: menuThumbnail,
        status: "ACCEPTED",
      },
    });

    const getItems = await prisma.orderItem.findMany({
      where: {
        subOrderId: existingSubOrder.id,
      },
    });

    if (!isUpcoming) {
      const items = await prisma.item.findMany({
        where: {
          id: {
            in: getItems.map((item) => item.itemId),
          },
        },
      });
      const itemsWithQuantity = getItems.map((item) => {
        const foundItem = items.find((fi) => fi.id === item.itemId);
        return {
          ...foundItem,
          itemPrice: item.itemPrice,
          quantity: item.quantity || 0,
        };
      });

      const updatedItems = itemsWithQuantity?.map((item) => {
        return {
          name: `${item.itemName}(${item.unit}${item.unitType})`,
          unitPrice: item.itemPrice,
          quantity: item.quantity,
          detail:
            menuItems?.find((menuItem) => menuItem.menuItem.itemId === item.id)
              ?.menuItem.name || "",
        };
      });
      const total = itemsWithQuantity.reduce(
        (acc: number, myItem) =>
          acc + (myItem.price || 0) * (myItem.quantity || 0),
        0
      );
      const orderInfoRequest = {
        orderId: `${fetchShipdayOrder[0].orderId}`,
        totalCost: total.toFixed(2),
        orderItems: updatedItems,
        expectedDeliveryDate: new Date(updatedSubOrder.deliveryDate)
          .toISOString()
          .split("T")[0],
        expectedPickupTime: updatedSubOrder.timeSlotStart + ":00",
        expectedDeliveryTime: updatedSubOrder.timeSlotEnd + ":00",
      };
      await shipDayInstance.editOrder(
        `${fetchShipdayOrder[0].orderId}`,
        orderInfoRequest
      );
    }

    const findPrefernce = await prisma.userPreference.findUnique({
      where: {
        customerId: customer.id,
      },
    });

    if (findPrefernce?.orderUpdates) {
      const html = await render(
        OrderUpdatedTemplate({
          type: "SWITCH_DAY",
          username: user?.user.name,
          orderId: updatedSubOrder.subOrderID,
        })
      );
      await sendEmail(user?.user.email, `Order switched successfully.`, html);
    }
    return ApiResponse(
      true,
      `Your order has been switched to ${dateOfSwitch.toDateString()}`,
      200
    );
  } catch (error) {
    console.error(error);
    return ApiResponse(false, "Switch order", 500);
  }
}
