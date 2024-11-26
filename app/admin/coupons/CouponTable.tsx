  "use client";
import { ChevronDownIcon } from "lucide-react";
import {
  ColumnDef,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mutate } from "swr";
import { Coupon, ResponseType } from "@/types/main";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import TableSkeleton, { NoDataTable } from "@/app/(customer)/_components/TableLoading";

export const columns = (
  setOpen: any,
  setSelected: any
): ColumnDef<Coupon>[] => [
  {
    accessorKey: "code",
    header: "Coupon Code",
    cell: ({ row }) => <div className="capitalize">{row.getValue("code")}</div>,
  },

  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const { isActive } = row.original;
      return isActive ? (
        <Badge className="text-green-700" variant={"secondary"}>
          Active
        </Badge>
      ) : (
        <Badge className="text-red-600" variant={"secondary"}>
          Inactive
        </Badge>
      );
    },
  },

  {
    accessorKey: "id",
    header: "Discount",
    cell: ({ row }) => {
      const { discountPercentage, discountAmount } = row.original;
      return discountPercentage ? (
        <Badge className="text-green-700" variant={"secondary"}>
          {discountPercentage}%
        </Badge>
      ) : (
        <Badge className="text-green-700" variant={"secondary"}>
          ${discountAmount}
        </Badge>
      );
    },
  },

  {
    accessorKey: "expirationDate",
    header: "Expiry Date",
    cell: ({ row }) => {
      const { expirationDate } = row.original;
      return expirationDate ? (
        <Badge variant={"outline"}>{expirationDate}</Badge>
      ) : (
        <Badge variant={"outline"}>Not Set</Badge>
      );
    },
  },

  {
    accessorKey: "usageCount",
    header: "Usage",
    cell: ({ row }) => {
      const { usageCount } = row.original;
      return !usageCount ? "Not Used" : usageCount;
    },
  },

  {
    accessorKey: "maxUsageLimit",
    header: "Max Usage",
    cell: ({ row }) => {
      const { maxUsageLimit } = row.original;
      return maxUsageLimit ? maxUsageLimit : "No Limit";
    },
  },

  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const { createdAt } = row.original;
      return createdAt ? new Date(createdAt).toLocaleDateString() : "N/A";
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

            <DropdownMenuItem asChild>
              {original.isActive ? (
                <button
                  className="py-2 w-full !text-blue-8000"
                  onClick={() => setStatus(original.id, false)}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  className="py-2 w-full !text-blue-8000"
                  onClick={() => setStatus(original.id, true)}
                >
                  Active
                </button>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelected(original);
                setOpen(true);
              }}
              className="text-red-600"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

type Props = {
  data: Coupon[];
  isLoading: boolean;
};

export const CouponsTable: React.FC<Props> = ({ data, isLoading }) => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    ["usageCount"]: false,
    ["maxUsageLimit"]: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Coupon | null>(null);

  const table = useReactTable({
    data,
    columns: columns(setOpen, setSelected),
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const colsLength = 6;

  const renderTableBody = () => {
    if (isLoading || !data) {
      return <TableSkeleton colsLength={colsLength} />;
    }

    if (table.getRowModel().rows.length === 0) {
      return <NoDataTable colsLength={colsLength} />;
    }

    return table.getRowModel().rows.map((row) => (
      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
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
          placeholder="Filter Coupen"
          value={(table.getColumn("code")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("code")?.setFilterValue(event.target.value)
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

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-primary ">
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
          <TableBody>{renderTableBody()}</TableBody>
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

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation Required</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this coupon code?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {selected !== null && (
              <AlertDialogAction
                className=" bg-red-600 text-white"
                onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
                  deleteID(selected)
                }
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const deleteID = async (coupon: Coupon) => {
  const deleteCouponPromise = new Promise((resolve, reject) => {
    fetch(process.env.NEXT_PUBLIC_URL + "/api/admin/coupons", {
      method: "DELETE",
      body: JSON.stringify({ id: coupon.id, code: coupon.code }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(async (response) => {
        const res = await response.json();
        if (response.ok) {
          resolve(res);
          mutate(process.env.NEXT_PUBLIC_URL + "/api/admin/coupons");
        } else {
          reject(new Error(res.message || "Failed to delete coupon"));
        }
      })
      .catch((error) => {
        reject(new Error(error.message));
      });
  });

  toast.promise(deleteCouponPromise as Promise<ResponseType>, {
    loading: "Deleting Coupon...",
    success: (res) => {
      return res.message;
    },
    error: (error) => error.message,
  });
  deleteCouponPromise.catch((error) => {
    toast.error("Error while deleting coupon");
    console.log("Error while deleting coupon", error);
  });
};

const setStatus = async (id: string, isActive: boolean) => {
  const updateCouponStatusPromise = new Promise((resolve, reject) => {
    fetch(process.env.NEXT_PUBLIC_URL + "/api/admin/coupons", {
      method: "PUT",
      body: JSON.stringify({ id: id, isActive: isActive }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(async (response) => {
        const res = await response.json();
        if (response.ok) {
          resolve(res);
          mutate(process.env.NEXT_PUBLIC_URL + "/api/admin/coupons");
        } else {
          reject(new Error(res.message || "Failed to update status of coupon"));
        }
      })
      .catch((error) => {
        reject(new Error(error.message));
      });
  });

  toast.promise(updateCouponStatusPromise as Promise<ResponseType>, {
    loading: "Updating Coupon Status...",
    success: (res) => {
      return res.message;
    },
    error: (error) => error.message,
  });
  updateCouponStatusPromise.catch((error) => {
    toast.error("Error while updating coupon");
    console.log("Error while updating coupon", error);
  });
};
