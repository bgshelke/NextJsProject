import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
export async function GET(req: Request) {
  try {
    const now = new Date();
    const formattedDateTime = now.toISOString().split("T")[0];
    const newDate = new Date(formattedDateTime).toISOString();
    const menuData = await prisma.dailyMenu.findFirst({
      where: {
        date: newDate,
      },
      select: {
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

    if (!menuData) {
      return ApiResponse(false, "Menu not found", 404, null);
    }
    const formattedMenuData = menuData?.menuItems.map((menuItem) => {
      return menuItem.menuItem;
    });

    return ApiResponse(true, "Menu", 200, formattedMenuData);
  } catch (error) {
    return ApiResponse(false, "Error while fetching menu", 500, null);
  } finally {
    prisma.$disconnect();
  }
}
