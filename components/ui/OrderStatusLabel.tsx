import { SubOrderStatusOptions } from "@/types/main";
import { PickupOrderStatus } from "@prisma/client";


export type PickupStatusType = "ALL" | PickupOrderStatus;
export function OrderStatusLabel({ status }: { status: SubOrderStatusOptions }) {
    if (status === "ALL") {
      return (
        <span className="text-xs text-gray-800 bg-gray-100 px-2 py-1 rounded-md font-semibold uppercase">
          All
        </span>
      );
    } else if (status === "ACCEPTED") {
      return (
        <span className="text-xs text-yellow-800 bg-yellow-100 px-2 py-1 rounded-md font-semibold uppercase">
          Accepted
        </span>
      );
    } else if (status === "PREPARING") {
      return (
        <span className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded-md font-semibold uppercase">
          Preparing
        </span>
      );
    } else if (status === "OUT_FOR_DELIVERY") {
      return (
        <span className="text-xs text-green-800 bg-green-50 px-2 py-1 rounded-md font-semibold uppercase">
          Out for Delivery
        </span>
      );
    } else if (status === "DELIVERED") {
      return (
        <span className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-md font-semibold uppercase">
          Delivered
        </span>
      );
    } else if (status === "CANCELLED") {
      return (
        <span className="text-xs text-rose-800 bg-rose-50 px-2 py-1 rounded-md font-semibold uppercase">
          Cancelled
        </span>
      );
    } else if (status === "SKIPPED") {
      return (
        <span className="text-xs text-red-800 bg-red-50 px-2 py-1 rounded-md font-semibold uppercase">
          Skipped
        </span>
      );
    }else if (status === "REFUNDED") {
      return (
        <span className="text-xs text-cyan-800 bg-cyan-50 px-2 py-1 rounded-md font-semibold uppercase">
          Refunded
        </span>
      );
    }
  }
  


  export function PickupStatusLabel({ status }: { status: PickupStatusType }) {
    if (status === "ALL") {
      return (
        <span className="text-xs text-gray-800 bg-gray-100 px-2 py-1 rounded-md font-semibold uppercase">
          All
        </span>
      );
    } else if (status === "ACCEPTED") {
      return (
        <span className="text-xs text-yellow-800 bg-yellow-100 px-2 py-1 rounded-md font-semibold uppercase">
          Accepted
        </span>
      );
    } else if (status === "PREPARING") {
      return (
        <span className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded-md font-semibold uppercase">
          Preparing
        </span>
      );
    } else if (status === "READY") {
      return (
        <span className="text-xs text-green-800 bg-green-50 px-2 py-1 rounded-md font-semibold uppercase">
          Ready to Pickup
        </span>
      );
    } else if (status === "PICKED_UP") {
      return (
        <span className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-md font-semibold uppercase">
          Picked Up
        </span>
      );
    } else if (status === "CANCELLED") {
      return (
        <span className="text-xs text-rose-800 bg-rose-50 px-2 py-1 rounded-md font-semibold uppercase">
          Cancelled
        </span>
      );
    }else if (status === "REFUNDED") {
      return (
        <span className="text-xs text-cyan-800 bg-cyan-50 px-2 py-1 rounded-md font-semibold uppercase">
          Refunded
        </span>
      );
    }
  }
  