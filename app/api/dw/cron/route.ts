

import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import Bull from "bull";
import nodemailer from "nodemailer";
import { utcTimeZone } from "@/lib/helper/dateFunctions";
import { toZonedTime } from "date-fns-tz";
import { addHours, format } from "date-fns";

const orderQueue = new Bull("orderQueue");

export async function GET(req: Request) {
  try {
    const secret = req.headers.get("Authorization");
    if (secret !== `Bearer ${process.env.ENCRYPTION_KEY}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dwConfig = await prisma.dwConfig.findUnique({
      where: {
        uniqueKey: "dwsettings",
      },
    });

    const currentDate = new Date();
    const usaTime = toZonedTime(currentDate, utcTimeZone);

    const deliveryDate = new Date(currentDate.toISOString().split("T")[0]);
    const timetoComapre = dwConfig?.timeForPreparing || 4;
    const adjustedTime = addHours(usaTime, timetoComapre);
    const timeToPrepare = format(adjustedTime, "HH:mm");


    const convertedTime = `${String(usaTime.getHours()).padStart(2, "0")}:${String(usaTime.getMinutes()).padStart(2, "0")}`;
 

    // Find and process subOrders
    const findSubOrders = await prisma.subOrders.findMany({
      where: {
        status: "ACCEPTED",
        timeSlotStart: convertedTime,
        deliveryDate,
      },
    });

    findSubOrders.forEach((order) => {
      orderQueue.add({ orderId: order.id });
    });

    // Find and process dabbah
    const findDabbah = await prisma.dabbah.findMany({
      where: {
        status: "ACCEPTED",
        timeSlotStart: convertedTime,
        deliveryDate,
      },
    });

    findDabbah.forEach((order) => {
      orderQueue.add({ orderId: order.id });
    });

    // Find and process guestDabbah
    const findGuestDabbah = await prisma.guestDabbah.findMany({
      where: {
        status: "ACCEPTED",
        timeSlotStart: convertedTime,
        deliveryDate,
      },
    });

    findGuestDabbah.forEach((order) => {
      orderQueue.add({ orderId: order.id });
    });

    if (!findGuestDabbah && !findSubOrders && !findDabbah) {
      return NextResponse.json(
        { message: "No Orders found" + deliveryDate.toString() },
        { status: 200 }
      );
    }

    // Process the queue
    orderQueue.process(async (job) => {
      const { orderId } = job.data;
      await prisma.subOrders.update({
        where: { id: orderId },
        data: { status: "PREPARING" },
      });
      await prisma.dabbah.update({
        where: { id: orderId },
        data: { status: "PREPARING" },
      });
      await prisma.guestDabbah.update({
        where: { id: orderId },
        data: { status: "PREPARING" },
      });
    });

    return NextResponse.json(
      { message: "Changed to preparing" },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ message: "Error", e }, { status: 500 });
  }
}
