import prisma from "@/lib/db";
import { ResponseType } from "@/types/main";

import { NextRequest, NextResponse } from "next/server";

interface LatLng {
  lat: number;
  lng: number;
}

function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
) {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

function isAddressInPolygons(
  address: { lat: number; lng: number },
  polygons: { lat: number; lng: number }[][]
) {
  return polygons.some((polygon) => isPointInPolygon(address, polygon));
}

export async function POST(req: NextRequest) {
  try {
    const { placename } = await req.json();

    if (!placename) {
      return NextResponse.json(
        { success: false, message: "Please enter your address." },
        { status: 400 }
      );
    }

    const savedArea = await prisma.savedAreas.findUnique({
      where: {
        id: "dwArea",
      },
    });
    if (!savedArea) {
      return NextResponse.json(
        {
          success: false,
          message: "Sorry we are not available at your location.",
        },
        { status: 404 }
      );
    }

    const endpoint = "https://maps.googleapis.com/maps/api/place/details/json";
    let userplaceid = null;
    if (placename) {
      const getplaceid = await getPlaceIdByPlacename(placename);
      userplaceid = getplaceid?.place_id;

      if (!userplaceid) {
        return NextResponse.json(
          {
            success: false,
            message: "Sorry we are not available at your location.",
          },
          { status: 400 }
        );
      }
    }
    const response = await fetch(`${endpoint}?place_id=${userplaceid}&key=${process.env.GOOGLE_MAP_API_KEY}`);
    if (response.ok) {
      const data = await response.json();
      const { geometry } = data.result;
      const userLocation = {
        lat: geometry.location.lat,
        lng: geometry.location.lng,
      };
      const savedPolygons = savedArea?.polygonPaths as unknown as LatLng[][];

      const isInPolygon = isAddressInPolygons(userLocation, savedPolygons);

      if (isInPolygon) {
        return NextResponse.json(
          {
            success: true,
            message: "Sorry we are not available at your location.",
            data: data,
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Sorry we are not available at your location.",
          },
          { status: 400 }
        );
      }
    }
    if (!response.ok) {
      return NextResponse.json<ResponseType>(
        {
          success: false,
          message: "Sorry we are not available at your location.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.log("Error:", error);
    return NextResponse.json<ResponseType>(
      { success: false, message: "Error while fetching place data" },
      { status: 500 }
    );
  }
}

async function getPlaceIdByPlacename(placename: string) {
  const endpoint =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json";
  try {
    const response = await fetch(`${endpoint}?input=${placename}&key=${process.env.GOOGLE_MAP_API_KEY}&types=address&components=country:us&location=33.748783,-84.388168&radius=150000&strictbounds=true`);
    const data = await response.json();

    if (data.status === "OK" && data.predictions.length > 0) {
      const matchingPrediction = data.predictions.find(
        (prediction: any) =>
          prediction.description.toLowerCase().includes(placename.toLowerCase())
      );
      if (matchingPrediction) {
        return {
          place_id: matchingPrediction.place_id,
          description: matchingPrediction.description,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching place ID by placename:", error);
    return null;
  }
}
