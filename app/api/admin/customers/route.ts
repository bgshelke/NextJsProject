import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const type = searchParams.get("type");

    if (type === "recent") {
      let date = searchParams.get("date");
      const to = searchParams.get("to");

      const isValidDate = (date: string) => !isNaN(Date.parse(date));

      if (!date) date = new Date().toISOString().split("T")[0];
      if (!isValidDate(date))
        return ApiResponse(false, "Invalid date format", 400);

      const startDate = date ? new Date(date) : new Date();
      const endDate =
        to && to !== "undefined" && isValidDate(to) ? new Date(to) : startDate;

      const customers = await prisma.user.findMany({
        where: {
          role: "CUSTOMER",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          accounts: {
            select: {
              provider: true,
            },
          },
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        accounts: {
          select: {
            provider: true,
          },
        },
        customer: {
          select: {
            id: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const customersWithOrderCount = await Promise.all(
      customers.map(async (customer) => {
        const orderDabbahCount = await prisma.order.count({
          where: { customerId: customer?.customer?.id, planType: "ONETIME" },
        });
        const subscriptionOrderCount = await prisma.order.count({
          where: {
            customerId: customer?.customer?.id,
            planType: "SUBSCRIPTION",
            status: {
              not: {
                equals: "UPCOMING",
              },
            },
          },
        });
        return {
          ...customer,
          orderDabbahCount: orderDabbahCount || 0,
          subscriptionOrderCount: subscriptionOrderCount || 0,
        };
      })
    );

    return ApiResponse(
      true,
      "Customers fetched successfully",
      200,
      customersWithOrderCount
    );
  } catch (error) {
    console.log("Error while fetching customers", error);
    return ApiResponse(false, "Error while fetching customers", 500);
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  const data = await request.json();

  if (!data) {
    return ApiResponse(false, "No data provided.", 400);
  }

  try {
    const user = await prisma.user.delete({
      where: {
        id: data.id,
        email: data.email,
      },
    });

    if (!user) {
      return ApiResponse(false, "User not found.", 404);
    }
    return ApiResponse(true, "User deleted successfully.", 200);
  } catch (error) {
    console.log("Error while deleting user.", error);
    return ApiResponse(false, "Error while deleting user.", 500);
  } finally {
    await prisma.$disconnect();
  }
}
