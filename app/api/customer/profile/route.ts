import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { ApiResponse } from "@/lib/response";
import prisma from "@/lib/db";
import { customerProfileSchema } from "@/types/zod/CustomerSchema";

export async function GET(req: Request) {
  try {
    const user = await getServerSession(authOptions);
    if (!user) {
      return ApiResponse(false, "Unauthorized", 401);
    }
    const customer = await prisma.customer.findUnique({
      where: {
        userId: user.user.id,
        email: user.user.email,
      },
      select: {
        appleId: true,
        googleId: true,
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        wallet: true,
        customerUniqueId: true,
        createdAt: true,
        user: {
          select: {
            isVerified: true,
          },
        },
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    return ApiResponse(true, "User found", 200, customer);
  } catch (error) {
    return ApiResponse(false, "Error fetching user", 500);
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getServerSession(authOptions);
    if (!user) {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: user.user.id,
        email: user.user.email,
      },
    });
    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }
    const data = await req.json();
    const validateUser = await customerProfileSchema.safeParseAsync(data);

    if (!validateUser.success) {
      return ApiResponse(
        false,
        "Invalid Data",
        400,
        validateUser.error.format()
      );
    }
    const { firstName, lastName, phone } = validateUser.data;

    const updatedData = await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        user: {
          update: {
            name: firstName + " " + lastName,
          },
        },
        firstName,
        lastName,
        phone,
      },
    });
    return ApiResponse(true, "Profile updated", 200, updatedData);
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Error updating profile. Please try again later.",
      500
    );
  } finally {
    await prisma.$disconnect();
  }
}
