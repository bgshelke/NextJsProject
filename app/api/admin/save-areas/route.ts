import prisma from "@/lib/db";
import { ApiResponse } from "@/lib/response";
import { ResponseType } from "@/types/main";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const savedAreas = await prisma.savedAreas.findUnique({
      where: {
        id: "dwArea",
      },
    });
    if (savedAreas) {
      return ApiResponse(
        true,
        "Areas fetched successfully",
        200,
        savedAreas.polygonPaths
      );
    }
    return ApiResponse(false, "Failed to fetch areas", 500, null);
  } catch (error) {
    return ApiResponse(false, "Failed to fetch areas", 500, null);
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: Request) {
  try {
    const { polygonPaths } = await req.json();
    if (!polygonPaths) {
      return ApiResponse(
        false,
        "No areas to save. Please draw areas on the map.",
        400,
        null
      );
    }
    const savedAreas = await prisma.savedAreas.upsert({
      where: {
        id: "dwArea",
      },
      create: {
        polygonPaths,
      },
      update: {
        polygonPaths,
      },
    });
    if (savedAreas) {
      return ApiResponse(true, "Areas saved successfully", 200, null);
    }
    return ApiResponse(false, "Failed to save areas", 500, null);
  } catch (error) {
    console.log("Error saving areas", error);
    return ApiResponse(false, "Failed to save areas", 500, null);
  } finally {
    await prisma.$disconnect();
  }
}
