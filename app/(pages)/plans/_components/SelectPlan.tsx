"use client";

import { useFinalOrderStore, usePlanStore } from "@/stores/plan/usePlanStore";
import { Check } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

interface PlanOption {
  id: string;
  name: string;
  description: string;
  image: string;
}

function SelectPlan() {
  const { selectedPlan, setSelectedPlan } = usePlanStore();
  const { selectedPlan: finalSelectedPlan } = useFinalOrderStore();
  const planOptions = [
    {
      id: "CURRY",
      name: "Curry Plan",
      description: "Curry Plan",
      image: "/images/curry.png",
    },
    {
      id: "MEAL",
      name: "Meal Plan",
      description: "Meal Plan",
      image: "/images/meal.png",
    },
  ];
  useEffect(() => {
    if (!selectedPlan && finalSelectedPlan) {
      setSelectedPlan(finalSelectedPlan);
    }
  }, [finalSelectedPlan, selectedPlan, setSelectedPlan]);
  return (
    <div className="grid grid-cols-2 gap-2 md:gap-4 my-6  w-full text-left">
      {planOptions.map((option: PlanOption) => (
        <div
          key={option.id}
          data-test="plans-name"
          className={`bg-white relative border  rounded-full md:rounded-lg hover:border-primary cursor-pointer flex flex-col items-center justify-center ${
            selectedPlan === option.id ? "border-primary" : ""
          }`}
          onClick={() =>
            setSelectedPlan(option.id === "CURRY" ? "CURRY" : "MEAL")
          }
        >
          <div className="p-2 text-center max-sm:flex max-sm:items-center max-sm:justify-center max-sm:gap-x-2">
            <Image
              src={option.image}
              width={140}
              height={140}
              alt="Meal "
              className="mx-auto w-12 h-12 md:w-32 md:h-32 md:p-2"
            />
            <h5 className="text-base font-semibold" data-test="plans-text">
              {option.name}
            </h5>
          </div>
          {selectedPlan === option.id && (
            <Check
              size={22}
              strokeWidth={4}
              className="bg-primary p-1 rounded-full text-white absolute top-1 right-1 md:top-3 md:right-3"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default SelectPlan;
