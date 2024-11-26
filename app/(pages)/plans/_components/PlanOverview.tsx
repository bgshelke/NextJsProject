"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCheckoutPlanStore,
  useDeliveryDayStore,
  useFinalOrderStore,
  useKitchenOption,
  useOrderType,
  usePickUpOption,
  usePlanItemsStore,
  usePlanStore,
  useSubscriptionDaysStore,
} from "@/stores/plan/usePlanStore";
import { ArrowLeft, ArrowRight, CircleHelp } from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import SelectPlan from "./SelectPlan";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Item, MenuType, UserSelectedPlan } from "@/types/main";
import useSWR from "swr";
import { fetcher, getPricingLabel, MINIMUM_CHARGE_AMOUNT } from "@/lib/helper";
import PreferenceIcon from "./PreferenceIcon";
import Alert from "@/components/ui/customAlert";
import {
  usePaymentSuccess,
  usePlanAlert,
  useRedirectStore,
  useTaxRate,
} from "@/stores/useOptions";
import { Kitchen } from "@prisma/client";
import { convertToAmPm, getWeekDates } from "@/lib/helper/dateFunctions";
import { parse } from "date-fns";
import { useKitchens } from "@/contexts/KitchenContext";
import { useDwConfig } from "@/contexts/DwConfigProvider";
import { format } from "date-fns";
import useDeliveryInfo from "@/stores/useDeliveryInfo";
import { useTimeSlots } from "@/contexts/TimeSlotsProvider";
import { useWallet } from "@/contexts/WalletContext";

