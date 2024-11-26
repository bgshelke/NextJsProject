"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ResponseType } from "@/types/main";
import useSWR, { mutate } from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/helper";

declare global {
  interface Window {
    google: any;
  }
}

function AreaHandling() {
  const mapRef = useRef(null);

  const [polygons, setPolygons] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useSWR(
    process.env.NEXT_PUBLIC_URL + "/api/admin/save-areas",
    fetcher
  );
  const dataLoading = isLoading || !data;
  const savedPolygons = useMemo(() => data?.data || [], [data]);
  useEffect(() => {
    if (dataLoading) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=drawing,places`; // Add 'places' library
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      const google = window.google;
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 33.748783, lng: -84.388168 },
        zoom: 12,
      });

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Search location";
      input.style.cssText =
        "position: absolute; top: 20px; left: 600px;margin-top: 10px; transform: translateX(-50%); z-index: 5; width: 300px; padding: 6px; border-radius: 5px; border: 1px solid #ccc; font-size: 17px;";
      map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

      const autocomplete = new google.maps.places.Autocomplete(input);
      autocomplete.bindTo("bounds", map);

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          return;
        }

        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
        }
      });

      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [google.maps.drawing.OverlayType.POLYGON],
        },
      });

      drawingManager.setMap(map);

      google.maps.event.addListener(
        drawingManager,
        "overlaycomplete",
        (event: any) => {
          const newPolygon = event.overlay;
          setPolygons((prevPolygons: any) => [...prevPolygons, newPolygon]);

          google.maps.event.addListener(newPolygon, "click", () => {
            newPolygon.setMap(null);
            setPolygons((prevPolygons: any) =>
              prevPolygons.filter((polygon: any) => polygon !== newPolygon)
            );
            addPolygonDeleteListener(newPolygon);
          });
        }
      );
      const addPolygonDeleteListener = (polygon: any) => {
        google.maps.event.addListener(polygon, "click", () => {
          polygon.setMap(null);
          setPolygons((prevPolygons: any) =>
            prevPolygons.filter((p: any) => p !== polygon)
          );
        });
      };

      if (savedPolygons) {
        savedPolygons.forEach((path: any) => {
          const polygon = new google.maps.Polygon({
            paths: path,
            map: map,
          });
          setPolygons((prevPolygons: any) => [...prevPolygons, polygon]);
          addPolygonDeleteListener(polygon);
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [dataLoading, savedPolygons]);

  const handleSave = () => {
    const polygonPaths = polygons.map((polygon: any) =>
      polygon
        .getPath()
        .getArray()
        .map((latlng: any) => ({
          lat: latlng.lat(),
          lng: latlng.lng(),
        }))
    );
    if (polygonPaths.length === 0 || !polygonPaths) {
      toast.error("Please add at least one area");
      return;
    }

    if (polygonPaths.length > 0) {
      setSaving(true);
      const savingPromise = new Promise((resolve, reject) => {
        fetch(process.env.NEXT_PUBLIC_URL + "/api/admin/save-areas", {
          method: "POST",
          body: JSON.stringify({
            polygonPaths: polygonPaths,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then(async (response) => {
            setSaving(false);
            const res = await response.json();
            if (response.ok) {
              resolve(res);
              mutate(process.env.NEXT_PUBLIC_URL + "/api/admin/save-areas");
            } else {
              reject(new Error(res.message || "Failed to save areas"));
            }
          })
          .catch((error) => {
            reject(new Error("Error while saving areas: " + error.message));
          });
      });

      toast.promise(savingPromise as Promise<ResponseType>, {
        loading: "Saving Areas...",
        success: (res) => {
          return res.message;
        },
        error: (error) => error.message,
      });

      savingPromise.catch((error) =>
        console.error("Error while saving areas", error)
      );
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="space-y-1.5">
         <h2 className="text-2xl font-bold tracking-tight">
            Area & Zone Handling
          </h2>
          <p className="text-sm text-muted-foreground">
            You can add multiple areas and zones to your map. You can also edit
            or delete them.
          </p>
         </div>
          <div>
            <Button onClick={handleSave} disabled={saving || dataLoading}>
              Save Areas
            </Button>
          </div>
        </div>
        {dataLoading ? (
          <Skeleton className="w-full h-[500px]" />
        ) : (
          <div>
            <div ref={mapRef} style={{ height: "500px", width: "100%" }}></div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default AreaHandling;
