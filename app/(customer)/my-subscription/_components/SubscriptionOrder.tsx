import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import {
  Item,
  ResponseType,
  SubOrderStatusType,
  TimeSlotsType,
} from "@/types/main";
import React, { useCallback, useState } from "react";
import useSWR, { mutate } from "swr";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Ellipsis } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { DwConfig, SubOrders } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import AddAdditionalDay from "./AddAdditionalDay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoadingOrder from "./LoadingOrder";
import { isToday, isTomorrow } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useSetAdditionalDays } from "@/stores/useOptions";
import { fetcher } from "@/lib/helper";
import ItemDetails, { SubOrderItem } from "./ItemDetails";
import {
  convertToAmPm,
  getWeekDates,
  estTimeZone,
  utcTimeZone,
  disableTomorrow,
} from "@/lib/helper/dateFunctions";
import OrderThumbnail from "./OrderThumbnail";
import { OrderStatusLabel } from "./OrderStatusLabel";
import useExtraItem from "@/stores/addExtraItem";
import { useItems } from "@/contexts/ItemContext";
import { useDwConfig } from "@/contexts/DwConfigProvider";
interface SubscriptionOrderProps {
  firstDeliveryDate: Date;
  orderId: string;
  isActive: boolean;
  isUpcoming: boolean;
  timeSlots?: TimeSlotsType[];
}

interface selectedOrderType {
  type: "active" | "upcoming" | "delivered" | "cancelled" | null;
  index: number | null;
  items: SubOrderItem[];
}

interface SubOrderWithItems extends SubOrders {
  items: {
    itemId: string;
    quantity: number;
    refundQuantity: number;
  }[];
  mealPreferences: string[];
}

