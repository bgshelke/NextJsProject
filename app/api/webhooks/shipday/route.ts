import prisma from "@/lib/db";

export async function POST(req: Request) {
  const data = await req.json();
  const validateToken = req.headers.get("token");

  const token = process.env.SHIPDAY_TOKEN;

  if (validateToken !== token) {
    return new Response("Invalid token", { status: 403 });
  }
  if (data.event === "ORDER_ONTHEWAY") {
    const orderNumber = data.order.order_number;
    if (orderNumber) {
      const order = await prisma.subOrders.findUnique({
        where: {
          subOrderID: orderNumber,
        },
      });
      const dabbhaOrder = await prisma.dabbah.findUnique({
        where: {
          dabbahID: orderNumber,
        },
      });

      const guestOrder = await prisma.guestDabbah.findUnique({
        where: {
          dabbahID: orderNumber,
        },
      });

      if (order || dabbhaOrder || guestOrder) {
        if (order) {
          await prisma.subOrders.update({
            where: {
              subOrderID: orderNumber,
            },
            data: {
              status: "OUT_FOR_DELIVERY",
            },
          });
        } else if (dabbhaOrder) {
          await prisma.dabbah.update({
            where: {
              dabbahID: orderNumber,
            },
            data: {
              status: "OUT_FOR_DELIVERY",
            },
          });
        } else if (guestOrder) {
          await prisma.guestDabbah.update({
            where: {
              dabbahID: orderNumber,
            },
            data: {
              status: "OUT_FOR_DELIVERY",
            },
          });
        } else {
          console.log("Order not found");
        }
      } else {
        console.log("Order number not found");
        return new Response("Order number not found", { status: 404 });
      }
    } else if (
      data.event === "ORDER_FAILED" ||
      data.event === "ORDER_ONTHEWAY_REMOVED" ||
      data.event === "ORDER_UNASSIGNED"
    ) {
      const orderNumber = data.order.order_number;
      if (orderNumber) {
        const order = await prisma.subOrders.findUnique({
          where: {
            subOrderID: orderNumber,
          },
        });
        const dabbhaOrder = await prisma.dabbah.findUnique({
          where: {
            dabbahID: orderNumber,
          },
        });

        const guestOrder = await prisma.guestDabbah.findUnique({
          where: {
            dabbahID: orderNumber,
          },
        });
        if (order || dabbhaOrder || guestOrder) {
          if (order) {
            await prisma.subOrders.update({
              where: {
                subOrderID: orderNumber,
              },
              data: {
                status: "ACCEPTED",
              },
            });
          } else if (dabbhaOrder) {
            await prisma.dabbah.update({
              where: {
                dabbahID: orderNumber,
              },
              data: {
                status: "ACCEPTED",
              },
            });
          } else if (guestOrder) {
            await prisma.guestDabbah.update({
              where: {
                dabbahID: orderNumber,
              },
              data: {
                status: "ACCEPTED",
              },
            });
          }
        }
      }
    } else if (
      data.event === "ORDER_COMPLETED" ||
      data.event === "ORDER_DELIVERED"
    ) {
      const orderNumber = data.order.order_number;
      if (orderNumber) {
        const order = await prisma.subOrders.findUnique({
          where: {
            subOrderID: orderNumber,
          },
        });
        const dabbhaOrder = await prisma.dabbah.findUnique({
          where: {
            dabbahID: orderNumber,
          },
        });
        const guestOrder = await prisma.guestDabbah.findUnique({
          where: {
            dabbahID: orderNumber,
          },
        });

        if (order) {
          await prisma.subOrders.update({
            where: {
              subOrderID: orderNumber,
            },
            data: {
              status: "DELIVERED",
            },
          });
        } else if (dabbhaOrder) {
          await prisma.dabbah.update({
            where: {
              dabbahID: orderNumber,
            },
            data: {
              status: "DELIVERED",
            },
          });
        } else if (guestOrder) {
          await prisma.guestDabbah.update({
            where: {
              dabbahID: orderNumber,
            },
            data: {
              status: "DELIVERED",
            },
          });
        }
      }
    }
  }
  return new Response("Webhook received", { status: 200 });
}
