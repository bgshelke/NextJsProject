"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKitchens } from "@/contexts/KitchenContext";
import { useKitchenOption } from "@/stores/plan/usePlanStore";
import { Kitchen } from "@prisma/client";
function SelectKitchen() {
  const { selectedKitchen, setSelectedKitchen } = useKitchenOption();
  const { kitchens } = useKitchens();
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 mt-4">
        Select Pickup Location
      </h2>
      <Select
        onValueChange={(value: string) => setSelectedKitchen(value)}
        value={selectedKitchen || ""}
      >
        <SelectTrigger className="w-full rounded-md p-6">
          <SelectValue placeholder="Select Location" />
        </SelectTrigger>
        <SelectContent>
          {kitchens.map((kitchen: Kitchen) => (
            <SelectItem key={kitchen.id} value={kitchen.id}>
              {kitchen.name} {kitchen.address}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SelectKitchen;
