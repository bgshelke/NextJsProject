"use client";
import { addressAvailability } from "@/stores/addressAvailability";
import {
  useDeliveryDayStore,
  useOrderType,
  usePickUpOption,
} from "@/stores/plan/usePlanStore";
import { TimeSlotsType } from "@/types/main";
import SelectPlanType from "./SelectPlanType";
import SelectPickupOption from "./SelectPickupOption";
import SelectKitchen from "./SelectKitchen";
import CheckAddressAvailability from "@/components/Frontend/CheckAddressAvailability";
import OneTimeOption from "./OneTimeOption";
import SelectSubscriptionDays from "./SelectSubscriptionDays";
import SelectDeliveryDate from "./SelectDeliveryDate";

function PlanSelector({ slots }: { slots: TimeSlotsType[] }) {
  const { planType } = useOrderType();
  const { isAvailable } = addressAvailability();
  const { selectedDeliveryOption } = usePickUpOption();
  const { selectedDeliveryDate } = useDeliveryDayStore();
  const shouldRenderOneTimeOption =
    (isAvailable && selectedDeliveryOption === "DELIVERY") ||
    selectedDeliveryOption === "PICKUP";

  return (
    <div>
      <div className={`relative`}>
        <h2 className="text-xl font-semibold mb-4 text-center">
          Select Dabbah Type
        </h2>
        <SelectPlanType />

        {planType === "ONETIME" && (
          <>
            <SelectPickupOption />
            {selectedDeliveryOption === "PICKUP" && <SelectKitchen />}
            {selectedDeliveryOption === "DELIVERY" && (
              <>
                <h2 className="text-lg font-semibold mb-3 mt-4">
                  Check Availability
                </h2>
                <CheckAddressAvailability />
              </>
            )}
            {shouldRenderOneTimeOption && <OneTimeOption slots={slots} />}
          </>
        )}

        {planType === "SUBSCRIPTION" && (
          <>
            <h2 className="text-lg font-semibold mb-3 mt-4">
              Check Availability
            </h2>
            <CheckAddressAvailability />
            {planType === "SUBSCRIPTION" && isAvailable && (
              <>
                <SelectDeliveryDate />

                {selectedDeliveryDate && (
                  <>
                    <SelectSubscriptionDays slots={slots} />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PlanSelector;
