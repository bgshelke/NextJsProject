import prisma from "@/lib/db";
import { ResponseType } from "@/types/main";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, address } = await req.json();
  if (!email) {
    return NextResponse.json<ResponseType>(
      { message: "Please enter a valid email address", success: false },
      { status: 400 }
    );
  }
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    const userWithDifferentDeliveryArea =
      await prisma.userWithDifferentDeliveryArea.findUnique({
        where: {
          email: email,
        },
      });

    if (user) {
      return NextResponse.json<ResponseType>(
        { message: "You already have an account with us", success: false },
        { status: 400 }
      );
    }
    if (userWithDifferentDeliveryArea) {
      return NextResponse.json<ResponseType>(
        { message: "Your email is already added to our list", success: false },
        { status: 400 }
      );
    }
    await prisma.userWithDifferentDeliveryArea.create({
      data: {
        email: email,
        address: address || "",
      },
    });
    return NextResponse.json<ResponseType>(
      {
        message: "We will notify you when we are available at your location",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<ResponseType>(
      { message: "Something went wrong", success: false },
      { status: 500 }
    );
  }
}
