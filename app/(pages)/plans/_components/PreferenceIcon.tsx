import { MealPreference } from "@prisma/client";
import Image from "next/image";
import React from "react";

function PreferenceIcon({ preference, className }: { preference: MealPreference, className?: string }) {
  return (
    <Image
      src={
        preference === "NON_VEG"
          ? "/icons/non_veg_symbol.svg"
          : "/icons/veg_symbol.svg"
      }
      alt={preference === "NON_VEG" ? "non-veg" : "veg"}
      width={20}
      height={20}
      className={className}
    />
  );
}

export default PreferenceIcon;
