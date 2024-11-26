import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const get = searchParams.get("get");
  if (get === "timeslots") {
    try {
      const timeSlots = await prisma.timeSlots.findMany({
        select:{
          id:true,
          timeStart:true,
          timeEnd:true
        }
      });
      if (!timeSlots) {
        return ApiResponse(false, "No time slots found", 404, null);
      }
      return ApiResponse(
        true,
        "Time slots fetched successfully",
        200,
        timeSlots
      );
    } catch (error) {
      console.log("Error while fetching time slots", error);
      return ApiResponse(false, "Something went wrong", 500, error);
    }
  }

  if (get === "openhours") {
    try {
      const openHours = await prisma.openHours.findMany({
      select:{
        id:true,
       day:true,
       openTime:true,
       closeTime:true,
       isClosed:true
      }
      });

      if (!openHours) {
        return ApiResponse(false, "No open hours found", 404, null);
      }
      return ApiResponse(
        true,
        "Open hours fetched successfully",
        200,
        openHours
      );
    } catch (error) {
      console.log("Error while fetching open hours", error);
      return ApiResponse(false, "Something went wrong", 500, error);
    }
  }

  if (get === "kitchens") {
    try {
      const kitchens = await prisma.kitchen.findMany();
      if (!kitchens) {
        return ApiResponse(false, "No kitchens found", 404, null);
      }
      return ApiResponse(true, "Kitchens fetched successfully", 200, kitchens);
    } catch (error) {
      console.log("Error while fetching kitchens", error);
      return ApiResponse(false, "Something went wrong", 500, error);
    }
  }

  return ApiResponse(false, "Invalid request", 400, null);
}
