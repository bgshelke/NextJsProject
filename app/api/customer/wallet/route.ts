export const dynamic = 'force-dynamic';
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user?.id,
      },
    });

    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    return ApiResponse(true, "Wallet Balance:", 200, {
      wallet: customer.wallet.toFixed(2),
    });
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong", 500);
  } finally {
    await prisma.$disconnect();
  }
}
