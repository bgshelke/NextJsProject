import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import prisma from "@/lib/db";
import Link from "next/link";
import React, { lazy, Suspense } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DeliveriesTable from "../../deliveries/DeliveriesTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PickupTable from "../../pickup-orders/PickupTable";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ShippingInfo } from "@prisma/client";
const CouponsTable = lazy(() => import('./_compo/CouponTable'));
const SavedAddressesTable = lazy(() => import('./_compo/SavedAddressesTable'));
interface Address {
    id: string;
    shippingInfo: ShippingInfo;
    addressType: string;
  }
  

async function Page({ params }: { params: { customerid: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session?.user.role === "CUSTOMER") {
    return redirect("/login");
  }
  const findCustomer = await prisma.customer.findUnique({
    where: {
      id: params.customerid,
    },
    select: {
      id: true,
      orders: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      wallet: true,
      appleId: true,
      googleId: true,
      createdAt: true,
    },
  });

  const pickups = await prisma.pickupOrder.count({
    where: {
      order: {
        customerId: params.customerid,
      },
    },
  });
  const dabbah = await prisma.dabbah.count({
    where: {
      order: {
        customerId: params.customerid,
      },
    },
  });
  const subOrders = await prisma.subOrders.count({
    where: {
      order: {
        customerId: params.customerid,
      },
    },
  });

  const subscription = await prisma.order.count({
    where: {
      status: {
        not: "UPCOMING",
      },
      customerId: params.customerid,
    },
  });
  const couponUsed = await prisma.order.count({
    where: {
      couponCodeId: {
        not: null,
      },
      customerId: params.customerid,
    },
  });
  const savedAddresses = await prisma.savedAddress.findMany({
    where: {
      customerId: params.customerid,
    },
    select: {
      id: true,
      shippingInfo: true,
      billingInfo: true,
      createdAt: true,
      addressType: true,
    },
  });

  const findCoupons = await prisma.couponCode.findMany({
    where: {
      orders: {
        some: {
          customerId: params.customerid,
        },
      },
    },
    select: {
      id: true,
      code: true,
      discountAmount: true,
      discountPercentage: true,
      isActive: true,
    },
  });

  if (!findCustomer) {
    return <CustomerNotFound />;
  }
  if (!params.customerid || params.customerid.length < 6) {
    return <CustomerNotFound />;
  }
  return (
    <div className="p-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Details</h1>
        <p className="text-sm text-gray-500">
          Here you can view all the details for this customer
        </p>
      </div>
      <div className="bg-white p-4 rounded-md mt-4 flex items-start justify-between gap-4">
        <div className="w-1/2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Info</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>
                  {findCustomer.firstName} {findCustomer.lastName}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>{findCustomer.email}</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Phone</TableCell>
                <TableCell>
                  {findCustomer.phone ? findCustomer.phone : "Not Set"}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Wallet</TableCell>
                <TableCell>${findCustomer.wallet.toFixed(2)}</TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Account Type</TableCell>
                <TableCell>
                  {findCustomer.appleId
                    ? "Apple"
                    : findCustomer.googleId
                    ? "Google"
                    : "Email"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Created At</TableCell>
                <TableCell>
                  {new Date(findCustomer.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 gap-2 w-1/2 h-full">
          <div className="p-4 bg-gray-100 rounded-md w-full">
            <p className="text-sm text-gray-500 ">Total Subscription Orders</p>
            <h2 className="text-2xl font-bold">{subOrders}</h2>
          </div>
          <div className="p-4 bg-gray-100 rounded-md w-full">
            <p className="text-sm text-gray-500 ">Total Dabbah Orders</p>
            <h2 className="text-2xl font-bold">{dabbah}</h2>
          </div>
          <div className="p-4 bg-gray-100 rounded-md w-full">
            <p className="text-sm text-gray-500 ">Total Pickups Orders</p>
            <h2 className="text-2xl font-bold">{pickups}</h2>
          </div>
          <div className="p-4 bg-gray-100 rounded-md w-full   ">
            <p className="text-sm text-gray-500 ">Total Subscriptions</p>
            <h2 className="text-2xl font-bold">{subscription}</h2>
          </div>
          <div className="p-4 bg-gray-100 rounded-md w-full   ">
            <p className="text-sm text-gray-500 ">Total Coupons Used</p>
            <h2 className="text-2xl font-bold">{couponUsed}</h2>
          </div>
        </div>
      </div>

      <Tabs defaultValue="deliveries" className="mt-6">
        <TabsList>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="pickups">Pickups</TabsTrigger>
        </TabsList>
        <TabsContent value="deliveries">
          <DeliveriesTable />
        </TabsContent>
        <TabsContent value="pickups">
          <PickupTable />
        </TabsContent>
      </Tabs>

      <div className="mt-4">
        <h1 className="text-2xl font-bold">Coupon Used</h1>
        <p className="text-sm text-gray-500 mb-4">
          Here you can view all the coupons used by this customer
        </p>
        <Suspense fallback={<Skeleton className="h-28 w-full" />}>
          <CouponsTable coupons={findCoupons} />
        </Suspense>
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-bold">Saved Addresses</h1>
        <p className="text-sm text-gray-500 mb-4">
          Here you can view all the saved addresses for this customer
        </p>
        <Suspense fallback={<Skeleton className="h-28 w-full" />}>
          <SavedAddressesTable addresses={savedAddresses as Address[]} />
        </Suspense>
      </div>
    </div>
  );
}

export default Page;

function CustomerNotFound() {
  return (
    <div className="flex flex-col  gap-2 justify-center items-center h-screen ">
      <p className="text-2xl font-bold">Customer not found</p>
      <Button asChild>
        <Link href="/admin/customers">Go Back</Link>
      </Button>
    </div>
  );
}
