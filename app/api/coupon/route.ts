import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { coupon, userAddress, addressId } = await req.json();

  try {
    if (coupon && (addressId || userAddress)) {
      const existingCoupon = await prisma.couponCode.findUnique({
        where: {
          code: coupon,
        },
      });

      if (!existingCoupon) {
        return ApiResponse(false, "Invalid Coupon Code", 400);
      }

      if (!existingCoupon.isActive) {
        return ApiResponse(false, "Coupon code is not active", 400);
      }

      if (
        existingCoupon.expirationDate &&
        existingCoupon.expirationDate < new Date()
      ) {
        return ApiResponse(false, "Coupon code is expired", 400);
      }

      if (
        existingCoupon.maxUsageLimit &&
        existingCoupon.usageCount >= existingCoupon.maxUsageLimit
      ) {
        return ApiResponse(false, "Coupon code usage limit reached", 400);
      }

      let address;
      if (addressId) {
        const savedAddress = await prisma.savedAddress.findUnique({
          where: { id: addressId },
          include: {
            shippingInfo: {
              select: {
                addressLine1: true,
              },
            },
          },
        });
        if (!savedAddress) {
          return ApiResponse(false, "Invalid Coupon Code", 400);
        }
        address = savedAddress?.shippingInfo?.addressLine1;
      } else {
        address = userAddress;
      }

      const addressCoupon = await prisma.addressUsage.findFirst({
        where: {
          address: address,
          couponCodeId: existingCoupon.id,
        },
      });
     
      if (
        (addressCoupon?.addressUsageCount || 0) >=
        (existingCoupon.addressUsageLimit || 1)
      ) {
        return ApiResponse(
          false,
          "You can't use this coupon code on the provided address",
          400
        );
      }

     

      return ApiResponse(true, "Coupon Code Applied", 200, existingCoupon);
    }

    return ApiResponse(false, "Invalid Coupon Code", 400);
  } catch (error) {
    console.log("Error while applying coupon code", error);
    return ApiResponse(
      false,
      "Something went wrong. Please try again later.",
      500
    );
  }
}
