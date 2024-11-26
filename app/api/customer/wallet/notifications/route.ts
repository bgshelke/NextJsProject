import prisma from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "Unauthorized or User not found", 401);
    }
    const notifications = await prisma.notification.findMany({
      where: {
        customerId: customer.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return ApiResponse(true, "Notifications",  200,notifications);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong", 500);
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiResponse(false, "Unauthorized", 401);
    }
    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 401);
    }
    const findNotification = await prisma.notification.findUnique({
      where: {
        id: id,
      },
    });
    if (!findNotification) {
      return ApiResponse(false, "Notification not found", 404);
    }
    if(findNotification.customerId !== customer.id){
      return ApiResponse(false, "Unauthorized", 401);
    }
    await prisma.notification.delete({
      where: {
        id: id,
      },
    });
    return ApiResponse(true, "Notification deleted", 200);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong.Please try again later.", 500);
  } finally {
    await prisma.$disconnect();
  }
}