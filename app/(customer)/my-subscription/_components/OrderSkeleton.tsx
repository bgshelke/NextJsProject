import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

function OrderSkeleton() {
  return (
    <div className="bg-white w-full">
      <div className="border-t w-full">
        <div className="flex items-center gap-4 p-4 w-full">
          <Skeleton className="w-32 h-24 rounded-md" />

          <div className="w-full">
            <div className="flex items-center gap-2 justify-between w-full">
              <div className="w-full">
                <Skeleton className="w-full max-w-xs h-3 rounded-md" />
                <Skeleton className="mt-2 w-full max-w-sm h-3 rounded-md" />
              </div>
              <Skeleton className="w-24 h-5 rounded-md hidden md:block" />
            </div>
           
            <div className="gap-x-1 flex items-center mt-3 w-full"></div>
              <Skeleton className="w-20 h-6 rounded-md" />
            </div>
          </div>
        </div>
      </div>

  );
}

export default OrderSkeleton;