function SubscriptionOrder({
  firstDeliveryDate,
  orderId,
  isActive,
  isUpcoming,
  timeSlots,
}: SubscriptionOrderProps) {
  const router = useRouter();
  const { items } = useItems();
  const [selectedOrder, setSelectedOrder] = useState<selectedOrderType>({
    type: null,
    index: null,
    items: [],
  });

  const { showAddAdditionalDay } = useSetAdditionalDays();
  const [openSkipModal, setOpenSkipModal] = useState<{
    open: boolean;
    items: SubOrderItem[];
    type: "SKIP" | "UNSKIP";
  } | null>(null);
  const [selectedOrderID, setSelectedOrderID] = useState("");
  const [openSwitchOrder, setOpenSwitchOrder] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [selectedOrderDate, setSelectedOrderDate] = useState<Date | null>(null);
  const [currentOrderDate, setCurrentOrderDate] = useState<Date | null>(null);
  const { dwConfig } = useDwConfig();
  const constructAPIUrl = (orderId: string, type: string) =>
    `/api/customer/subscription/orders?orderID=${orderId}&status=${type}`;
  const deliveredOrderAPI = constructAPIUrl(orderId, "delivered");
  const cancelledOrderAPI = constructAPIUrl(orderId, "cancelled");
  const upcomingOrderAPI = constructAPIUrl(orderId, "upcoming");
  const activeOrderAPI = constructAPIUrl(orderId, "active");
  const orderDataAPI = `/api/customer/subscription/orders/subdays?orderID=${orderId}&&days=true`;
  const { setOrderId, setIsFutureOrder } = useExtraItem();

  const { data: activeOrder, isLoading: activeOrderLoading } = useSWR(
    activeOrderAPI,
    fetcher,
    { revalidateOnFocus: true }
  );
  const {
    data: upcomingOrder,
    isLoading: upcomingOrderLoading,
    mutate: upcomingOrderMutate,
  } = useSWR(!activeOrderLoading ? upcomingOrderAPI : null, fetcher);

  const { data: deliveredOrder, isLoading: deliveredOrderLoading } = useSWR(
    !activeOrderLoading && !upcomingOrderLoading ? deliveredOrderAPI : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: cancelledOrder, isLoading: cancelledOrderLoading } = useSWR(
    !activeOrderLoading && !upcomingOrderLoading ? cancelledOrderAPI : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: orderData, mutate: orderMutate } = useSWR(
    orderDataAPI,
    fetcher,
    { revalidateOnFocus: false }
  );

  const activeOrderData = activeOrder?.data as SubOrderWithItems[];
  const upcomingOrderData = upcomingOrder?.data as SubOrderWithItems[];
  const deliveredOrderData = deliveredOrder?.data as SubOrderWithItems[];
  const cancelledOrderData = cancelledOrder?.data as SubOrderWithItems[];
  function showOrderDetails(
    type: string,
    index: number,
    items: SubOrderItem[]
  ) {
    if (selectedOrder.type === type && selectedOrder.index === index) {
      setSelectedOrder({ type: null, index: null, items: [] });
    } else {
      setSelectedOrder({
        type: type as "active" | "upcoming" | "delivered" | "cancelled" | null,
        index,
        items: items,
      });
    }
  }
  const suborderData = orderData?.data?.subOrders;

  const currentDate = toZonedTime(new Date(), estTimeZone);
  const weekDays = orderData
    ? (getWeekDates(toZonedTime(firstDeliveryDate, utcTimeZone)) as Date[])
    : [];

  const orderedDates = suborderData?.map((subOrder: any) => {
    return toZonedTime(
      new Date(subOrder.deliveryDate),
      utcTimeZone
    ).toISOString();
  });

  let orderedDatesOnly = orderedDates?.map((date: string) => {
    return date?.split("T")?.[0] || null; // Handle null or invalid entries
  });

  const availableDates = weekDays.filter((date) => {
    const zonedDate = toZonedTime(date, estTimeZone).toISOString();
    console.log(zonedDate);
    const zonedDateOnly = zonedDate.split("T")[0];
    return zonedDate && !orderedDatesOnly?.includes(zonedDateOnly);
  });

  async function handleSkipUnskip(
    suborderId: string,
    action: "SKIP" | "UNSKIP"
  ) {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_URL + `/api/customer/subscription/actions`,
        {
          method: "POST",
          body: JSON.stringify({
            orderId: suborderId,
            action: action,
            isUpcoming: isUpcoming,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setOpenSkipModal(null);
        setSelectedOrderID("");
        mutate(upcomingOrderAPI);
        mutate(activeOrderAPI);
        mutate(process.env.NEXT_PUBLIC_URL + `/api/customer/wallet`);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to skip order.");
      console.log(error);
    }
  }

  const calculateTotalOfItems = useCallback(
    (subItems: SubOrderItem[]) => {
      return subItems?.reduce((total, item) => {
        const matchingItem = items?.find((i: Item) => i.id === item.itemId);
        const itemPrice = matchingItem?.price || 0;
        return total + itemPrice * (item.quantity - (item.refundQuantity || 0));
      }, 0);
    },
    [items]
  );

  const handleSwitchOrder = (
    switchDate: Date | null,
    orderId: string,
    currentOrderDate: Date | null,
    slotId: string | null
  ) => {
    if (!currentOrderDate || !switchDate) {
      toast.error("Please select a date to switch");
      return;
    }

    if (!slotId) {
      toast.error("Please select a delivery slot");
      return;
    }

    const switchOrderPromise = new Promise((resolve, reject) => {
      fetch(
        process.env.NEXT_PUBLIC_URL +
          "/api/customer/subscription/actions/switch-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderId,
            selectedDate: switchDate,
            switchDate: currentOrderDate,
            slotId: slotId,
            isUpcoming: isUpcoming,
          }),
        }
      )
        .then(async (response) => {
          const res = await response.json();
          if (response.ok) {
            resolve(res);
            setCurrentOrderDate(null);
            setSelectedOrderDate(null);
            setOpenSwitchOrder(false);
            upcomingOrderMutate();

            orderMutate();
            if (isUpcoming) {
              mutate(
                process.env.NEXT_PUBLIC_URL +
                  `/api/customer/subscription/orders/upcoming`
              );
            } else {
              mutate(
                process.env.NEXT_PUBLIC_URL +
                  `/api/customer/subscription/orders/active`
              );
            }
            mutate(process.env.NEXT_PUBLIC_URL + `/api/customer/wallet`);
          } else {
            reject(new Error(res.message || "Failed to switch order"));
          }
        })
        .catch((error) => {
          reject(new Error("Error while switching order: " + error.message));
        });
    });

    toast.promise(switchOrderPromise as Promise<ResponseType>, {
      loading: "Switching Order...",
      success: (res) => {
        return res.message;
      },
      error: (error) => error.message,
    });

    switchOrderPromise.catch((error) =>
      console.error("Error while switching order", error)
    );
  };

  const handleAddExtra = (subOrderId: string) => {
    setOrderId(subOrderId);
    setIsFutureOrder(isUpcoming);
    router.push("/my-subscription/add-extra");
  };

  const isActiveOrderData =
    !activeOrderLoading && activeOrderData && activeOrderData.length !== 0;
  const isUpcomingOrderData =
    !upcomingOrderLoading &&
    upcomingOrderData &&
    upcomingOrderData.length !== 0;
  const isDeliveredOrderData =
    !deliveredOrderLoading &&
    deliveredOrderData &&
    deliveredOrderData.length !== 0;

  function isDisabledActions(deliveryDate: Date): boolean {
    const dateString = new Date(deliveryDate).toISOString().split("T")[0];
    const orderDate = toZonedTime(dateString, estTimeZone);
    console.log(orderDate + "orderDate");
    const isTodayDate = isToday(orderDate);
    const isTomorrowDate = disableTomorrow(
      orderDate,
      dwConfig?.timeToStopAction || "20:00"
    );
    return isTodayDate || isTomorrowDate;
  }

  return (
    <>
      {showAddAdditionalDay && (
        <AddAdditionalDay
          availableDates={availableDates}
          firstDeliveryDate={firstDeliveryDate}
          orderID={orderId}
          isUpcoming={isUpcoming}
        />
      )}

      <div
        className={` ${
          showAddAdditionalDay ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {/* Active Order */}
        {activeOrderLoading && <LoadingOrder />}
        {isActiveOrderData && (
          <>
            <div className="bg-gray-100 p-3">
              <h4 className="font-semibold">
                {"Today's Deliveries"}({activeOrderData.length})
              </h4>
            </div>
            <div className="divide-y border-t">
              {activeOrderData.map(
                (order: SubOrderWithItems, index: number) => (
                  <div className="p-4" key={order.id}>
                    <div className="flex items-center gap-4">
                      <OrderThumbnail order={order} />

                      <div className="w-full">
                        <div className="flex items-center gap-2 justify-between">
                          <h5 className="font-semibold ">
                            {format(
                              toZonedTime(
                                new Date(order.deliveryDate),
                                utcTimeZone
                              ),
                              "EEEE, dd MMM"
                            )}
                          </h5>

                          <OrderStatusLabel status={order.status} />
                        </div>
                        <OrderTimeSlot order={order} />
                        <div className="gap-x-1 flex items-center mt-2">
                          <Button
                            onClick={() =>
                              showOrderDetails("active", index, order.items)
                            }
                            className="text-xs p-3 h-8 shadow-sm bg-white hover:bg-gray-100 text-primary border"
                          >
                            {selectedOrder.type === "active" &&
                            selectedOrder.index === index
                              ? "Hide Order Items"
                              : "Show Order Items"}
                          </Button>
                          {isActive &&
                            (order.status === "ACCEPTED" ||
                              order.status === "SKIPPED") && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button className="text-xs p-3 h-8 shadow-sm bg-white text-primary hover:bg-gray-100 border">
                                    <Ellipsis size={18} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {order.status === "ACCEPTED" && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-pointer">
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleAddExtra(order.subOrderID)
                                              }
                                              disabled={isDisabledActions(
                                                order.deliveryDate
                                              )}
                                            >
                                              {!isUpcoming
                                                ? "Add Extra Items"
                                                : "Add/Remove Items "}
                                            </DropdownMenuItem>
                                          </div>
                                        </TooltipTrigger>
                                        {isDisabledActions(
                                          order.deliveryDate
                                        ) && (
                                          <TooltipContent>
                                            <p>Disabled now</p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {order.status === "ACCEPTED" && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-pointer">
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setOpenSwitchOrder(true);
                                                setSelectedOrderID(order.id);
                                                setCurrentOrderDate(
                                                  new Date(order.deliveryDate)
                                                );
                                              }}
                                              disabled={isDisabledActions(
                                                order.deliveryDate
                                              )}
                                            >
                                              Switch Delivery
                                            </DropdownMenuItem>
                                          </div>
                                        </TooltipTrigger>
                                        {isDisabledActions(
                                          order.deliveryDate
                                        ) && (
                                          <TooltipContent>
                                            <p>Disabled now</p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {order.status === "ACCEPTED" && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-pointer">
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setOpenSkipModal({
                                                  open: true,
                                                  type: "SKIP",
                                                  items: order.items,
                                                });
                                                setSelectedOrderID(order.id);
                                              }}
                                              disabled={isDisabledActions(
                                                order.deliveryDate
                                              )}
                                            >
                                              Skip Delivery
                                            </DropdownMenuItem>
                                          </div>
                                        </TooltipTrigger>
                                        {isDisabledActions(
                                          order.deliveryDate
                                        ) && (
                                          <TooltipContent>
                                            <p>Disabled now</p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}

                                  {order.status === "SKIPPED" && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="cursor-pointer">
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setOpenSkipModal({
                                                  open: true,
                                                  type: "UNSKIP",
                                                  items: order.items,
                                                });
                                                setSelectedOrderID(order.id);
                                              }}
                                              disabled={isDisabledActions(
                                                order.deliveryDate
                                              )}
                                            >
                                              Unskip Delivery
                                            </DropdownMenuItem>
                                          </div>
                                        </TooltipTrigger>
                                        {isDisabledActions(
                                          order.deliveryDate
                                        ) && (
                                          <TooltipContent>
                                            <p>Disabled Now</p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}

                                  {order.status === "ACCEPTED" &&
                                    !isUpcoming && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger >
                                            <div className="cursor-pointer">
                                              <DropdownMenuItem disabled>
                                                Remove Items
                                              </DropdownMenuItem>
                                            </div>
                                          </TooltipTrigger>

                                          <TooltipContent>
                                            <p>Disabled for the active week</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}

                                    
                                  {order.status === "ACCEPTED" &&
                                    isUpcoming && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger >
                                            <div className="cursor-pointer">
                                              <DropdownMenuItem
                                                // onClick={() => {
                                                //   setOpenRemoveOrderModal(true);
                                                //   setSelectedOrderID(order.id);
                                                // }}
                                              >
                                                Remove Order
                                              </DropdownMenuItem>
                                            </div>
                                          </TooltipTrigger>

                                          <TooltipContent>
                                            <p>Disabled for the active week</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedOrder.type === "active" &&
                        selectedOrder.index === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ overflow: "hidden" }}
                          >
                            <ItemDetails
                              items={selectedOrder.items}
                              orderDate={
                                order.deliveryDate.toString().split("T")[0]
                              }
                            />
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* Upcoming Order */}
        {upcomingOrderLoading && <LoadingOrder />}
        {isUpcomingOrderData && (
          <>
            <div className="bg-gray-100 p-3">
              <h4 className="font-semibold">
                Upcoming Deliveries({upcomingOrderData.length})
              </h4>
            </div>
            <div className="divide-y border-t">
              {upcomingOrderData.map(
                (order: SubOrderWithItems, index: number) => (
                  <div className=" p-4" key={order.id}>
                    <div className="flex items-center gap-4">
                      <OrderThumbnail order={order} />

                      <div className="w-full">
                        <div className="flex items-center gap-2 justify-between">
                          <h5 className="font-semibold ">
                            {format(
                              toZonedTime(new Date(order.deliveryDate), "UTC"),
                              "EEEE, dd MMM"
                            )}
                          </h5>
                          <OrderStatusLabel status={order.status} />
                        </div>
                        <OrderTimeSlot order={order} />
                        <div className="gap-x-1 flex items-center mt-2">
                          <Button
                            onClick={() =>
                              showOrderDetails("upcoming", index, order.items)
                            }
                            className="text-xs p-3 h-8 shadow-sm bg-white hover:bg-gray-100 text-primary border"
                          >
                            {selectedOrder.type === "upcoming" &&
                            selectedOrder.index === index
                              ? "Hide Order Items"
                              : "Show Order Items"}
                          </Button>

                          {isActive && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button className="text-xs p-3 h-8 shadow-sm bg-white text-primary hover:bg-gray-100 border">
                                  <Ellipsis size={18} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className=" flex flex-col gap-y-0.5">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {order.status === "ACCEPTED" && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-pointer">
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleAddExtra(order.subOrderID)
                                            }
                                            disabled={isDisabledActions(
                                              order.deliveryDate
                                            )}
                                          >
                                            {!isUpcoming
                                              ? "Add Extra Items"
                                              : "Add/Remove Items "}
                                          </DropdownMenuItem>
                                        </div>
                                      </TooltipTrigger>
                                      {isDisabledActions(
                                        order.deliveryDate
                                      ) && (
                                        <TooltipContent>
                                          <p>Disabled now</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {order.status === "ACCEPTED" && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-pointer">
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setOpenSwitchOrder(true);
                                              setSelectedOrderID(order.id);
                                              setCurrentOrderDate(
                                                new Date(order.deliveryDate)
                                              );
                                            }}
                                            disabled={isDisabledActions(
                                              order.deliveryDate
                                            )}
                                          >
                                            Switch Order Date
                                          </DropdownMenuItem>
                                        </div>
                                      </TooltipTrigger>
                                      {isDisabledActions(
                                        order.deliveryDate
                                      ) && (
                                        <TooltipContent>
                                          <p>Disabled Now</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {order.status === "ACCEPTED" && !isUpcoming && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-pointer">
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setOpenSkipModal({
                                                open: true,
                                                type: "SKIP",
                                                items: order.items,
                                              });
                                              setSelectedOrderID(order.id);
                                            }}
                                            disabled={isDisabledActions(
                                              order.deliveryDate
                                            )}
                                          >
                                            Skip Delivery
                                          </DropdownMenuItem>
                                        </div>
                                      </TooltipTrigger>
                                      {isDisabledActions(
                                        order.deliveryDate
                                      ) && (
                                        <TooltipContent>
                                          <p>Disabled now</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}

                                {order.status === "SKIPPED" && !isUpcoming && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-pointer">
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setOpenSkipModal({
                                                open: true,
                                                type: "UNSKIP",
                                                items: order.items,
                                              });
                                              setSelectedOrderID(order.id);
                                            }}
                                            disabled={isDisabledActions(
                                              order.deliveryDate
                                            )}
                                          >
                                            Unskip Delivery
                                          </DropdownMenuItem>
                                        </div>
                                      </TooltipTrigger>
                                      {isDisabledActions(
                                        order.deliveryDate
                                      ) && (
                                        <TooltipContent>
                                          <p>Disabled now</p>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}

                                {order.status === "ACCEPTED" && !isUpcoming && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-pointer">
                                          <DropdownMenuItem disabled>
                                            Remove Items
                                          </DropdownMenuItem>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Disabled for the active week</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedOrder.type === "upcoming" &&
                        selectedOrder.index === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ overflow: "hidden" }}
                          >
                            <ItemDetails
                              items={selectedOrder.items}
                              orderDate={
                                order.deliveryDate.toString().split("T")[0]
                              }
                            />
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* Delivered Order */}
        {deliveredOrderLoading && <LoadingOrder />}
        {isDeliveredOrderData && (
          <>
            <div className="bg-gray-100 p-3">
              <h4 className="font-semibold">
                Delivered Orders({deliveredOrderData.length})
              </h4>
            </div>
            <div className="divide-y border-t w-full">
              {deliveredOrderData.map(
                (order: SubOrderWithItems, index: number) => (
                  <div className=" p-4" key={order.id}>
                    <div className="flex items-center gap-4">
                      <OrderThumbnail order={order} />
                      <div className="w-full">
                        <div className="flex items-center gap-2 justify-between">
                          <h5 className="font-semibold ">
                            {format(
                              toZonedTime(
                                new Date(order.deliveryDate),
                                estTimeZone
                              ),
                              "EEEE, dd MMM"
                            )}
                          </h5>

                          <OrderStatusLabel
                            status={order.status as SubOrderStatusType}
                          />
                        </div>

                        <Button
                          onClick={() =>
                            showOrderDetails("delivered", index, order.items)
                          }
                          className="mt-3 text-xs p-3 h-8 shadow-sm bg-white hover:bg-gray-100 text-primary border"
                        >
                          {selectedOrder.type === "delivered" &&
                          selectedOrder.index === index
                            ? "Hide Order Items"
                            : "Show Order Items"}
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedOrder.type === "delivered" &&
                        selectedOrder.index === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ overflow: "hidden" }}
                          >
                            <ItemDetails
                              items={selectedOrder.items}
                              orderDate={
                                order.deliveryDate.toString().split("T")[0]
                              }
                            />
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* Delivered Order */}
        {cancelledOrderLoading && <LoadingOrder />}
        {cancelledOrderData && cancelledOrderData.length > 0 && (
          <>
            <div className="bg-gray-100 p-3">
              <h4 className="font-semibold">
                Cancelled Orders({cancelledOrderData.length})
              </h4>
            </div>
            <div className="divide-y border-t w-full">
              {cancelledOrderData.map(
                (order: SubOrderWithItems, index: number) => (
                  <div className=" p-4" key={order.id}>
                    <div className="flex items-center gap-4">
                      <OrderThumbnail order={order} />
                      <div className="w-full">
                        <div className="flex items-center gap-2 justify-between">
                          <h5 className="font-semibold ">
                            {format(
                              toZonedTime(
                                new Date(order.deliveryDate),
                                estTimeZone
                              ),
                              "EEEE, dd MMM"
                            )}
                          </h5>

                          <OrderStatusLabel
                            status={order.status as SubOrderStatusType}
                          />
                        </div>

                        <Button
                          onClick={() =>
                            showOrderDetails("cancelled", index, order.items)
                          }
                          className="mt-3 text-xs p-3 h-8 shadow-sm bg-white hover:bg-gray-100 text-primary border"
                        >
                          {selectedOrder.type === "cancelled" &&
                          selectedOrder.index === index
                            ? "Hide Order Items"
                            : "Show Order Items"}
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedOrder.type === "cancelled" &&
                        selectedOrder.index === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ overflow: "hidden" }}
                          >
                            <ItemDetails
                              items={selectedOrder.items}
                              orderDate={
                                order.deliveryDate.toString().split("T")[0]
                              }
                            />
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={openSkipModal?.open}
        onOpenChange={(open) =>
          setOpenSkipModal(open ? { ...openSkipModal!, open: true } : null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {openSkipModal?.type.toLowerCase()} this
              delivery?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleSkipUnskip(selectedOrderID, openSkipModal?.type!)
              }
            >
              {openSkipModal?.type === "SKIP"
                ? "Skip Delivery"
                : "Unskip Delivery"}
            </AlertDialogAction>
          </AlertDialogFooter>
          <p className="text-sm text-foreground text-right">
            {openSkipModal?.type === "SKIP" &&
              `Note : $${calculateTotalOfItems(openSkipModal?.items!).toFixed(
                2
              )} will be credited to your DabbahWala wallet.`}
            {openSkipModal?.type === "UNSKIP" &&
              `Note : $${calculateTotalOfItems(openSkipModal?.items!).toFixed(
                2
              )} will be debited from your DabbahWala wallet.`}
          </p>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        // open={openRemoveOrderModal}
        // onOpenChange={setOpenRemoveOrderModal}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this order?
              delivery?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              // onClick={() =>
              //   handleRemoveOrder(selectedOrderID)
              // }
            >
              Remove Order
            </AlertDialogAction>
          </AlertDialogFooter>
          <p className="text-sm text-foreground text-right">
            Note: You can't remove any order before 48 hours of .
          </p>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openSwitchOrder} onOpenChange={setOpenSwitchOrder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select the date to switch your order</DialogTitle>
            <DialogDescription>
              {availableDates.length > 0 ? (
                <div className="space-y-2 mt-4 ">
                  {availableDates.map((date: Date) => (
                    <div
                      key={date.toISOString()}
                      className={`bg-gray-100 relative font-semibold border-2 hover:border-primary p-4 rounded-md cursor-pointer ${
                        selectedOrderDate?.toISOString() === date.toISOString()
                          ? "border-primary !bg-white"
                          : "border-gray-300"
                      }`}
                      onClick={() => {
                        setSelectedOrderDate(date);
                      }}
                    >
                      {date.toDateString()}
                      {selectedOrderDate?.toISOString() ===
                      date.toISOString() ? (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-primary rounded-full p-0 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <h2 className="font-semibold">Select Delivery Window</h2>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {timeSlots?.map((slot: TimeSlotsType) => (
                      <div
                        key={slot.timeStart}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`bg-gray-100 w-full relative font-semibold border-2 hover:border-primary p-4 rounded-md cursor-pointer ${
                          selectedSlotId === slot.id
                            ? "border-primary !bg-white"
                            : "border-gray-300"
                        }`}
                      >
                        {convertToAmPm(slot.timeStart)} -{" "}
                        {convertToAmPm(slot.timeEnd)}
                        {selectedSlotId === slot.id ? (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-primary rounded-full p-0 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => {
                      handleSwitchOrder(
                        selectedOrderDate,
                        orderId,
                        currentOrderDate,
                        selectedSlotId
                      );
                    }}
                    className="mt-5"
                  >
                    Switch Order to {selectedOrderDate?.toDateString()}
                  </Button>
                </div>
              ) : (
                <p className="text-center py-4 text-lg">
                  No dates available to switch
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SubscriptionOrder;

function OrderTimeSlot({ order }: { order: SubOrderWithItems }) {
  return (
    <div>
      <p className="text-xs text-foreground mt-1">
        Delivery Window: {convertToAmPm(order.timeSlotStart)} -{" "}
        {convertToAmPm(order.timeSlotEnd)}
      </p>
    </div>
  );
}
