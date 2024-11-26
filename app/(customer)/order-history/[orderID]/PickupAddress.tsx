import { useKitchens } from "@/contexts/KitchenContext";
import React from "react";

function PickupAddress({
  orderType,
  kitchenId,
}: {
  orderType: string;
  kitchenId: string;
}) {
  const { kitchens } = useKitchens();
  const pickupKitchen =
    kitchens.find((kitchen) => kitchen.id === kitchenId) || null;
  return (
    <div>
      {orderType === "PICKUP" && pickupKitchen && (
        <div className="mt-1 text-sm text-foreground">
          <p>{pickupKitchen?.name}</p>
          <p>{pickupKitchen?.address}</p>
          <p>{pickupKitchen?.phone}</p>
        </div>
      )}
    </div>
  );
}

export default PickupAddress;
