"use client";
import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TableSkeleton, {
  NoDataTable,
} from "@/app/(customer)/_components/TableLoading";
import useSWR from "swr";
import { fetcher } from "@/lib/helper";
import { ResponseType } from "@/types/main";

type Transaction = {
  id: string;
  transactionId: string;
  amount: number;
  type: string;
  transactionType: string;
  description: string;
  createdAt: string;
};

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "description",
    header: "Transaction",
    cell: ({ row }) => {
      const { description } = row.original;
      return description;
    },
  },

  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const { createdAt } = row.original;
      return new Date(createdAt).toLocaleString();
    },
  },

  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const { amount, type } = row.original;
      return (
        <span
          className={`font-semibold ${
            type === "CREDIT" ? "text-green-800" : "text-red-800"
          }`}
        >
          {type === "CREDIT" ? "+" : "-"}${amount}
        </span>
      );
    },
  },
];



export const TransactionsTable = () => {
  const [columnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const { data, error, isLoading } = useSWR<ResponseType>(
    "/api/customer/wallet/wallet-history",
    fetcher
  );

  const tableData = data?.data || [];

  const table = useReactTable({
    data: tableData,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const colsLength = 8;

  const renderTableBody = () => {
    if (isLoading || !data) {
      return <TableSkeleton colsLength={colsLength} />;
    }

    if (table.getRowModel().rows.length === 0) {
      return <NoDataTable colsLength={colsLength} />;
    }

    return table.getRowModel().rows.map((row) => (
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className="py-4 text-sm ">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <div className="w-full">
      <div className="rounded-md border mt-4">
        <Table>
          <TableHeader className="bg-primary text-white">
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
          <TableBody className="bg-white">{renderTableBody()}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        {!data ? null : (
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
  );
};
