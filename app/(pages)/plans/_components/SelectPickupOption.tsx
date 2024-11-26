"use client";
import { usePickUpOption } from "@/stores/plan/usePlanStore";
import { PackageCheck } from "lucide-react";
import { HandPlatter } from "lucide-react";


function SelectPickupOption() {
  const { selectedDeliveryOption, setSelectedDeliveryOption } =
    usePickUpOption();

  const handleOptionClick = (option: string) => {
    if (selectedDeliveryOption !== option) {
      setSelectedDeliveryOption(option as "PICKUP" | "DELIVERY");
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold mb-3 ">
        How You&lsquo;ll Receive Your Order
      </h2>
      <div className="flex items-center gap-x-2 text-sm">
        <button
          onClick={() => handleOptionClick("DELIVERY")}
          className={`border cursor-pointer border-gray-300 min-w-max ${
            selectedDeliveryOption === "DELIVERY" &&
            "border-primary text-primary"
          } hover:border-first hover:text-first p-3 px-6 rounded-md w-full text-center`}
          data-test="get-delivery"
        >
          <PackageCheck size="18" className="inline-block " /> Get Delivery
        </button>

        <button
          onClick={() => handleOptionClick("PICKUP")}
          className={`border cursor-pointer border-gray-300 min-w-max ${
            selectedDeliveryOption === "PICKUP" && "border-primary text-primary"
          } hover:border-first hover:text-first p-3 px-6 rounded-md w-full text-center`}
        >
          <HandPlatter size="18" className="inline-block " /> Pickup
        </button>
      </div>
    </>
  );
}

export default SelectPickupOption;
