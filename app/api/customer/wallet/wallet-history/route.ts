export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiResponse(false, "Not Authorized", 401);
    }
    const customer = await prisma.customer.findUnique({
      where: {
        userId: session?.user?.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }
    const getTransactions = await prisma.transactionHistory.findMany({
      where: {
        customerId: customer?.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const transactions = getTransactions.map((transaction) => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toFixed(2)),
    }));

    return ApiResponse(true, "Wallet history", 200, transactions);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Error fetching wallet history", 500);
  } finally {
    await prisma.$disconnect();
  }
}
