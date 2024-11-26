"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import Image from "next/image";
import { Item, MenuItemType } from "@/types/main";
import { Loader2 } from "lucide-react";
import PreferenceIcon from "../ui/PreferenceIcon";
import { toZonedTime } from "date-fns-tz";
import { formatDateRange } from "@/lib/helper/dateFunctions";
import { format } from "date-fns";

export function MenuDialog({
  menuCardData,
  setModelOpen,
  modelOpen,
  currentMenuIndex,
  handlePrevious,
  handleNext,
  dataLength,
  menuItems,
  isTodayMenu,
  size,
  weeklyRanges,
  isMenuLoading,
}: {
  menuCardData: MenuItemType;
  setModelOpen: (open: boolean) => void;
  modelOpen: boolean;
  currentMenuIndex?: number;
  handlePrevious?: () => void;
  handleNext?: () => void;
  dataLength?: number;
  menuItems: Item[];
  isTodayMenu: boolean;
  size: number;
  weeklyRanges: { start: Date; end: Date }[];
  isMenuLoading: boolean;
}) {
  return (
    <Dialog
      open={modelOpen}
      onOpenChange={setModelOpen}
      data-test="menu-dialog"
    >
      <DialogContent className="md:min-w-[600px]">
        {menuCardData && (
          <DialogHeader>
            <DialogTitle>
              {isTodayMenu ? (
                "Today's Menu"
              ) : (
                <>Menu of {format(toZonedTime(menuCardData.date, "UTC"), "EEEE, MMMM d")}</>
              )}
            </DialogTitle>
            <DialogDescription>
              <div className="w-full h-72 relative mt-4 mb-4 rounded-md overflow-hidden">
                <Image
                  src={
                    menuCardData.thumbnail
                      ? process.env.NEXT_PUBLIC_AWS_URL + menuCardData.thumbnail
                      : "/images/placeholder.png"
                  }
                  alt={"Menu"}
                  width={800}
                  height={800}
                  placeholder="blur"
                  blurDataURL={
                    menuCardData.thumbnail
                      ? process.env.NEXT_PUBLIC_AWS_URL + menuCardData.thumbnail
                      : "/images/placeholder.png"
                  }
                  className="w-full h-full object-cover rounded-md"
                />
              </div>

              <div className="grid grid-cols-2">
                {menuCardData.menuItems
                  .map((menuItem) => {
                    const index = menuItems.findIndex(
                      (item) => item.id === menuItem.itemId
                    );
                    return { menuItem, index };
                  })
                  .sort((a, b) => a.index - b.index)
                  .map(({ menuItem }) => {
                    const item = menuItems.find(
                      (item) => item.id === menuItem.itemId
                    );

                    if (!item) return null;

                    return (
                      <div
                        key={item.id}
                        className="justify-between flex p-3 border-b"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-11 h-11 rounded-md overflow-hidden bg-gray-100 relative">
                            <Image
                              src={
                                item?.thumbnail
                                  ? process.env.NEXT_PUBLIC_AWS_URL +
                                    item.thumbnail
                                  : "/images/placeholder.png"
                              }
                              alt={item.itemName || "Menu Item"}
                              width={100}
                              className="w-full h-full object-contain"
                              height={100}
                              priority={true}
                            />
                            <PreferenceIcon
                              preference={item.mealPreference || "VEG"}
                              className="absolute bottom-0 left-0 h-4 w-4"
                            />
                          </div>

                          <div className="text-left">
                            <p className="font-semibold text-black">
                              {menuItem.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {item.itemName}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {menuCardData?.description &&
                menuCardData?.description?.length > 0 && (
                  <p className="mt-4">{menuCardData.description}</p>
                )}

              <div className="flex items-center justify-center gap-6 mt-6">
                {!isTodayMenu && (
                  <button
                    onClick={handlePrevious}
                    className="text-gray-900 font-semibold disabled:opacity-40"
                    disabled={currentMenuIndex === 0}
                  >
                    Previous
                  </button>
                )}

                <Link href="/plans">
                  <button className="btn-secondary">Order Now</button>
                </Link>

                {!isTodayMenu && (
                  <button
                    onClick={handleNext}
                    className={`text-gray-900 font-semibold disabled:opacity-40 flex items-center  ${
                      isMenuLoading ? "cursor-wait" : ""
                    }`}
                    disabled={
                      currentMenuIndex === undefined ||
                      (currentMenuIndex >= (dataLength || 0) - 1 &&
                        size >= weeklyRanges.length) ||
                      isMenuLoading
                    }
                  >
                    {isMenuLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      "Next"
                    )}
                  </button>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}
