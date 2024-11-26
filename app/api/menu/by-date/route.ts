import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const givenDate = searchParams.get("date");
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!givenDate || !dateRegex.test(givenDate)) {
    return ApiResponse(
      false,
      "Invalid date format. Required format: YYYY-MM-DD ",
      400
    );
  }

  const newDate = new Date(givenDate).toISOString();

  try {
    const menuData = await prisma.dailyMenu.findFirst({
      where: {
        date: newDate,
      },
      include: {
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

    const menuItems = menuData?.menuItems.map((item) => {
      return {
        itemId: item.menuItem.itemId,
        name: item.menuItem.name,
      };
    });

    return ApiResponse(true, "Menu of " + givenDate, 200, menuItems);
  } catch (error) {
    return ApiResponse(false, "Error while fetching today's menu", 500, null);
  } finally {
    prisma.$disconnect();
  }
}
