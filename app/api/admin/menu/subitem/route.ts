export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
      return ApiResponse(false, "Query is required", 400, []);
    }

    const findSubItem = await prisma.menuItem.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
        
      },
      select: {
        itemId: true,
        name: true,
      },
      take: 6,
    });

    return ApiResponse(true, "Subitem fetched successfully", 200, findSubItem);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Internal server error", 500);
  }
}
