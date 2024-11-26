import { BillingInfo, ResponseType, ShippingInfo } from "@/types/main";
import { CouponCode } from "@prisma/client";
import { PlanType } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "./db";
import Stripe from "stripe";
import { stripe } from "./stripe";

export function ApiResponse(
  success: boolean,
  message: string,
  status: number,
  data?: any
) {
  return NextResponse.json<ResponseType>(
    {
      success,
      message,
      data,
    },
    { status: status }
  );
}

/// Discount Apply Function
export async function applyDiscount({
  addressLine1,
  totalAmount,
  discountCode,
  planType,
}: {
  addressLine1: string;
  totalAmount: number;
  discountCode: string;
  planType: PlanType;
}) {
  let discountfromDB: CouponCode | null = null;
  let stripeDiscount: Stripe.Coupon | null = null;
  const findAddressUsage = await prisma.addressUsage.findUnique({
    where: {
      address: addressLine1,
    },
  });
  if (discountCode) {
    discountfromDB = await prisma.couponCode.findUnique({
      where: {
        code: discountCode,
        isActive: true,
      },
    });
  }

  if (
    discountfromDB?.addressUsageLimit &&
    findAddressUsage?.addressUsageCount &&
    (discountfromDB?.addressUsageLimit || 0) <=
      findAddressUsage?.addressUsageCount
  ) {
    return {
      stripeDiscount: null,
      discountfromDB: null,
      success: false,
      error: "This coupon code is not valid for the provided address.",
    };
  }

  if (
    discountfromDB &&
    discountfromDB?.discountPercentage !== 0 &&
    discountfromDB.discountAmount === 0
  ) {
    stripeDiscount = await stripe.coupons.create({
      percent_off: discountfromDB.discountPercentage!,
      currency: "usd",
      duration: "once",
      name: discountfromDB.code,
    });
  } else if (
    discountfromDB &&
    discountfromDB?.discountPercentage === 0 &&
    discountfromDB?.discountAmount !== 0
  ) {
    const discountAmount = discountfromDB.discountAmount as number;

    const finalDiscountAmount =
      discountAmount > totalAmount ? 0 : discountAmount;
    if (planType === "SUBSCRIPTION") {
      stripeDiscount = await stripe.coupons.create({
        amount_off: finalDiscountAmount * 100,
        currency: "usd",
        duration: "once",
        name: discountfromDB.code,
      });
    }
  }

  return { stripeDiscount, discountfromDB, success: true };
}

