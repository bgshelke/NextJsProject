import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { ResponseType } from "@/types/main";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.json();
  try {
    const { name, address, phone, email, isDefault } = data;

    const checkExist = await prisma.kitchen.findFirst({
      where: {
        address,
      },
    });

    if (checkExist) {
      return ApiResponse(
        false,
        "Kitchen with this address already exists.",
        400,
        checkExist
      );
    }

    const kitchen = await prisma.kitchen.create({
      data: {
        name,
        address,
        phone,
        email,
      },
    });

    return ApiResponse(true, "Kitchen added successfully.", 200, kitchen);
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Error adding kitchen. Please try again.",
      500,
      error
    );
  }
}

export async function PUT(req: Request) {
  const data = await req.json();
  try {
    const { id, name, address, phone, email } = data;

    if (!id) {
      return ApiResponse(false, "Kitchen id is required.", 400, null);
    }

    const kitchen = await prisma.kitchen.update({
      where: {
        id,
      },
      data: {
        name,
        address,
        phone,
        email,
      },
    });

    if (!kitchen) {
      return ApiResponse(false, "Kitchen not found.", 404, null);
    }

    return ApiResponse(true, "Kitchen updated successfully.", 200, kitchen);
  } catch (error) {
    return ApiResponse(
      false,
      "Error updating kitchen. Please try again.",
      500,
      error
    );
  }
}

export async function DELETE(req: Request) {
  const data = await req.json();
  try {
    const { id } = data;
    const countKitchens = await prisma.kitchen.count();

    if (countKitchens === 1) {
      return ApiResponse(false, "Atleast one kitchen is required.", 400, null);
    }

    const findKitchen = await prisma.kitchen.findFirst({
      where: {
        id,
      },
    });

    if (!findKitchen) {
      return ApiResponse(false, "Kitchen not found.", 404, null);
    }

    if (findKitchen.isDefault) {
      return ApiResponse(
        false,
        "You can't delete the default kitchen.",
        400,
        null
      );
    }

    const kitchen = await prisma.kitchen.delete({
      where: {
        id,
      },
    });

    return ApiResponse(true, "Kitchen deleted successfully.", 200, kitchen);
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Error deleting kitchen. Please try again.",
      500,
      error
    );
  }
}
