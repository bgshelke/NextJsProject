export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const dateRange = searchParams.get("dateRange");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!dateRange) {
    return ApiResponse(false, "Date is required.", 400);
  }
  if (dateRange === "weekly") {
    if (!startDate || !endDate) {
      return ApiResponse(false, "Start date and end date are required.", 400);
    }

    const stDate = new Date(startDate);
    const enDate = new Date(endDate);

    const mymenuData = await prisma.dailyMenu.findMany({
      where: {
        date: {
          gte: stDate,
          lte: enDate,
        },
      },
      select: {
        id: true,
        date: true,
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

        description: true,
        thumbnail: true,
      },
      orderBy: {
        date: "asc",
      },
    });
    const formmatedMenu = mymenuData.map((menu) => ({
      ...menu,
      menuItems: menu.menuItems.map((item) => item.menuItem),
    }));

    return ApiResponse(true, "Weekly Menu", 200, formmatedMenu);
  } else {
    return ApiResponse(false, "Invalid date range.", 400);
  }
}