function PlanOverview({
  couponApplied,
  discountType,
  discountValue,
  checkoutPlan,
}: {
  couponApplied?: boolean;
  discountType?: string;
  discountValue?: number;
  checkoutPlan?: UserSelectedPlan | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { paymentSuccess } = usePaymentSuccess();
  const { data: session } = useSession();
  const { kitchens } = useKitchens();
  const { wallet ,useWalletCredit} = useWallet();
  const { items, setEditMode } = usePlanItemsStore();
  const { timeslots } = useTimeSlots();
  const { selectedDeliveryOption } = usePickUpOption();
  const { dwConfig } = useDwConfig();
  const { planType, oneTimeOrderOption } = useOrderType();
  const { selectedSubscriptionDays, updateSubscriptionDay } =
    useSubscriptionDaysStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { planAlert, setPlanAlert, clearAlert } = usePlanAlert();
  const { setCheckoutPlan } = useCheckoutPlanStore();
  const { setFinalOrder } = useFinalOrderStore();
  const { selectedPlan } = usePlanStore();
  const { taxRate } = useTaxRate();
  const { selectedDeliveryDate } = useDeliveryDayStore();
  const { selectedKitchen } = useKitchenOption();
  const allDaysItemTotal = useMemo(() => {
    const total = selectedSubscriptionDays.reduce((acc, day) => {
      const dayTotal = day.items.reduce((dayAcc, item) => {
        return dayAcc + (item.price || 0) * (item.quantity || 0);
      }, 0);
      return acc + dayTotal;
    }, 0);
    return total;
  }, [selectedSubscriptionDays, updateSubscriptionDay]);

  const date = new Date().toISOString().split("T")[0];
  const { data: menuoftheday } = useSWR(
    `/api/menu/by-date?date=${date}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const todayMenuData = menuoftheday?.data || [];
  const oneTimeOption = useMemo(
    () =>
      oneTimeOrderOption?.orderType == "ORDERNOW" ||
      oneTimeOrderOption?.orderType == "SCHEDULED",
    [oneTimeOrderOption]
  );
  const { addressInfo } = useDeliveryInfo();
  const subscriptionTotal = useMemo(() => allDaysItemTotal, [allDaysItemTotal]);

  const itemTotal = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
        0
      ),
    [items]
  );

  useEffect(() => {
    if (planAlert) {
      const timer = setTimeout(() => {
        clearAlert();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [planAlert]);

  const subtotal = planType === "SUBSCRIPTION" ? subscriptionTotal : itemTotal;

  const mySubDay =
    planType === "SUBSCRIPTION" ? selectedSubscriptionDays.length : 1;
  let deliveryCharges = useMemo(
    () =>
      subtotal >= (dwConfig?.maxAmountForFreeDelivery || 100)
        ? 0
        : mySubDay * (dwConfig?.deliveryFees || 5),
    [subtotal, mySubDay, dwConfig]
  );

  if (planType === "ONETIME" && selectedDeliveryOption === "PICKUP") {
    deliveryCharges = 0;
  }
  if (planType === "ONETIME" && selectedDeliveryOption !== "PICKUP") {
    deliveryCharges = dwConfig?.deliveryFees || 5;
  }

  const stikeThrough = useMemo(
    () => mySubDay * (dwConfig?.deliveryFees || 5) || 0,
    [dwConfig, planType, mySubDay]
  );
  const tax = subtotal * (taxRate / 100 || 0);
  const total = subtotal + deliveryCharges + tax;
  const totalAfterDiscount = useMemo(() => {
    return (
      total -
      (discountType === "amount"
        ? discountValue ?? 0
        : total * ((discountValue ?? 0) / 100))
    );
  }, [total, discountType, discountValue]);

  const usableWalletAmount = useMemo(() => {
    if (!useWalletCredit || !wallet) return 0;
    let usableAmount = Math.min(wallet, total);
    if ((total - usableAmount) > 0 && (total - usableAmount) < MINIMUM_CHARGE_AMOUNT) {
      usableAmount = Math.max(0, total - MINIMUM_CHARGE_AMOUNT);
    }
    return usableAmount;
  }, [wallet, total, useWalletCredit]);

  const finalTotal = totalAfterDiscount - (useWalletCredit ? usableWalletAmount : 0);

  const onSubmitPlan = useCallback(() => {
    setCheckoutPlan(null);
    if (!SelectPlan) {
      setPlanAlert({
        type: "error",
        message: "Please select a plan",
      });
      return;
    }

    if (!planType) {
      setPlanAlert({
        type: "error",
        message: "Please select a plan type",
      });

      return;
    }

    if (planType === "ONETIME") {
      const itemswithQuantity = items
        .filter((item) => item.quantity && item.quantity > 0)
        .map((item) => ({
          ...item,
          quantity: item.quantity,
        }));
      if (itemswithQuantity.length === 0) {
        setPlanAlert({
          type: "error",
          message: "Please select at least one item",
        });

        return;
      }

      if (!oneTimeOption) {
        setPlanAlert({
          type: "error",
          message: "Please select how you'll receive your order?",
        });

        return;
      }

      if (oneTimeOption && !selectedDeliveryOption) {
        setPlanAlert({
          type: "error",
          message: "Please select a delivery option",
        });

        return;
      }

      if (!oneTimeOrderOption?.orderDate) {
        setPlanAlert({
          type: "error",
          message: "Please select a date",
        });
        return;
      }

      if (
        oneTimeOption &&
        !oneTimeOrderOption?.slotId &&
        selectedDeliveryOption === "DELIVERY"
      ) {
        setPlanAlert({
          type: "error",
          message: "Please select a delivery window",
        });
        return;
      }

      if (
        oneTimeOption &&
        selectedDeliveryOption === "PICKUP" &&
        !oneTimeOrderOption?.pickupTime
      ) {
        setPlanAlert({
          type: "error",
          message: "Please select a pickup time",
        });

        return;
      }

      if (selectedDeliveryOption === "PICKUP" && !selectedKitchen) {
        setPlanAlert({
          type: "error",
          message: "Please select a pickup location",
        });

        return;
      }

      setFinalOrder({
        items: itemswithQuantity,
        oneTimeOrder: {
          orderType: oneTimeOrderOption?.orderType,
          orderDate: oneTimeOrderOption?.orderDate?.toISOString(),
          slotId: oneTimeOrderOption?.slotId || undefined,
          pickupTime: oneTimeOrderOption?.pickupTime || undefined,
          pickupOption: selectedDeliveryOption,
          selectedKitchenId: selectedKitchen || undefined,
        },
        selectedPlan,
        planType,
        deliveryFees: deliveryCharges,
        subTotal: subtotal,
      });

      if (session?.user) {
        router.push("/plans/checkout");
      } else {
        router.push("/plans/register?return=true");
      }
    } else if (planType === "SUBSCRIPTION") {
      if (!selectedDeliveryDate) {
        setPlanAlert({
          type: "error",
          message: "Please select a delivery date",
        });

        return;
      }
      if (selectedSubscriptionDays.length < 1) {
        setPlanAlert({
          type: "error",
          message: "Please select at least one day",
        });

        return;
      }
      const filterQty = selectedSubscriptionDays.filter(
        (day) => day.items.length > 0
      );

      if (filterQty.length < 1) {
        setPlanAlert({
          type: "error",
          message: "Please add at least one day",
        });

        return;
      }
      const filterWithQuantity = filterQty.map((day) => ({
        ...day,
        items: day.items.filter((item) => item.quantity && item.quantity > 0),
      }));
      if (filterWithQuantity.some((day) => day.items.length === 0)) {
        setPlanAlert({
          type: "error",
          message: "Please add at least one item",
        });

        return;
      }

      setFinalOrder({
        subscriptionOrder: {
          selectedDays: filterWithQuantity,
          deliveryDate: selectedDeliveryDate,
        },
        selectedPlan,
        planType,
        deliveryFees: deliveryCharges,
        subTotal: subtotal,
      });

      router.push("/plans/weekly-overview");
    }
  }, [
    setCheckoutPlan,
    SelectPlan,
    selectedDeliveryDate,
    selectedSubscriptionDays,
    items,
    planType,
    oneTimeOption,
    oneTimeOrderOption,
    selectedDeliveryOption,
    selectedKitchen,
    setFinalOrder,
    selectedPlan,
    deliveryCharges,
    session,
    router,
    totalAfterDiscount,
    subtotal,
    discountType,
    discountValue,
    checkoutPlan,
  ]);

  useEffect(() => {
    if (planType) {
      setEditMode(false);
    }
  }, [planType]);

  const GetBackPath = () => {
    let redirectUrl = "/plans";
    if (planType === "SUBSCRIPTION" && pathname === "/plans/checkout") {
      redirectUrl = "/plans/weekly-overview";
    } else if (pathname === "/plans/weekly-overview") {
      redirectUrl = "/plans/";
    } else if (planType !== "SUBSCRIPTION" && pathname === "/plans/checkout") {
      redirectUrl = "/plans/";
    } else if (pathname === "/plans/checkout/payment") {
      redirectUrl = "/plans/checkout";
    } else if (planType === "ONETIME" && pathname === "/plans/guest") {
      redirectUrl = "/plans/";
    } else if (
      planType !== "SUBSCRIPTION" &&
      pathname === "/plans/guest/checkout"
    ) {
      redirectUrl = "/plans/guest";
    } else {
      redirectUrl = "/plans/";
    }
    router.push(redirectUrl);
  };

  const servingsData = useMemo(() => {
    let totalCost = 0;
    let totalServings = 0;

    selectedSubscriptionDays.forEach((day) => {
      let dailyServings = {
        curryAndDal: 0,
        rotiAndRice: 0,
      };

      day.items.forEach((item) => {
        const { quantity = 0, price: itemPrice = 0 } = item;
        const itemName = item?.itemName?.toLowerCase();

        if (itemName?.includes("non-veg curry")) {
          dailyServings.curryAndDal += quantity * 2;
        } else if (
          itemName?.includes("veg curry") &&
          !itemName?.includes("non-veg curry")
        ) {
          dailyServings.curryAndDal += quantity * 2;
        } else if (itemName?.includes("dal")) {
          dailyServings.curryAndDal += quantity * 2;
        } else if (itemName?.includes("rice")) {
          dailyServings.rotiAndRice += quantity * 4;
        } else if (itemName?.includes("roti")) {
          dailyServings.rotiAndRice += quantity * 2;
        }

        totalCost += quantity * itemPrice;
      });

      const minServings = Math.max(
        dailyServings.curryAndDal,
        dailyServings.rotiAndRice
      );
      totalServings += minServings;
    });

    const costPerServing = totalServings > 0 ? totalCost / totalServings : 0;

    const servingsPerDay =
      selectedSubscriptionDays.length > 0
        ? totalServings / selectedSubscriptionDays.length
        : 0;

    return {
      costPerServing,
      totalServings,
      servingsPerDay,
    };
  }, [selectedSubscriptionDays]);

  function goNextSubscription() {
    if (session?.user) {
      router.push("/plans/checkout");
    } else {
      router.push("/plans/register?return=true");
    }
  }

  if (paymentSuccess && pathname.startsWith("/plans/guest/success")) {
    return (
      <>
        <div className="bg-white  p-4 rounded-md ">
          <h1 className="text-lg font-semibold">Order Overview</h1>
          <hr className="my-3 border-gray-200" />
          {selectedKitchen &&
            planType === "ONETIME" &&
            selectedDeliveryOption === "PICKUP" && (
              <div>
                <div className="space-y-2 text-sm">
                  <h2 className="text-base font-semibold mb-2">
                    Pickup Location:
                  </h2>
                  {kitchens
                    .filter(
                      (kitchen: Kitchen) => kitchen.id === selectedKitchen
                    )
                    .map((kitchen: Kitchen) => {
                      return (
                        <div className="space-y-2 text-sm" key={kitchen.id}>
                          <p className="font-semibold">{kitchen.name}</p>
                          <p>{kitchen.address}</p>
                          <p>Contact: {kitchen.phone}</p>
                        </div>
                      );
                    })}
                  <h2 className="text-base font-semibold mb-2">Pickup Time:</h2>
                  <p>
                    {oneTimeOrderOption?.orderDate
                      ? format(oneTimeOrderOption.orderDate, "MMM d, yyyy")
                      : ""}{" "}
                    | {oneTimeOrderOption?.pickupTime && convertToAmPm(oneTimeOrderOption?.pickupTime)}
                  </p>
                </div>
              </div>
            )}

          {planType === "ONETIME" && selectedDeliveryOption === "DELIVERY" && (
            <div>
              <div className="space-y-2 text-sm">
                <h2 className="text-base font-semibold mb-2">
                  Delivery Address:
                </h2>
                <p>
                  {addressInfo?.shippingInfo.addressLine1},{" "}
                  {addressInfo?.shippingInfo.city},{" "}
                  {addressInfo?.shippingInfo.state},{" "}
                  {addressInfo?.shippingInfo.zipCode}
                </p>

                <h2 className="text-base font-semibold mb-2">Delivery Time:</h2>
                <p>
                  {oneTimeOrderOption?.orderDate
                    ? format(oneTimeOrderOption.orderDate, "MMM d, yyyy")
                    : ""}{" "}
                  | {oneTimeOrderOption?.slotId && (() => {
    const slot = timeslots.find((slot) => slot.id === oneTimeOrderOption?.slotId);
    return slot?.timeStart && slot?.timeEnd ? 
      `${convertToAmPm(slot.timeStart)} - ${convertToAmPm(slot.timeEnd)}` : 
      null;
  })()}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-100  p-4 rounded-md mt-3 ">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <CircleHelp />
            Support
          </h1>
          <hr className="my-3 border-gray-200" />
          <h1>For Help Contact Us</h1>
          <p className="mt-2 text-sm">
            <span className="font-semibold">Email</span>: support@dabbahwala.com
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="bg-white  p-4 rounded-md ">
      <h1 className="text-lg font-semibold">Order Overview</h1>
      <hr className="my-3 border-gray-200" />

      {selectedKitchen &&
        planType === "ONETIME" &&
        selectedDeliveryOption === "PICKUP" && (
          <div>
            <div className="space-y-2 text-sm">
              <h2 className="text-base font-semibold mb-2">Pickup Location:</h2>
              {kitchens
                .filter((kitchen: Kitchen) => kitchen.id === selectedKitchen)
                .map((kitchen: Kitchen) => {
                  return (
                    <div className="space-y-2 text-sm" key={kitchen.id}>
                      <p className="font-semibold">{kitchen.name}</p>
                      <p>{kitchen.address}</p>
                      <p>Contact: {kitchen.phone}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      <Table>
        {planType === "ONETIME" && (
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
            </TableRow>
          </TableHeader>
        )}
        <TableBody className="font-medium">
          {planType === "ONETIME" &&
            items
              .filter((item: Item) => item.quantity && item.quantity > 0)
              .map((item: Item, index: number) => {
                const menu = todayMenuData.find(
                  (menu: MenuType) => menu.itemId === item.id
                );
                return (
                  <TableRow key={index}>
                    <TableCell className="py-2 flex items-center gap-2">
                      {item.thumbnail && (
                        <div className="w-11 h-11 rounded-md overflow-hidden bg-gray-100 relative">
                          <Image
                            src={
                              item.thumbnail
                                ? process.env.NEXT_PUBLIC_AWS_URL +
                                  item.thumbnail
                                : "/images/placeholder.png"
                            }
                            alt={item.itemName || "item"}
                            width={100}
                            className="w-full h-full object-contain"
                            height={100}
                            priority={true}
                          />

                          <PreferenceIcon
                            preference={item.mealPreference || "VEG"}
                            className="absolute bottom-0 left-0 h-3 w-3"
                          />
                        </div>
                      )}
                      <div className="space-y-[1px]">
                        <p className="text-sm font-medium">
                          {menu?.name || "Menu not available"}
                        </p>
                        <p className="text-xs text-gray-500">{item.itemName}</p>
                        <div className="flex items-center gap-2 pt-[2px]">
                          <div className="text-second py-[2px] font-semibold rounded-full max-w-fit text-xs">
                            {getPricingLabel(item.price || 0)}
                          </div>
                          {item.unit && (
                            <p className="text-xs text-gray-500">
                              {item.unit}
                              {item.unitType}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className=" rounded-md inline-flex items-center justify-end gap-x-2 overflow-hidden">
                        x{item.quantity || 0}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          {planType === "SUBSCRIPTION" && (
            <TableRow className="border-none mt-3">
              <TableCell className="py-2">
                <span className="font-semibold">Days on week</span>:{" "}
              </TableCell>
              <TableCell className="text-right">
                x{selectedSubscriptionDays.length}
              </TableCell>
            </TableRow>
          )}
          {planType === "SUBSCRIPTION" &&
            pathname.startsWith("/plans/checkout/payment") && (
              <>
                <TableRow className="border-none">
                  <TableCell className="font-semibold">
                    Total Servings
                  </TableCell>
                  <TableCell className="text-right">
                    {servingsData.totalServings}
                  </TableCell>
                </TableRow>
                <TableRow className="border-none">
                  <TableCell className="font-semibold">
                    Cost per Serving
                  </TableCell>
                  <TableCell className="text-right">
                    ${servingsData.costPerServing.toFixed(2)}
                  </TableCell>
                </TableRow>
              </>
            )}
          <TableRow className="border-none">
            <TableCell className="font-semibold">Subtotal</TableCell>
            <TableCell className="text-right">
              {getPricingLabel(subtotal)}
            </TableCell>
          </TableRow>
          {(planType === "SUBSCRIPTION" ||
            (planType === "ONETIME" &&
              selectedDeliveryOption === "DELIVERY")) &&
            subtotal > 0 && (
              <TableRow className="border-none">
                <TableCell className="font-semibold">
                  Delivery Charges
                </TableCell>

                <TableCell className="text-right space-x-2">
                  {deliveryCharges == 0 && (
                    <span className="text-red-700 font-semibold line-through">
                      {getPricingLabel(stikeThrough)}
                    </span>
                  )}

                  {deliveryCharges ? (
                    <span className="text-red-700 font-semibold">
                      {getPricingLabel(deliveryCharges)}
                    </span>
                  ) : (
                    <span className="text-green-700 font-semibold">FREE</span>
                  )}
                </TableCell>
              </TableRow>
            )}
          {taxRate !== 0 && taxRate !== undefined && (
            <TableRow className="border-none">
              <TableCell className="font-semibold">
                Tax{"(" + taxRate + "%)"}
              </TableCell>
              <TableCell className="text-right">
                {getPricingLabel(subtotal * (taxRate / 100))}
              </TableCell>
            </TableRow>
          )}

          {couponApplied && (
            <TableRow className="border-none">
              <TableCell className="font-semibold">Discount</TableCell>
              <TableCell className="text-right text-destructive">
                {discountType === "amount"
                  ? `-$${discountValue}`
                  : `-${discountValue}%`}
              </TableCell>
            </TableRow>
          )}
          {useWalletCredit && usableWalletAmount > 0 && (
            <TableRow className="border-none">
              <TableCell className="font-semibold">Wallet Credit</TableCell>
              <TableCell className="text-right text-destructive">
                {`-${getPricingLabel(usableWalletAmount)}`}
              </TableCell>
            </TableRow>
          )}
          <TableRow className="border-none">
            <TableCell className="font-bold text-sm text-primary">
              Total
            </TableCell>
            <TableCell className="text-right font-bold">
              {getPricingLabel(finalTotal || 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="mt-4">
        {planType === "SUBSCRIPTION" && pathname === "/plans" && (
          <div className="mb-4">
            <p className="capitalize text-sm">
              {subtotal < (dwConfig?.maxAmountForFreeDelivery || 100) ? (
                <>
                  Add{" "}
                  <span className="font-semibold text-primary">
                    {getPricingLabel(
                      (dwConfig?.maxAmountForFreeDelivery || 100) - subtotal
                    )}
                  </span>{" "}
                  more to get free delivery.
                </>
              ) : (
                <>
                  <span className="text-primary font-semibold">Congrats!</span>{" "}
                  You are eligible for{" "}
                  <span className="text-primary font-semibold">
                    Free delivery
                  </span>
                </>
              )}
            </p>
            <Progress
              value={
                subtotal > (dwConfig?.maxAmountForFreeDelivery || 100)
                  ? 100
                  : subtotal
              }
              max={dwConfig?.maxAmountForFreeDelivery || 100}
              className="w-full h-2 mx-auto mt-4"
            />
          </div>
        )}
      </div>
      {planType === "SUBSCRIPTION" && selectedDeliveryDate && (
        <div className="flex gap-x-1 font-medium text-center my-6">
          {getWeekDates(
            parse(selectedDeliveryDate, "yyyy-MM-dd", new Date())
          ).map((day, index) => {
            const subscriptionDay = day as Date;
            const isSelected = selectedSubscriptionDays.some(
              (subDay) =>
                new Date(subDay.date).toISOString() ===
                subscriptionDay.toISOString()
            );
            return (
              <div
                key={index}
                className={`bg-white border border-gray-300 p-2 text-sm shadow-md rounded-sm w-full ${
                  isSelected
                    ? "!bg-primary text-white font-semibold"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {new Date(day)
                  .toLocaleDateString("en-US", { weekday: "short" })
                  .slice(0, 1)}
              </div>
            );
          })}
        </div>
      )}

      {planAlert.message !== "" && pathname === "/plans" && (
        <Alert
          variant={planAlert.type}
          message={planAlert.message}
          className="max-w-sm mx-auto mb-2"
        />
      )}
      <div
        className={`flex ${
          pathname === "/plans" ? "justify-end" : "justify-between"
        }`}
      >
        {pathname !== "/plans" && (
          <Button onClick={() => GetBackPath()}>
            <ArrowLeft size={17} className="mr-2" /> Go Back
          </Button>
        )}

        {pathname === "/plans/weekly-overview" && (
          <Button onClick={goNextSubscription}>
            Checkout <ArrowRight size={17} />
          </Button>
        )}

        {pathname === "/plans" && (
          <Button
            onClick={() => {
              planType === "SUBSCRIPTION" &&
              subtotal < (dwConfig?.maxAmountForFreeDelivery || 100) &&
              subtotal > (dwConfig?.maxAmountForFreeDelivery || 100) - 75
                ? setDialogOpen(true)
                : onSubmitPlan();
            }}
          >
            Checkout <ArrowRight size={17} />
          </Button>
        )}
      </div>

      {planType === "SUBSCRIPTION" && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="p-0 flex">
            <div className="w-1/3 bg-primary  rounded-md overflow-hidden">
              <Image
                src="/images/pexels-dhiraj-jain-207743066-12737917.jpg"
                alt="free delivery"
                className="w-full h-full object-cover"
                width={400}
                height={400}
              />
            </div>
            <div className="w-2/3 py-12 px-8">
              <h1 className="text-black font-extrabold text-3xl mb-3 uppercase">
                Free Delivery
              </h1>
              <p className="text-gray-500">
                {subtotal < 100 && subtotal > 75
                  ? `Add ${getPricingLabel(
                      (dwConfig?.maxAmountForFreeDelivery || 100) - subtotal
                    )} item more to get free delivery`
                  : `Order over ${getPricingLabel(
                      dwConfig?.maxAmountForFreeDelivery || 100
                    )} and get free delivery`}
              </p>
              <div className="flex flex-col lg:flex-row items-center lg:gap-2">
                <button
                  className="bg-gray-50 p-2.5 px-6 text-gray-800 border rounded-full mt-4 text-sm"
                  onClick={() => {
                    setDialogOpen(false);
                    onSubmitPlan();
                  }}
                >
                  No Thanks
                </button>
                <button
                  className="bg-primary p-2.5 px-6 text-white rounded-full mt-4 text-sm"
                  onClick={() => setDialogOpen(false)}
                  data-test="add-item-more-btn"
                >
                  Add{" "}
                  {getPricingLabel(
                    (dwConfig?.maxAmountForFreeDelivery || 100) - subtotal
                  )}{" "}
                  Item More
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default PlanOverview;
