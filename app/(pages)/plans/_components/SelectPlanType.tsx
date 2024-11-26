"use client";
import {  useOrderType } from "@/stores/plan/usePlanStore";

function SelectPlanType() {
  const { planType, setPlanType } = useOrderType();

  return (
    <div className="flex items-center text-center border border-primary transition rounded-md text-primary max-w-lg mx-auto mb-8 mt-3">
      <div
        className={`p-2.5 relative  cursor-pointer w-full transition  ${
          planType === "SUBSCRIPTION" ? "bg-primary text-white font-medium" : ""
        }`}
        data-test="subscription-order"
        onClick={() => setPlanType("SUBSCRIPTION")}
      >
        <div className="text-xs text-white font-medium bg-white rounded-md overflow-hidden absolute -top-4 right-16 w-fit ">
          <div className="bg-red-700  p-1 px-4  shadow-lg animate-pulse w-max">
            Most Popular
          </div>
        </div>
        Meal Subscription
      </div>
      <div
        className={`p-2.5 cursor-pointer w-full transition ${
          planType === "ONETIME" ? "bg-primary text-white font-medium" : ""
        }`}
      
        onClick={() => setPlanType("ONETIME")}
      >
        One Time Order
      </div>
    </div>
  );
}

export default SelectPlanType;
