"use client";
import React from "react";
import { DateRange } from "react-day-picker";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useSWR from "swr";
import { fetcher } from "@/lib/helper";
// import { Customer } from "../customers/CustomerTable";
import { Skeleton } from "@/components/ui/skeleton";

function RecentCustomer({ date }: { date: DateRange | undefined }) {
  const from =
    date?.from?.toISOString().split("T")[0] ||
    new Date().toISOString().split("T")[0];
  const to = date?.to?.toISOString().split("T")[0] || undefined;

  const {
    data: customerData,
    isLoading,
    error,
    mutate,
  } = useSWR(
    `/api/admin/customers?type=recent&date=${from}&to=${to}`,
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  if (error) return <div>Error: {error.message}</div>;

  const data = customerData?.data;
  return (
    <Table>
      <TableCaption>A list of your recent registered customers.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Verified</TableHead>
          <TableHead>Account Type</TableHead>
          <TableHead className="text-right">Registerd On</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow>
            <TableCell colSpan={5}>
              <Skeleton className="w-full h-8" />
            </TableCell>
          </TableRow>
        )}
        {/* {data?.map((customer: Customer) => (
          <TableRow key={customer?.id}>
            <TableCell className="font-medium">{customer?.name}</TableCell>
            <TableCell>{customer?.email}</TableCell>
            <TableCell>{customer?.isVerified ? "Yes" : "No"}</TableCell>
            <TableCell>
              {Array.isArray(customer?.accounts) &&
              customer?.accounts.length > 0
                ? customer?.accounts
                    .map((account: { provider: string }) => {
                      switch (account.provider) {
                        case "google":
                          return "Google";
                        case "apple":
                          return "Apple";
                        default:
                          return "Email";
                      }
                    })
                    .join(", ")
                : "Email"}
            </TableCell>
            <TableCell className="text-right">
              {new Date(customer?.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))} */}
      </TableBody>
    </Table>
  );
}

export default RecentCustomer;
