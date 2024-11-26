import { ResponseType } from "@/types/main";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input) {
      return NextResponse.json<ResponseType>(
        { message: "Input is required", success: false },
        { status: 400 }
      );
    }

    const suggestions = await getAutocompleteSuggestions(input);

    if (!suggestions.length) {
      return NextResponse.json<ResponseType>(
        { message: "No suggestions found", success: false, data: [] },
        { status: 404 }
      );
    }

    const detailedSuggestions = await getDetailsForSuggestions(suggestions);

    return NextResponse.json<ResponseType>({
      message: "Autocomplete Suggestions",
      data: detailedSuggestions,
      success: true,
    });
  } catch (error) {
    return NextResponse.json<ResponseType>(
      { message: "Error fetching autocomplete suggestions", success: false },
      { status: 500 }
    );
  }
}

async function getAutocompleteSuggestions(input: string) {
  const endpoint =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json";
  try {
    const response = await fetch(`${endpoint}?input=${input}&key=${process.env.GOOGLE_MAP_API_KEY}&types=address&components=country:us&location=33.748783,-84.388168&radius=150000&strictbounds=true`);
    const data = await response.json();

    if (data.status === "OK") {
      return data.predictions;
    } else {
      console.error(
        `Error: ${data.status} - ${data.error_message}`
      );
      return [];
    }
  } catch (error) {
    console.error("Error fetching autocomplete suggestions:", error);
    return [];
  }
}

async function getDetailsForSuggestions(suggestions: any[]) {
  const detailedSuggestions = await Promise.all(
    suggestions.map(async (suggestion) => {
      const details = await getPlaceDetails(suggestion.place_id);
      return {
        ...suggestion,
        details,
      };
    })
  );

  return detailedSuggestions;
}

async function getPlaceDetails(placeId: string) {
  const endpoint = "https://maps.googleapis.com/maps/api/place/details/json";
  try {
    const response = await fetch(`${endpoint}?place_id=${placeId}&key=${process.env.GOOGLE_MAP_API_KEY}`);
    const data = await response.json();

    if (data.status === "OK") {
      const result = data.result;
      const addressComponents = result.address_components.reduce(
        (acc: any, component: any) => {
          const types = component.types;
          if (types.includes("locality")) acc.city = component.long_name;
          if (types.includes("administrative_area_level_1"))
            acc.state = component.long_name;
          if (types.includes("postal_code")) acc.zip = component.long_name;
          if (types.includes("country")) acc.country = component.long_name;
          return acc;
        },
        {}
      );
      return addressComponents;
    } else {
      console.error(
        `Error: ${data.status} - ${data.error_message}`
      );
      return {};
    }
  } catch (error) {
    console.error("Error fetching place details:", error);
    return {};
  }
}