export async function updateCouponData(
  addressLine1: string,
  discountId: string
) {
  if (discountId) {
    const findAddressUsage = await prisma.addressUsage.findUnique({
      where: {
        address: addressLine1,
      },
    });
    const updateCouponCode = await prisma.couponCode.update({
      where: {
        id: discountId,
      },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    if (findAddressUsage) {
      await prisma.addressUsage.update({
        where: {
          id: findAddressUsage.id,
        },
        data: {
          addressUsageCount: {
            increment: 1,
          },
          couponCodeId: updateCouponCode.id,
        },
      });
    } else {
      await prisma.addressUsage.create({
        data: {
          address: addressLine1 || "",
          addressUsageCount: 1,
          couponCodeId: updateCouponCode.id,
        },
      });
    }
  }
}

export async function saveAddressData(
  isDefault: boolean,
  shippingInfo: ShippingInfo,
  billingInfo: BillingInfo,
  saveAddressForLater: boolean,
  addressId: string | null,
  customerId: string,
  addressType?: "HOME" | "WORK"
) {
  if (addressId && saveAddressForLater) {
    const findAddress = await prisma.savedAddress.findFirst({
      where: {
        id: addressId,
        customerId: customerId,
        shippingInfo: {
          addressLine1: shippingInfo.addressLine1,
        },
      },
    });

    if (findAddress) {
      await prisma.savedAddress.update({
        where: {
          id: findAddress.id,
          customerId: customerId,
        },
        data: {
          billingInfo: {
            update: {
              addressLine1: billingInfo.addressLine1 || "",
              addressLine2: billingInfo.addressLine2 || "",
              city: billingInfo.city || "",
              state: billingInfo.state || "",
              zipCode: billingInfo.zipCode || "",
              fullName: billingInfo.fullName || "",
            },
          },
          shippingInfo: {
            update: {
              addressLine1: shippingInfo.addressLine1 || "",
              addressLine2: shippingInfo.addressLine2 || "",
              city: shippingInfo.city || "",
              state: shippingInfo.state || "",
              zipCode: shippingInfo.zipCode || "",
              phone: shippingInfo.phone || "",
              fullName: shippingInfo.fullName || "",
            },
          },
        },
      });
    }
  } else if (saveAddressForLater) {
    const findAddress = await prisma.savedAddress.findMany({
      where: {
        customerId: customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    const limit = 4;

    // update if the limit is 4
    if (findAddress.length >= limit) {
      await prisma.savedAddress.update({
        where: {
          id: findAddress[0].id,
          customerId: customerId,
        },
        data: {
          shippingInfo: {
            update: {
              addressLine1: shippingInfo.addressLine1 || "",
              addressLine2: shippingInfo.addressLine2 || "",
              city: shippingInfo.city || "",
              state: shippingInfo.state || "",
              zipCode: shippingInfo.zipCode || "",
              phone: shippingInfo.phone || "",
              fullName: shippingInfo.fullName || "",
            },
          },
          billingInfo: {
            update: {
              addressLine1: billingInfo.addressLine1 || "",
              addressLine2: billingInfo.addressLine2 || "",
              city: billingInfo.city || "",
              state: billingInfo.state || "",
              zipCode: billingInfo.zipCode || "",
              fullName: billingInfo.fullName || "",
            },
          },
        },
      });
    }

    const existingAddress = await prisma.savedAddress.findFirst({
      where: {
        customerId: customerId,
        shippingInfo: {
          addressLine1: shippingInfo.addressLine1,
        },
      },
    });

    // update if the address is already saved
    if (existingAddress) {
      await prisma.savedAddress.update({
        where: {
          id: existingAddress.id,
          customerId: customerId,
        },
        data: {
          shippingInfo: {
            update: {
              addressLine1: shippingInfo.addressLine1 || "",
              addressLine2: shippingInfo.addressLine2 || "",
              city: shippingInfo.city || "",
              state: shippingInfo.state || "",
              zipCode: shippingInfo.zipCode || "",
              phone: shippingInfo.phone || "",
              fullName: shippingInfo.fullName || "",
            },
          },
          billingInfo: {
            update: {
              addressLine1: billingInfo.addressLine1 || "",
              addressLine2: billingInfo.addressLine2 || "",
              city: billingInfo.city || "",
              state: billingInfo.state || "",
              zipCode: billingInfo.zipCode || "",
              fullName: billingInfo.fullName || "",
            },
          },
        },
      });
    } else {
      const shippingData = await prisma.shippingInfo.create({
        data: {
          addressLine1: shippingInfo.addressLine1 || "",
          addressLine2: shippingInfo.addressLine2 || "",
          city: shippingInfo.city || "",
          state: shippingInfo.state || "",
          zipCode: shippingInfo.zipCode || "",
          phone: shippingInfo.phone || "",
          fullName: shippingInfo.fullName || "",
        },
      });
      const billingData = await prisma.billingInfo.create({
        data: {
          addressLine1: billingInfo.addressLine1 || "",
          addressLine2: billingInfo.addressLine2 || "",
          city: billingInfo.city || "",
          state: billingInfo.state || "",
          zipCode: billingInfo.zipCode || "",
          fullName: billingInfo.fullName || "",
        },
      });
      const saveAddress = await prisma.savedAddress.create({
        data: {
          addressType: "HOME",
          isDefault: true,
          customerId: customerId,
          billingInfoId: billingData.id,
          shippingInfoId: shippingData.id,
        },
      });
    }
  }
}
