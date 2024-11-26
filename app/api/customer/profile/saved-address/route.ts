import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { getServerSession } from "next-auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiResponse(false, "Unauthorized", 401);
    }
    if (session.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }
    const savedAddress = await prisma.savedAddress.findMany({
      where: {
        customer: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        addressType: true,
        isDefault: true,
        shippingInfo: true,
        billingInfo: true,
      },
      take: 4,
    });

    return ApiResponse(true, "Saved address found", 200, savedAddress);
  } catch (error) {
    return ApiResponse(false, "Failed to get saved address", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiResponse(false, "Unauthorized", 401);
    }
    if (session.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    const body = await request.json();
    const { id, addressType, isDefault, shippingInfo, billingInfo } = body;

    if (!addressType || !shippingInfo || !billingInfo) {
      return ApiResponse(false, "Invalid request", 400);
    }

    if (id) {
      const findSavedAddress = await prisma.savedAddress.findUnique({
        where: { id },
      });
      const updatedAddress = await prisma.savedAddress.update({
        where: { id },
        data: {
          addressType,
          isDefault,
        },
      });
      if (findSavedAddress?.shippingInfoId && findSavedAddress?.billingInfoId) {
        const updatedShippingInfo = await prisma.shippingInfo.update({
          where: { id: findSavedAddress?.shippingInfoId },
          data: {
            ...shippingInfo,
          },
        });
        const { phone, deliveryInstructions, ...billingInfoWithoutPhone } =
          billingInfo;
        const updatedBillingInfo = await prisma.billingInfo.update({
          where: { id: findSavedAddress?.billingInfoId },
          data: {
            ...billingInfoWithoutPhone,
          },
        });
      }
      return ApiResponse(
        true,
        "Address updated successfully",
        200,
        updatedAddress
      );
    } else {
      const newAddress = await prisma.savedAddress.create({
        data: {
          customerId: customer.id,
          addressType,
          isDefault,
        },
      });
      const { phone, deliveryInstructions, ...billingInfoWithoutPhone } =
        billingInfo;
      const newShippingInfo = await prisma.shippingInfo.create({
        data: {
          ...shippingInfo,
          SavedAddress: {
            connect: {
              id: newAddress.id,
            },
          },
        },
      });
      const newBillingInfo = await prisma.billingInfo.create({
        data: {
          ...billingInfoWithoutPhone,
          SavedAddress: {
            connect: {
              id: newAddress.id,
            },
          },
        },
      });
      return ApiResponse(true, "Address created successfully", 201, newAddress);
    }
  } catch (error) {
    console.error(error);
    return ApiResponse(false, "Failed to save address", 500);
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiResponse(false, "Unauthorized", 401);
    }
    if (session.user.role !== "CUSTOMER") {
      return ApiResponse(false, "Unauthorized", 401);
    }
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return ApiResponse(false, "Invalid request", 400);
    }
    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }
    const deletedAddress = await prisma.savedAddress.delete({
      where: { id, customerId: customer?.id },
    });
    return ApiResponse(
      true,
      "Address deleted successfully",
      200,
      deletedAddress
    );
  } catch (error) {
    return ApiResponse(false, "Failed to delete address", 500);
  } finally {
    await prisma.$disconnect();
  }
}
