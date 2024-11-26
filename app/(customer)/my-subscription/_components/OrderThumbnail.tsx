"use client";
import {  SubOrders } from "@prisma/client";
import Image from "next/image";
import React from "react";

interface orderPreference extends SubOrders {
  mealPreferences: string[];
}

function OrderThumbnail({ order }: { order: orderPreference }) {
  const preference = order.mealPreferences;
  
  return (
    <div className="w-32 h-24 rounded-md overflow-hidden relative">
      <Image
        src={
          order.thumbnail
            ? process.env.NEXT_PUBLIC_AWS_URL + order.thumbnail
            : "/images/placeholder-sm.jpg"
        }
        alt="Subscription Order"
        className="object-cover w-full h-full"
        width={200}
        height={200}
      />
      <div className="absolute bottom-1 left-1 flex gap-[2px]">
    
        {preference.includes("NON_VEG") && (
          <Image
            src="/icons/non_veg_symbol.svg"
            alt="non-veg"
            width={20}
            height={20}
          />
        )}
        {preference.includes("VEG") && (
          <Image src="/icons/veg_symbol.svg" alt="veg" width={20} height={20} />
        )}
      </div>
    </div>
  );
}

export default OrderThumbnail;
