"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import React, { useRef } from "react";
import useSWR from "swr";

import { DateRange } from "react-day-picker";
import Link from "next/link";
import { Check, ChevronDownIcon, MoreHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/helper";

export type Customer = {
  id: string;
  name: string;
  email: string;
  isVerified: string;
  orderDabbahCount: number;
  subscriptionOrderCount: number;
  accounts: {
    provider: string;
  };
  customer: {
    id: string;
  };
  createdAt: string;
};

export const columns = (
  setOpen?: (open: boolean) => void,
  setSelectedCustomer?: (customer: Customer) => void
): ColumnDef<Customer>[] => [
  {
    accessorKey: "fullName",
    header: "Full Name",
    cell: ({ row }) => {
      const { customer, name } = row.original;
      return customer ? (
        <Link href={`/admin/customers/${customer.id}`}>{name}</Link>
      ) : (
        name
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const { email } = row.original;
      return email;
    },
  },

  {
    accessorKey: "orderDabbahCount",
    header: "One Time Orders",
    cell: ({ row }) => {
      const { orderDabbahCount } = row.original;
      return orderDabbahCount;
    },
  },

  {
    accessorKey: "subscriptionOrderCount",
    header: "Subscription Orders",
    cell: ({ row }) => {
      const { subscriptionOrderCount } = row.original;
      return subscriptionOrderCount;
    },
  },

  {
    accessorKey: "isVerified",
    header: "Verified",
    cell: ({ row }) => {
      const { isVerified } = row.original;

      return isVerified ? (
        <Badge variant="secondary" className="text-green-700">
          <Check size="15" className="inline-block mr-1" />
          YES
        </Badge>
      ) : (
        <Badge
          variant="secondary"
          className="text-destructive dark:text-red-500"
        >
          <X size="15" className="inline-block mr-1" />
          NO
        </Badge>
      );
    },
  },
  {
    accessorKey: "accounts",
    header: "AccountType",
    cell: ({ row }) => {
      const { accounts } = row.original;
      return Array.isArray(accounts) && accounts.length > 0
        ? accounts
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
        : "Email";
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const { createdAt } = row.original;
      return new Date(createdAt).toLocaleDateString();
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const { original } = row;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedCustomer?.(original);
                setOpen?.(true);
              }}
            >
              Delete Customer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

function CustomerTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
        orderDabbahCount:false,
        subscriptionOrderCount:false,
    });
  const [rowSelection, setRowSelection] = React.useState({});

  const { data, isLoading, error } = useSWR(`/api/admin/customers`, fetcher, {
    revalidateOnFocus: true,
  });

  const tableData = React.useMemo(() => {
    if (isLoading) return Array(12).fill({});
    if (data && data?.data) {
      return data.data;
    }
    return [];
  }, [isLoading, data]);

  const tableColumns = React.useMemo(
    () =>
      isLoading
        ? columns(undefined, undefined).map((column) => ({
            ...column,
            cell: () => <Skeleton className="h-4 w-2/3" />,
          }))
        : columns(undefined, undefined),
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
    <div className="mt-4">
      <div>
        <div className="w-full">
          <div className="flex items-center py-4 justify-between">
            <Input
              placeholder="Filter Customers by email..."
              value={
                (table.getColumn("email")?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn("email")
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
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
                {table.getRowModel().rows.length > 0 ? (
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
    </div>
  );
}

export default CustomerTable;
