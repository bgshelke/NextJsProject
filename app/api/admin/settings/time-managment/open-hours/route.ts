import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  try {
    const openHours = await prisma.openHours.findMany();
    return ApiResponse(true, "Open hours fetched successfully", 200, openHours);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong", 500, null);
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(req: Request) {
  try {
    const { day: date, isClosed, openTime, closeTime } = await req.json();

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const day = daysOfWeek[new Date(date).getDay()];
    await prisma.openHours.upsert({
      where: {
        day: day,
      },
      update: {
        isClosed: isClosed,
        openTime: openTime,
        closeTime: closeTime,
      },
      create: {
        day: day,
        isClosed: isClosed,
        openTime: openTime || "09:00",
        closeTime: closeTime || "18:00",
      },
    });

    const message = isClosed ? `Day ${day} is closed` : `Day ${day} updated`;
    return ApiResponse(true, message, 200, null);
  } catch (error) {
    console.log(error);
    return ApiResponse(false, "Something went wrong", 500, null);
  } finally {
    await prisma.$disconnect();
  }
}
