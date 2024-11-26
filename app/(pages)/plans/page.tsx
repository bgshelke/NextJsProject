import Steps from "@/components/Frontend/Steps";
import MainLayout from "./_components/MainLayout";
import { getOpenHours } from "@/app/_serverActions/main";
import { OpenHoursProvider } from "@/contexts/OpenHoursContext";

async function page() {
  const openHours = await getOpenHours();

  return (
    <div>
       <OpenHoursProvider openHours={openHours}>
      <div className="text-center w-full space-y-1 md:space-y-3 md:max-w-lg mx-auto">
        <h1 className="text-3xl font-semibold">
          Get Started With <br />
          Delicious <span>Indian </span>
          <span className="text-second dw-underline1">Meals</span>
        </h1>
        <p className="text-gray-700 max-w-sm mx-auto">
          Start your culinary journey with our authentic Indian meal plans
          delivered to your doorstep.
        </p>
        <Steps />
      </div>
      <MainLayout />
      </OpenHoursProvider>
    </div>
  );
}

export default page;
