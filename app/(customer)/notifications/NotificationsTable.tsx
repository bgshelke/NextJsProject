"use client";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useState } from "react";

import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import TableSkeleton from "../_components/TableLoading";
import { fetcher } from "@/lib/helper";


export interface Notification {
  id?: string;
  title?: string;
  message?: string;
  createdAt?: string;
}

const columns = (
  deleting: string | null,
  deleteID: any
): ColumnDef<Notification>[] => [
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => {
      const { message } = row.original;
      return message ? message : "N/A";
    },
  },

  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const { createdAt } = row.original;
      return (
        <p className="text-gray-500">
          {createdAt
            ? new Date(createdAt).toLocaleString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
              })
            : "N/A"}
        </p>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const { original } = row;
      return (
        <button
          className="text-red-700 font-semibold"
          onClick={() => {
            deleteID(original);
          }}
        >
          {deleting === original.id ? (
            <span className="text-gray-400">Delete</span>
          ) : (
            "Delete"
          )}
        </button>
      );
    },
  },
];

type Props = {
  data: Notification[];
  isLoading: boolean;
};

export const NotificationsTable =() => {
  const [deleting, setDeleting] = useState<string | null>(null);
  const {data, isLoading} = useSWR(process.env.NEXT_PUBLIC_URL + "/api/customer/notifications", fetcher);
  const deleteID = async (notification: Notification) => {
    setDeleting(notification?.id || null);
    const customerDeletePromise = new Promise((resolve, reject) => {
      fetch(process.env.NEXT_PUBLIC_URL + "/api/customer/notifications", {
        method: "DELETE",
        body: JSON.stringify({ id: notification.id}),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then(async (response) => {
          const res = await response.json();
          setDeleting(null);
          if (response.ok) {
            resolve(res);
            toast.success(res.message);
          
            mutate(process.env.NEXT_PUBLIC_URL + "/api/customer/notifications");
          } else {
            reject(new Error(res.message || "Failed to delete"));
            toast.error(res.message);
            
          }
        })
        .catch((error) => {
          setDeleting(null);
          reject(
            new Error("Error while delete notification: " + error.message)
          );
          toast.error("Error while delete notification");
        
        });
    });

  
    customerDeletePromise.catch((error) =>
      console.error("Error while deleting notification", error)
    );
  };


  const tableData = data?.data;

  const table = useReactTable({
    data: tableData,
    columns: columns(deleting, deleteID),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const colsLength = 4;

  const renderTableBody = () => {
    if (isLoading || !data) {
      return <TableSkeleton colsLength={colsLength} />;
    }

    if (table.getRowModel().rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={colsLength} className="h-24 text-center">
            No Notifications Available.
          </TableCell>
        </TableRow>
      );
    }

    return table.getRowModel().rows.map((row) => (
      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className="py-4 pl-6">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter Notifications"
          value={(table.getColumn("message")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("message")?.setFilterValue(event.target.value)
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
