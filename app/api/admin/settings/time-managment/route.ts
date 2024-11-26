import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

export async function POST(req: Request) {
  try {
    const { timeStart, timeEnd } = await req.json();

    const timeSlot = await prisma.timeSlots.findUnique({
      where: {
        timeStart,
        timeEnd,
      },
    });

    if (timeSlot) {
      return ApiResponse(false, "Time slot already exists", 400);
    }

    const newTimeSlot = await prisma.timeSlots.create({
      data: {
        timeStart,
        timeEnd,
      },
    });

    return ApiResponse(true, "Time slot created", 200, newTimeSlot);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong", 500);
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  try {
    if (!id) {
      return ApiResponse(false, "Time slot id is required", 400);
    }
    const timeSlot = await prisma.timeSlots.delete({
      where: {
        id,
      },
    });

    if (!timeSlot) {
      return ApiResponse(false, "Time slot not found", 404);
    }
    return ApiResponse(true, "Time slot deleted", 200, timeSlot);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong", 500);
  } finally {
    await prisma.$disconnect();
  }
}
