"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import Image from "next/image";
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/helper";
import { Skeleton } from "@/components/ui/skeleton";

import { MenuItemType } from "@/types/main";
import { useDwConfig } from "@/contexts/DwConfigProvider";
import { useItems } from "@/contexts/ItemContext";
import { toZonedTime } from "date-fns-tz";
import { MenuDialog } from "@/components/Frontend/MenuDialog";
import {
  formatDateRange,
  getWeeklyRanges,
  utcTimeZone,
  
} from "@/lib/helper/dateFunctions";
import { format, parse, parseISO } from "date-fns";

function OurMenu() {
  const { dwConfig } = useDwConfig();
  const { items: menuItems } = useItems();
  const weeklyRanges = useMemo(() => getWeeklyRanges(dwConfig?.menuLoop), []);
  const [hasMore, setHasMore] = useState(true);
  const [modelOpen, setModelOpen] = useState(false);
  const [currentMenuIndex, setCurrentMenuIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const divRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const [menuCardData, setMenuCardData] = useState<MenuItemType | null>(null);

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    (index) => {
      if (index > 5) return null;
      if (index >= weeklyRanges.length || !weeklyRanges[index]) return null;
      const week = weeklyRanges[index];
      return `/api/menu/weekly?dateRange=weekly&startDate=${
        week.start.toISOString().split("T")[0]
      }&endDate=${week.end.toISOString().split("T")[0]}`;
    },
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!data) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = divRefs.current.indexOf(
              entry.target as HTMLDivElement
            );
            setActiveIndex(index);
          }
        });
      },
      { threshold: 0, rootMargin: "-50% 0px -50% 0px" }
    );

    const currentDivRefs = divRefs.current;

    currentDivRefs.forEach((div) => {
      if (div) observer.observe(div);
    });

    return () => {
      currentDivRefs.forEach((div) => {
        if (div) observer.unobserve(div);
      });
    };
  }, [data]);

  const scrollToElement = useCallback((targetDiv: HTMLElement | null) => {
    if (targetDiv) {
      const offset = 200;
      const elementPosition = targetDiv.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    if (scrollToIndex !== null && data && data[scrollToIndex]) {
      const targetDiv = document.getElementById("menu" + scrollToIndex);
      scrollToElement(targetDiv);
      setScrollToIndex(null);
    }
  }, [scrollToIndex, data, scrollToElement]);

  const fetchData = useCallback(() => {
    if (size < 5) {
      setSize(size + 1);
    } else {
      setHasMore(false);
    }
  }, [size, setSize]);

  // Flatten the data for easier navigation
  const allMenuItems = useMemo(() => {
    return data ? data.flatMap((page) => page.data) : [];
  }, [data]);

  const openMenuItem = useCallback(
    (menuItem: MenuItemType, index: number) => {
      const itemIndex = allMenuItems.findIndex((item) => item === menuItem);
      if (itemIndex !== -1) {
        setMenuCardData(menuItem);
        setModelOpen(true);
        setCurrentMenuIndex(itemIndex);
      }
    },
    [allMenuItems]
  );

  const handlePrevious = useCallback(() => {
    if (currentMenuIndex > 0) {
      const newIndex = currentMenuIndex - 1;
      setMenuCardData(allMenuItems[newIndex]);
      setCurrentMenuIndex(newIndex);
    }
  }, [currentMenuIndex, allMenuItems]);

  const handleNext = useCallback(async () => {
    if (currentMenuIndex < allMenuItems.length - 1) {
      const newIndex = currentMenuIndex + 1;
      setMenuCardData(allMenuItems[newIndex]);
      setCurrentMenuIndex(newIndex);
    } else if (size < weeklyRanges.length) {
      await setSize(size + 1);
    } else {
      setHasMore(false);
    }
  }, [currentMenuIndex, allMenuItems, size, setSize, weeklyRanges.length]);

  return (
    <div className="w-full mx-auto overflow-hidden relative bg-white py-16 pt-32">
      <div className="relative z-10 text-center mt-6 mb-12 ">
        <h1 className="text-4xl font-semibold">
          Our <span className="dw-underline1 text-second">Menu</span>
        </h1>
        <div className="mt-4 text-sm font-medium fixed top-28 left-0 w-fit right-0 mx-auto bg-white z-10 rounded-md shadow-lg shadow-black/10 overflow-hidden">
          {weeklyRanges?.map((range, index) => (
            <button
              key={index}
              className={`p-3 px-5 transition-all hover:bg-primary/70 ${
                activeIndex === index ? "bg-primary text-white" : ""
              }`}
              onClick={() => {
                setActiveIndex(index);
                if (!data || !data[index]) {
                  setSize(index + 1);
                  setScrollToIndex(index);
                } else {
                  const targetDiv = document.getElementById("menu" + index);
                  scrollToElement(targetDiv);
                }
              }}
            >
              {formatDateRange(
                toZonedTime(range.start, "America/New_York"),
                toZonedTime(range.end, "America/New_York")
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="container px-8 mx-auto">
        {data && data?.length > 0 && (
          <InfiniteScroll
            dataLength={data?.length}
            next={fetchData}
            hasMore={hasMore}
            loader={<MenuLoading />}
            endMessage={
              <p style={{ textAlign: "center" }}>
                <b>No More Menu Available</b>
              </p>
            }
          >
            {data?.map((pageData, index) => (
              <div
                key={index}
                id={"menu" + index}
                ref={(el) => {
                  divRefs.current[index] = el;
                }}
              >
                <h1 className="text-xl font-semibold mb-5">
                  Menu of{" "}
                  {formatDateRange(
                    toZonedTime(weeklyRanges[index].start, utcTimeZone),
                    toZonedTime(weeklyRanges[index].end, utcTimeZone)
                  )}
                </h1>
                {pageData.data && pageData.data.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {pageData.data.map((menuItem: any, itemIndex: number) => {
                      const parsedDate = parseISO(menuItem.date);
                      const timezonedDate = toZonedTime(parsedDate, utcTimeZone);
                      return (
                        <div
                          key={itemIndex}
                          onClick={() => openMenuItem(menuItem, itemIndex)}
                        >
                          <div className="w-full h-56 relative rounded-md overflow-hidden">
                            <Image
                              src={
                                menuItem.thumbnail
                                  ? process.env.NEXT_PUBLIC_AWS_URL +
                                    menuItem.thumbnail
                                  : "/images/placeholder.jpg"
                              }
                              alt={"Menu"}
                              width={400}
                              height={400}
                              placeholder="blur"
                              blurDataURL={
                                menuItem.thumbnail || "/images/placeholder.jpg"
                              }
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <p className="mt-3 mb-1 font-semibold">
                            <p className="mt-3 mb-1 font-semibold">
                              {format(timezonedDate, "MMMM do, yyyy")}
                            </p>
                          </p>
                          <p className="text-sm text-gray-700">
                            {menuItem.menuItems.map(
                              (item: any, index: number) => (
                                <span key={item.itemId}>
                                  {item.name}
                                  {index < menuItem.menuItems.length - 1
                                    ? ", "
                                    : ""}
                                </span>
                              )
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full border-2 border-gray-300 rounded-md py-16 mb-6">
                    <p>No Menu Found</p>
                  </div>
                )}
              </div>
            ))}
          </InfiniteScroll>
        )}
        {isLoading ? <MenuLoading /> : null}
      </div>
      {menuCardData && (
        <MenuDialog
          menuCardData={menuCardData}
          setModelOpen={setModelOpen}
          modelOpen={modelOpen}
          currentMenuIndex={currentMenuIndex}
          handlePrevious={handlePrevious}
          handleNext={handleNext}
          dataLength={allMenuItems.length}
          menuItems={menuItems}
          isTodayMenu={false}
          size={size}
          weeklyRanges={weeklyRanges}
          isMenuLoading={isValidating}
        />
      )}
    </div>
  );
}

function MenuLoading(): JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {[...Array(7)].map((_, index) => (
        <div key={index} className="flex flex-col space-y-3">
          <Skeleton className="h-[160px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full max-w-[300px]" />
            <Skeleton className="h-4 w-full max-w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default OurMenu;
