import prisma from "@/lib/db";


export async function getItems() {
  await prisma.$connect();
  const mymenu = await prisma.item.findMany({
    select: {
      id: true,
      itemName: true,
      mealPreference: true,
      unit: true,
      unitType: true,
      planType: true,
      thumbnail: true,
      price: true,
    },
  });
  if (!mymenu) {
    return null;
  }
  return { data: mymenu };

}


export async function getTimeSlots() {
  const timeSlots = await fetch(
    process.env.NEXT_PUBLIC_URL + "/api/dw?get=timeslots",
    {
      cache: "no-cache",
    }
  );
  const data = await timeSlots.json();
  return data;
}

export async function getOpenHours() {
  const res = await fetch(
    process.env.NEXT_PUBLIC_URL + "/api/dw?get=openhours",
    {
      next: { revalidate: 0 },
    }
  );
  const data = await res.json();
  return data?.data || [];
}

export async function getDwConfig() {
  try {
    const dwConfig = await prisma.dwConfig.findUnique({
      where: {
        uniqueKey: "dwsettings",
      },
    });
    if (!dwConfig) {
      return null;
    }
    return { data: dwConfig };
  } catch (error) {
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

export async function UpdatePaymentInfo() {
  const response = await fetch(
    process.env.NEXT_PUBLIC_URL + "/api/customer/profile/manage-payment-info",
    {
      method: "GET",
    }
  );

  const getResponse = await response.json();

  if (getResponse.success) {
    return getResponse.data;
  } else {
    throw new Error(
      getResponse.message || "Something went wrong. Please try again"
    );
  }
}
