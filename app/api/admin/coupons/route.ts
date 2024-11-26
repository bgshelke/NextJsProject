import prisma from "@/lib/db";
import { ResponseType } from "@/types/main";
import { CouponSchema } from "@/types/zod/couponSchema";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const promocodes = await prisma.couponCode.findMany();
    return NextResponse.json<ResponseType>(
      {
        success: true,
        data: promocodes,
        message: "Promocodes fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<ResponseType>(
      { success: false, message: "Error while fetching promocodes" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  const data = await request.json();
  const expiryDate = data.expiry ? new Date(data.expiry) : null;
  let validate;
  try {
    if (data?.expiry) {
      validate = await CouponSchema.safeParseAsync({
        ...data,
        expiry: expiryDate,
      });
    } else {
      validate = await CouponSchema.safeParseAsync({
        ...data,
      });
    }
    if (validate.success) {
      try {
        const {
          code,
          amount,
          coupenType,
          maxUsageLimit,
          expiry,
          addressUsageLimit,
        } = validate.data;

        const existingCoupon = await prisma.couponCode.findFirst({
          where: {
            code: code,
          },
        });

        if (existingCoupon) {
          return NextResponse.json<ResponseType>(
            { success: false, message: "Coupon code already exists" },
            { status: 400 }
          );
        }

        if (expiry) {
          await prisma.couponCode.create({
            data: {
              code: code,
              discountAmount: coupenType === "amount" ? parseInt(amount) : 0,
              discountPercentage:
                coupenType === "percentage" ? parseInt(amount) : 0,
              maxUsageLimit: maxUsageLimit ? parseInt(maxUsageLimit) : null,
              expirationDate: new Date(expiry),
              addressUsageLimit: addressUsageLimit
                ? parseInt(addressUsageLimit)
                : null,
            },
          });
        } else {
          await prisma.couponCode.create({
            data: {
              code: code,
              discountAmount: coupenType === "amount" ? parseInt(amount) : 0,
              discountPercentage:
                coupenType === "percentage" ? parseInt(amount) : 0,
              maxUsageLimit: maxUsageLimit ? parseInt(maxUsageLimit) : null,
              addressUsageLimit: addressUsageLimit
                ? parseInt(addressUsageLimit)
                : null,
            },
          });
        }
        return NextResponse.json<ResponseType>(
          { success: true, message: "Coupon created successfully" },
          { status: 201 }
        );
      } catch (error) {
        return NextResponse.json<ResponseType>(
          { success: false, message: "Error while creating promocode" },
          { status: 500 }
        );
      }
    } else {
      console.log(validate.error.format());
      return NextResponse.json<ResponseType>(
        { success: false, message: "Invalid data" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json<ResponseType>(
      { success: false, message: "Error while creating promocode" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  const data = await request.json();
  if (!data.id && !data.code) {
    return NextResponse.json<ResponseType>(
      { success: false, message: "Invalid data" },
      { status: 400 }
    );
  }
  try {
    await prisma.couponCode.delete({
      where: {
        id: data.id,
        code: data.code,
      },
    });

    return NextResponse.json<ResponseType>(
      { success: true, message: "Coupon deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<ResponseType>(
      { success: false, message: "Error while deleting coupon" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: Request) {
  const { id, isActive } = await request.json();
  if (!id && !isActive) {
    return NextResponse.json<ResponseType>(
      { success: false, message: "Invalid data" },
      { status: 400 }
    );
  }
  try {
    await prisma.couponCode.update({
      where: {
        id: id,
      },
      data: {
        isActive: isActive,
      },
    });
    if (isActive) {
      return NextResponse.json<ResponseType>(
        { success: true, message: "Coupon activated successfully" },
        { status: 200 }
      );
    }
    return NextResponse.json<ResponseType>(
      { success: true, message: "Coupon deactivated successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<ResponseType>(
      { success: false, message: "Error while updating coupon" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
