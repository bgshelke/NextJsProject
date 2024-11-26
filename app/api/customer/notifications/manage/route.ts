import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/db";
import { ResponseType } from "@/types/main";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getServerSession(authOptions);
    if (!user) {
      return NextResponse.json<ResponseType>(
        { message: "Unauthorized", success: false },
        { status: 401 }
      );
    }
    const customer = await prisma.customer.findUnique({
      where: { userId: user.user.id },
    });
    if (!customer) {
      return NextResponse.json<ResponseType>(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }
    const userPreference = await prisma.userPreference.findUnique({
      where: { customerId: customer.id },
      select: {
        weeklyMealCustomize: true,
        weeklyMenuUpdates: true,
        promoAndOffers: true,
        walletUpdates: true,
        orderUpdates: true,
        giftCardUpdates: true,
        feedback: true,
        marketingEmails: true,
        newsAndAnnouncements: true,
        deliveryUpdate: true,
        subscriptionUpdates: true,
        surveyUpdates: true,
        SMSNotification: true,
      },
    });
    return NextResponse.json<ResponseType>(
      {
        message: "Notifications preferences fetched",
        success: true,
        data: userPreference,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<ResponseType>(
      { message: "Something went wrong", success: false },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: Request) {
  try {
    const { data } = await request.json();
    const user = await getServerSession(authOptions);
    if (!user) {
      return NextResponse.json<ResponseType>(
        { message: "Unauthorized", success: false },
        { status: 401 }
      );
    }
    const customer = await prisma.customer.findUnique({
      where: { userId: user.user.id },
    });

    if (!customer) {
      return NextResponse.json<ResponseType>(
        { message: "User not found", success: false },
        { status: 404 }
      );
    }
    await prisma.userPreference.update({
      where: { customerId: customer.id },
      data: { ...data },
    });

    return NextResponse.json<ResponseType>(
      { message: "Notifications preferences updated", success: true },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<ResponseType>(
      {
        message: "Something went wrong. Please try again later",
        success: false,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
