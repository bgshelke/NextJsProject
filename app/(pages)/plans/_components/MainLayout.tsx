"use client";
import React, { Suspense, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useLayoutEffect, useState } from "react";
import ItemsOverviewTable from "./ItemOverviewTable";
import PlanSelector from "./PlanSelector";
import PlanOverview from "./PlanOverview";
import { useTimeSlots } from "@/contexts/TimeSlotsProvider";
import { utcTimeZone } from "@/lib/helper/dateFunctions";
import { useOrderType, useSelectedSubDayDate } from "@/stores/plan/usePlanStore";
import { toZonedTime } from "date-fns-tz";
import { useDayMenu } from "@/contexts/DayMenuProvider";
function MainLayout() {

  const timeSlotData = useTimeSlots();
  const { scrollY } = useScroll();
  const [divHeight, setDivHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const divRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);



  useLayoutEffect(() => {
    if (!divRef.current || !containerRef.current) return;

    const updateHeights = () => {
      if (divRef.current) {
        const height = divRef.current.getBoundingClientRect().height;
        setDivHeight(height);
      }
      if (containerRef.current) {
        const height = containerRef.current.getBoundingClientRect().height;
        setContainerHeight(height);
      }
    };

    updateHeights();

    const resizeObserver = new ResizeObserver(() => {
      updateHeights();
    });

    resizeObserver.observe(divRef.current);
    resizeObserver.observe(containerRef.current);

    window.addEventListener("resize", updateHeights);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeights);
    };
  }, []);

  const y = useTransform(scrollY, (value) => {
    if (!containerHeight || !divHeight) return 0;

    const containerTop = containerRef.current?.getBoundingClientRect().top ?? 0;

    const topPadding = 60;

    if (containerTop > window.innerHeight) return 0;

    const containerOffset = containerRef.current?.offsetTop ?? 0;
    const scrollStart = Math.max(0, value - containerOffset + topPadding);

    const maxScroll = Math.max(0, containerHeight - divHeight);

    return Math.min(Math.max(0, scrollStart), maxScroll);
  });

  return (
    <div className="flex flex-col md:flex-row justify-center mt-12 items-stretch max-w-7xl mx-auto gap-6">
      <div className="bg-white p-6 sm:p-8 rounded-md md:w-3/4 flex-shrink-0">
        <PlanSelector slots={timeSlotData.timeslots} />

        <Suspense fallback={<p>Loading...</p>}>
          <ItemsOverviewTable/>
        </Suspense>
      </div>

      <div
        ref={containerRef}
        className="relative flex-shrink-0 sm:w-1/4 rounded-md"
        style={{ minHeight: divHeight || "auto" }}
      >
        <motion.div
          ref={divRef}
          className="sm:w-full bg-white w-full"
          style={{
            y,
            position: "relative",
            zIndex: 1,
          }}
          initial={{ y: 0 }}
          animate={{ y: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
          }}
        >
          <PlanOverview />
        </motion.div>
      </div>
    </div>
  );
}

export default MainLayout;
