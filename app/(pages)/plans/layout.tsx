import { getOpenHours, getTimeSlots } from "@/app/_serverActions/main";
import { OpenHoursProvider } from "@/contexts/OpenHoursContext";
import { PlanCacheProvider } from "@/contexts/PlanCacheProvider";
import { TimeSlotsProvider } from "@/contexts/TimeSlotsProvider";
import Image from "next/image";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const timeSlots = await getTimeSlots();
  const timeSlotData = timeSlots?.data;


  return (
    <TimeSlotsProvider slots={timeSlotData}>
        <div className="w-full overflow-hidden relative  lg:min-h-screen  bg-neutral-50 ">
          <Image
            src="/images/gray-pattern.svg"
            className="absolute top-0 left-0 max-sm:w-[200px] max-sm:h-[200px]"
            alt="bg-vector"
            width={400}
            height={400}
          />
          <Image
            src="/images/6b9b941b675eea9355159312d99ad267.png"
            width={200}
            height={200}
            alt="image"
            className="hidden md:block absolute bottom-8 -left-24"
          />
          <Image
            src="/images/983d1428e64173c6623f4d07a87cb3c9.png"
            width={200}
            height={200}
            alt="image"
            className="hidden  md:block absolute bottom-36 -right-24"
          />

          <PlanCacheProvider>
            <div className="relative z-40 p-4 py-16 ">{children}</div>
          </PlanCacheProvider>
        </div>
    </TimeSlotsProvider>
  );
}
