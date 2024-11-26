"use client";
import { useSession } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { useRef, useState } from "react";
import { PickupOrderStatus } from "@prisma/client";
import { SubOrderStatusType } from "@/types/main";
import { fetcher } from "@/lib/helper";
import useSWR from "swr";
import KitchenMenuData from "./_components/KitchenMenuData";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useReactToPrint } from "react-to-print";
import { Label } from "@/components/ui/label";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { OrderStats } from "./_components/OrderStats";
import RecentCustomer from "./_components/RecentCustomer";
import { OrderStatusLabel, PickupStatusLabel } from "@/components/ui/OrderStatusLabel";
function Page() {
  const { data: session } = useSession();
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [orderType, setOrderType] = useState<
    "ALL" | "SUBSCRIPTION" | "DABBHAH" | "GUESTDABBHAH" | "PICKUP" | null
  >(null);

  const [statusFilter, setStatusFilter] = useState<SubOrderStatusType | null>(
    null
  );

  const [pickupStatusFilter, setPickupStatusFilter] =
    useState<PickupOrderStatus | null>(null);

  let query = "";
  if (date && date !== undefined && date.from && date.from !== undefined)
    query = `date=${date.from.toISOString().split("T")[0]}`;
  if (date && date !== undefined && date.to && date.to !== undefined)
    query = `${query}&to=${date.to.toISOString().split("T")[0]}`;

  if (orderType)
    query = `${query}&orderType=${orderType === "ALL" ? "" : orderType}`;
  if (statusFilter) query = `${query}&status=${statusFilter}`;
  if (pickupStatusFilter) query = `${query}&pickupStatus=${pickupStatusFilter}`;
  const { data: kitchenData, isLoading: kitchenDataLoading } = useSWR(
    `/api/admin/data/kitchen?${query}`,
    fetcher
  );

  const reportRef = useRef<HTMLDivElement>(null);

  const consolidatedItems = kitchenData?.data?.consolidatedItems;

  const handleDownloadReport = useReactToPrint({
    documentTitle: `Kitchen Report`,
    onAfterPrint: () => {
      reportRef.current?.remove();
    },
  });


  const graphData = kitchenData?.data?.graphData;
  const orderStats = kitchenData?.data?.orderStats;

  const convertWithFormat = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M+`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k+`;
    }
    return value.toString();
  };

  const formattedOrderStats = {
    subscriptionOrders: convertWithFormat(orderStats?.subscriptionOrders || 0),
    oneTimeOrders: convertWithFormat(orderStats?.oneTimeOrders || 0),
    pickupOrders: convertWithFormat(orderStats?.pickupOrders || 0),
    guestOrders: convertWithFormat(orderStats?.guestOrders || 0),
    guestPickupOrders: convertWithFormat(orderStats?.guestPickupOrders || 0),
    skippedOrders: convertWithFormat(orderStats?.skippedOrders || 0)
  }

  return (
    <ScrollArea className="h-full p-8" ref={reportRef}>
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold  tracking-tight">
            Good Morning, {session?.user?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome to the dashboard. Here you can manage your kitchen.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[250px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"}>
                <Filter size={16} className="mr-1" /> Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="space-y-2 mt-2">
                <Label htmlFor="orderType">Order Type:</Label>
                <Select
                  value={orderType ?? undefined}
                  onValueChange={(value) =>
                    setOrderType(
                      value as
                        | "ALL"
                        | "SUBSCRIPTION"
                        | "DABBHAH"
                        | "GUESTDABBHAH"
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="ALL" value="ALL">
                      All
                    </SelectItem>
                    <SelectItem key="SUBSCRIPTION" value="SUBSCRIPTION">
                      Subscription
                    </SelectItem>
                    <SelectItem key="DABBHAH" value="DABBHAH">
                      Dabbah
                    </SelectItem>
                    <SelectItem key="PICKUP" value="PICKUP">
                      Pickup
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(orderType === "SUBSCRIPTION" || orderType === "DABBHAH") && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="statusFilter">Status:</Label>
                  <Select
                    value={statusFilter ?? undefined}
                    onValueChange={(value) =>
                      setStatusFilter(value as SubOrderStatusType)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "ACCEPTED",
                        "PREPARING",
                        "OUT_FOR_DELIVERY",
                        "DELIVERED",
                        "SKIPPED",
                        "CANCELLED",
                        "REFUNDED",
                      ].map((status) => (
                        <SelectItem key={status} value={status}>
                          <OrderStatusLabel
                            status={status as SubOrderStatusType}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {orderType === "PICKUP" && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="statusFilter">Pickup Status:</Label>
                  <Select
                    value={statusFilter ?? undefined}
                    onValueChange={(value) =>
                      setStatusFilter(value as SubOrderStatusType)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "ACCEPTED",
                        "PREPARING",
                        "READY",
                        "PICKED_UP",
                        "CANCELLED",
                        "REFUNDED",
                      ].map((status) => (
                        <SelectItem key={status} value={status}>
                          <PickupStatusLabel
                            status={status as PickupOrderStatus}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button
            className="print:hidden"
            variant={"outline"}
            onClick={() => {
              handleDownloadReport();
            }}
          >
            Download Report
          </Button>
        </div>
      </div>

      <div className="flex items-start mt-6 gap-6">
        <div className="w-2/3 ">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 space-y-2">
              <h1 className="text-3xl font-bold">{formattedOrderStats.subscriptionOrders}</h1>
              <p className="text-sm text-muted-foreground">Subscription Orders</p>
            </div>
            <div className="bg-white rounded-lg p-3 space-y-2">
              <h1 className="text-3xl font-bold">{formattedOrderStats.oneTimeOrders}</h1>
              <p className="text-sm text-muted-foreground">One-Time Orders</p>
            </div>
            <div className="bg-white rounded-lg p-3 space-y-2">
              <h1 className="text-3xl font-bold">{formattedOrderStats.pickupOrders}</h1>
              <p className="text-sm text-muted-foreground">Pickup Orders</p>
            </div>
            <div className="bg-white rounded-lg p-3 space-y-2">
              <h1 className="text-3xl font-bold">{formattedOrderStats.guestOrders}</h1>
              <p className="text-sm text-muted-foreground">Guest Order</p>
            </div>
            <div className="bg-white rounded-lg p-3 space-y-2">
              <h1 className="text-3xl font-bold">{formattedOrderStats.guestPickupOrders}</h1>
              <p className="text-sm text-muted-foreground">Guest Pickup</p>
            </div>
            <div className="bg-white rounded-lg p-3 space-y-2">
              <h1 className="text-3xl font-bold">{formattedOrderStats.skippedOrders}</h1>
              <p className="text-sm text-muted-foreground">Skipped Orders</p>
            </div>
          </div>
          <OrderStats
            data={graphData}
            date={date}
            isLoading={kitchenDataLoading}
          />
        </div>
        <div className="w-1/3">
          <KitchenMenuData
            date={date}
            data={consolidatedItems}
            menuDataLoading={kitchenDataLoading}
          />
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4 mt-6">Recent Customers</h1>
      <div className="bg-white p-4 rounded-lg">
        <RecentCustomer date={date } />
      </div>
    </ScrollArea>
  );
}

export default Page;
