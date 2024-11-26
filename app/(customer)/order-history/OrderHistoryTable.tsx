"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Dabbah, Order, PickupOrder } from "@prisma/client";
import Link from "next/link";
import { fetcher, getPricingLabel } from "@/lib/helper";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SubOrderStatusType } from "@/types/main";
import {
  OrderStatusLabel,
  PickupStatusLabel,
  PickupStatusType,
} from "../_components/OrderStatusLabel";

interface OrderType extends Order {
  dabbah: Dabbah;
  pickupOrder: PickupOrder;
}

const columns: ColumnDef<OrderType>[] = [
  {
    accessorKey: "orderID",
    header: "Order ID",

    cell: ({ row }) => {
      const { orderID, status, planType } = row.original;
      let href = `/order-history/${orderID}`;

      if (status === "UPCOMING" && planType === "SUBSCRIPTION") {
        href = "/my-subscription/upcoming";
      } else if (status === "ACTIVE" && planType === "SUBSCRIPTION") {
        href = "/my-subscription";
      } else if (planType === "ONETIME") {
        href = `/order-history/${orderID}`;
      }

      return <Link href={href}>#{orderID}</Link>;
    },
  },

  {
    accessorKey: "planType",
    header: "Order Type",
    cell: ({ row }) => {
      const { planType } = row.original;
      return planType === "SUBSCRIPTION"
        ? "Subscription"
        : planType === "ONETIME"
        ? "Dabbah"
        : "";
    },
  },

  {
    accessorKey: "paidAmount",
    header: "Paid Amount",
    cell: ({ row }) => {
      const { paidAmount } = row.original;
      return getPricingLabel(paidAmount);
    },
  },

  {
    accessorKey: "",
    header: "Created At",
    cell: ({ row }) => {
      const { createdAt } = row.original;
      return new Date(createdAt).toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
  },

  {
    accessorKey: "status",
    header: "Order Status",
    cell: ({ row }) => {
      const { status, planType, dabbah, pickupOrder } =
        row.original as OrderType;
      return planType === "SUBSCRIPTION" ? (
        <Badge
          className={`uppercase ${
            status === "ACTIVE" ? "bg-green-200 text-green-800" : ""
          } ${status === "CANCELLED" ? "bg-red-200 text-red-800" : ""} ${
            status === "COMPLETED" ? "bg-gray-200 text-gray-800" : ""
          } ${status === "ON_HOLD" ? "bg-yellow-200 text-yellow-800" : ""}`}
          variant={"secondary"}
        >
          {status === "ON_HOLD"
            ? "On Hold"
            : status === "ACTIVE"
            ? "Active"
            : status === "COMPLETED"
            ? "Completed"
            : status === "CANCELLED"
            ? "Cancelled"
            : status === "UPCOMING"
            ? "Upcoming"
            : ""}
        </Badge>
      ) : (
        <>
          {dabbah?.status && (
            <OrderStatusLabel status={dabbah?.status as SubOrderStatusType} />
          )}
          {pickupOrder?.status && (
            <PickupStatusLabel
              status={pickupOrder?.status as PickupStatusType}
            />
          )}
        </>
      );
    },
  },
];

function OrderHistoryTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const { data, isLoading } = useSWR(`/api/customer/orders`, fetcher, {
    revalidateOnFocus: false,
  });
  const tableData = React.useMemo(
    () => (isLoading ? Array(12).fill({}) : data?.data),
    [isLoading, data]
  );

  const tableColumns = React.useMemo(
    () =>
      isLoading
        ? columns.map((column) => ({
            ...column,
            cell: () => <Skeleton className="h-4 w-2/3" />,
          }))
        : columns,
    [isLoading, columns]
  );

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div>
      <div className="w-full">
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter Orders by OrderID..."
            value={
              (table.getColumn("orderID")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("orderID")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-primary">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="text-white">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="p-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          {!tableData ? null : (
            <>
              <div className="flex-1 text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} Records Available.
              </div>

              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderHistoryTable;
