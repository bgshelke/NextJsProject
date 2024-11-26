import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { ResponseType } from "@/types/main";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const planOptions = await prisma.dwConfig.findFirst();
    return ApiResponse(
      true,
      "Plan options fetched successfully",
      200,
      planOptions
    );
  } catch (error) {
    return ApiResponse(false, "Failed to fetch plan options", 500, error);
  }
}

export async function POST(req: Request) {
  try {
    const {
      deliveryFees,
      maxAmountForFreeDelivery,
      timeForPreparing,
      minQtyOfItem,
      maxQtyOfItem,
      loopMenu,
      disableActionAndEmailToSend,
    } = await req.json();

    const deliveryFeesInt = parseInt(deliveryFees);
    const maxAmountForFreeDeliveryInt = parseInt(maxAmountForFreeDelivery);
    const timeForPreparingInt = parseInt(timeForPreparing);
    const minQtyOfItemInt = parseInt(minQtyOfItem);
    const maxQtyOfItemInt = parseInt(maxQtyOfItem);
    const loopMenuInt = parseInt(loopMenu);
    const disableActionAndEmailToSendInt = parseInt(
      disableActionAndEmailToSend
    );
    const planOption = await prisma.dwConfig.upsert({
      where: {
        uniqueKey: "dwsettings",
      },
      update: {
        deliveryFees: deliveryFeesInt,
        maxAmountForFreeDelivery: maxAmountForFreeDeliveryInt,
        minQtyOfItem: minQtyOfItemInt,
        maxQtyOfItem: maxQtyOfItemInt,
        timeForPreparing: timeForPreparingInt,
        menuLoop: loopMenuInt,
        disableActionAndEmailToSend: disableActionAndEmailToSendInt,
      },
      create: {
        deliveryFees: deliveryFeesInt,
        maxAmountForFreeDelivery: maxAmountForFreeDeliveryInt,
        minQtyOfItem: minQtyOfItemInt,
        maxQtyOfItem: maxQtyOfItemInt,
        timeForPreparing: timeForPreparingInt,
        menuLoop: loopMenuInt,
        disableActionAndEmailToSend: disableActionAndEmailToSendInt,
      },
    });

    return ApiResponse(
      true,
      "Plan options updated successfully",
      200,
      planOption
    );
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Failed to update plan options", 500);
  }
}
