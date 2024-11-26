"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
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
import { Dialog, DialogContent } from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, SortAscIcon, X } from "lucide-react";
import { useEffect, useState } from "react";

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
import { toast } from "sonner";
import { ResponseType } from "@/types/main";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MenuItemsInput,
  MenuItemsSchema,
  MenuItemsCreateSchema,
  MenuItemsCreateInput,
} from "@/types/zod/AdminSchema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Item,
  UnitType,
} from "@prisma/client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import React from "react";
import useSWR from "swr";
import Image from "next/image";
import { fetcher } from "@/lib/helper";
import PreferenceIcon from "@/components/ui/PreferenceIcon";

export const columns = (
  setOpen: (open: boolean) => void,
  setSelected: (selected: Item | null) => void,
  setEditOpen: (editOpen: boolean) => void
): ColumnDef<Item>[] => [
  {
    accessorKey: "thumbnail",
    header: "Thumbnail",
    cell: ({ row }) => {
      const { thumbnail } = row.original;
      return (
        <>
          {thumbnail && (
            <div className="rounded-md overflow-hidden h-10 w-10">
              <Image
                src={process.env.NEXT_PUBLIC_AWS_URL + thumbnail}
                alt="thumbnail"
                height="50"
                width="50"
                className="w-full h-full object-contain bg-gray-200 dark:bg-gray-800"
              />
            </div>
          )}
        </>
      );
    },
  },
  {
    accessorKey: "itemName",
    header: "Item",
    cell: ({ row }) => {
      const { mealPreference, itemName } = row.original;
      return (
        <div className="flex items-center gap-1">
          <PreferenceIcon preference={mealPreference} className="h-4 w-4" />
          {itemName}
        </div>
      );
    },
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      return row.original?.price;
    },
  },

  {
    accessorKey: "unit",
    header: "Unit",
    cell: ({ row }) => {
      return row.original?.unit + row.original?.unitType;
    },
  },
  {
    accessorKey: "planType",
    header: "Plan Type",
    cell: ({ row }) => {
      const { planType } = row.original;
      return (
        <>
          {planType.includes("MEAL") && (
            <Badge className="text-green-600" variant={"outline"}>
              Meal
            </Badge>
          )}{" "}
          {planType.includes("CURRY") && (
            <Badge className="text-blue-600" variant={"outline"}>
              Curry
            </Badge>
          )}
        </>
      );
    },
  },

  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created At
        <SortAscIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      const date = new Date(createdAt);
      const formattedDate = date.toLocaleDateString();
      return <div>{formattedDate}</div>;
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
            <DropdownMenuItem
              onClick={() => {
                setEditOpen(true);
                setSelected(original);
              }}
            >
              Edit Item
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelected(original);
                setOpen(true);
              }}
            >
              Delete Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

function MenuItemsTable() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [adding, setAdding] = useState(false);

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const {
    data,
    isLoading,
    error,
    mutate: mutuateItems,
  } = useSWR(`/api/admin/menu/items`, fetcher, {
    revalidateOnFocus: false,
  });

  const tableData = React.useMemo(() => {
    if (isLoading) return Array(7).fill({});
    if (data && data?.data) {
      return data.data;
    }
    return [];
  }, [isLoading, data]);

  const tableColumns = React.useMemo(
    () =>
      isLoading
        ? columns(setOpen, setSelected, setEditOpen).map((column) => ({
            ...column,
            cell: () => <Skeleton className="h-4 w-2/3" />,
          }))
        : columns(setOpen, setSelected, setEditOpen),
    [isLoading]
  );

  const form = useForm<MenuItemsInput>({
    resolver: zodResolver(selected ? MenuItemsSchema : MenuItemsCreateSchema),
    defaultValues: {
      item: "",
      price: "",
      unit: "",
      unitType: "OZ",
      mealPreference: "VEG",
      planType: [],
      thumbnail: null,
    },
  });

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnVisibility,
    },
  });

  async function onSubmit(values: MenuItemsInput) {
    setAdding(true);
    setUpdating(true);
    const isEdit = !!selected;
    const url = process.env.NEXT_PUBLIC_URL + "/api/admin/menu/items";
    const method = isEdit ? "PUT" : "POST";
    const formData = new FormData();
    if (isEdit && selected?.id) {
      formData.append("id", selected.id);
    }
    formData.append("item", values.item);
    formData.append("price", values.price);
    formData.append("unit", values.unit || "");
    formData.append("unitType", values.unitType);
    formData.append("mealPreference", values.mealPreference);
    if (values.thumbnail && values.thumbnail.length > 0) {
      formData.append("thumbnail", values.thumbnail[0]);
    }

    formData.append("planType", JSON.stringify(values.planType));

    const requestPromise = new Promise((resolve, reject) => {
      fetch(url, { method, body: formData })
        .then(async (response) => {
          const res = await response.json();
          if (response.ok) {
            resolve(res);
            form.reset();
            mutate("/api/items");
            mutuateItems();
            setOpen(false);
            setEditOpen(false);
            setSelected(null);
            setAdding(false);
            setUpdating(false);
          } else {
            reject(new Error(res.message || "Failed to process menu item"));
          }
        })
        .catch((error) => {
          setAdding(false);
          setUpdating(false);
          reject(
            new Error("Error while processing Menu Item: " + error.message)
          );
        });
    });

    toast.promise(requestPromise as Promise<ResponseType>, {
      loading: isEdit ? "Editing Menu Item..." : "Creating Menu Item...",
      success: (res) => res.message,
      error: (error) => error.message,
    });

    requestPromise.catch((error) => {
      setUpdating(false);
      setAdding(false);
      console.error("Error while processing Menu Item", error);
    });
  }

  const fileRef = form.register("thumbnail");

  useEffect(() => {
    if (selected) {
      form.reset({
        item: selected.itemName,
        price: selected.price.toString(),
        unit: selected.unit.toString() || "",
        unitType: selected.unitType as UnitType,
        mealPreference: selected.mealPreference,
        planType: selected.planType as any,
        thumbnail: null,
      });
    }
  }, [selected, form]);

  const deleteID = async (id: string) => {
    const customerDeletePromise = new Promise((resolve, reject) => {
      fetch(process.env.NEXT_PUBLIC_URL + "/api/admin/menu/items", {
        method: "DELETE",
        body: JSON.stringify({ id, type: "soft" }),
      })
        .then(async (response) => {
          const res = await response.json();
          if (response.ok) {
            resolve(res);
          } else {
            reject(new Error(res.message || "Failed to delete"));
          }
        })
        .catch((error) => {
          reject(new Error("Error while delete item: " + error.message));
        });
    });

    toast.promise(customerDeletePromise as Promise<ResponseType>, {
      loading: "Deleting Item...",
      success: (res) => {
        mutuateItems();
        return res.message;
      },
      error: (error) => error.message,
    });

    customerDeletePromise.catch((error) =>
      console.error("Error while deleting menu item", error)
    );
  };
  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter item..."
          value={
            (table.getColumn("itemName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("itemName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button
          onClick={() => {
            setEditOpen(true);
            setSelected(null);
          }}
        >
          Add Menu Item
        </Button>
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
              {table.getFilteredRowModel().rows.length} Items Available.
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

      <Dialog
        open={editOpen}
        onOpenChange={(isOpen) => {
          setEditOpen(isOpen);
          if (!isOpen) setAdding(false);
        }}
      >
        <DialogContent className="w-full max-w-4xl">
          <h1 className="text-xl font-semibold ">
            {adding ? "Add Menu Item" : "Edit Menu Item"}
          </h1>
          <p className="text-sm text-gray-500">
            {adding
              ? "Add a new menu item to the menu."
              : "Edit the selected menu item."}
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-start gap-3">
                <FormField
                  control={form.control}
                  name="item"
                  render={({ field }) => (
                    <FormItem className="w-3/4">
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="eg. Veg Curry" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="w-1/4">
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="eg. 10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-start gap-3">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem className="w-1/3">
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="eg. 16" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitType"
                  render={({ field }) => (
                    <FormItem className="w-1/3">
                      <FormLabel>Unit Type</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "OZ"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Unit Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OZ">OZ</SelectItem>
                            <SelectItem value="PCS">PCS</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mealPreference"
                  render={({ field }) => (
                    <FormItem className="w-1/3">
                      <FormLabel>Preference</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "VEG"}
                          defaultValue="VEG"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VEG">VEG</SelectItem>
                            <SelectItem value="NON_VEG">NON-VEG</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
                    <FormItem className="w-1/3">
                      <FormLabel>Plan Type</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              className="w-6 h-6"
                              checked={field.value?.includes("MEAL") || false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), "MEAL"]
                                  : (field.value || []).filter(
                                      (val) => val !== "MEAL"
                                    );
                                field.onChange(newValue);
                              }}
                            />
                            <FormLabel className="text-base">MEAL</FormLabel>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              className="w-6 h-6"
                              checked={field.value?.includes("CURRY") || false}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), "CURRY"]
                                  : (field.value || []).filter(
                                      (val) => val !== "CURRY"
                                    );
                                field.onChange(newValue);
                              }}
                            />
                            <FormLabel className="text-base">CURRY</FormLabel>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="thumbnail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Image/Thumbnail</FormLabel>
                    <FormControl>
                      <Input type="file" {...fileRef} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">
                {selected
                  ? updating
                    ? "Updating Item..."
                    : "Update Item"
                  : adding
                  ? "Adding Item..."
                  : "Add Item"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation Required</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {selected !== null && (
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={() => deleteID(selected.id)}
                >
                  Delete
                </Button>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MenuItemsTable;

// "use client";
// import Image from "next/image";
// import {
//   ColumnDef,
//   ColumnFiltersState,
//   VisibilityState,
//   flexRender,
//   getCoreRowModel,
//   getFilteredRowModel,
//   getPaginationRowModel,
//   getSortedRowModel,
//   useReactTable,
// } from "@tanstack/react-table";
// import { Button } from "@/components/ui/button";

// interface MenuItems extends Item {
//   createdAt: string;
//   updatedAt: string;
// }

//   {
//     accessorKey: "itemName",
//     header: "Item",
//     cell: ({ row }) => row.getValue("itemName"),
//   },
//   {
//     accessorKey: "price",
//     header: "Price",
//     cell: ({ row }) => row.getValue("price"),
//   },
//   {
//     accessorKey: "oz",
//     header: "OZ",
//     cell: ({ row }) => row.getValue("oz"),
//   },

//   {
//     accessorKey: "createdAt",
//     header: "Created At",
//     cell: ({ row }) => {
//       const { createdAt } = row.original;
//       return <>{createdAt && new Date(createdAt).toLocaleDateString()}</>;
//     },
//   },

// ];

// type Props = {
//   data: MenuItems[];
//   isLoading: boolean;
// };

// export const MenuItemsTable: React.FC<Props> = ({ data, isLoading }) => {
//   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
//   const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
//     setOpen: false,
//     setSelected: false,
//     setEditOpen: false,
//     updatedAt: false,
//   });
//   const [rowSelection, setRowSelection] = useState({});

//   const table = useReactTable({
//     data,
//     columns: columns(setOpen, setSelected, setEditOpen),
//     onColumnFiltersChange: setColumnFilters,
//     getCoreRowModel: getCoreRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//     getSortedRowModel: getSortedRowModel(),
//     getFilteredRowModel: getFilteredRowModel(),
//     onColumnVisibilityChange: setColumnVisibility,
//     onRowSelectionChange: setRowSelection,
//     state: {
//       columnFilters,
//       columnVisibility,
//       rowSelection,
//     },
//   });

//   return (
//     <div className="w-full">

//       <div className="rounded-md border overflow-hidden">
//         <Table>
//           <TableHeader className="bg-primary">
//             {table.getHeaderGroups().map((headerGroup) => (
//               <TableRow key={headerGroup.id}>
//                 {headerGroup.headers.map((header) => {
//                   return (
//                     <TableHead key={header.id} className="text-white ">
//                       {header.isPlaceholder
//                         ? null
//                         : flexRender(
//                             header.column.columnDef.header,
//                             header.getContext()
//                           )}
//                     </TableHead>
//                   );
//                 })}
//               </TableRow>
//             ))}
//           </TableHeader>
//           <TableBody>{renderTableBody()}</TableBody>
//         </Table>
//       </div>
//       <div className="flex items-center justify-end space-x-2 py-4">
//         {!data ? null : (
//           <>
//             <div className="flex-1 text-sm text-muted-foreground">
//               {table.getFilteredRowModel().rows.length} Records Available.
//             </div>

//             <div className="space-x-2">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => table.previousPage()}
//                 disabled={!table.getCanPreviousPage()}
//               >
//                 Previous
//               </Button>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => table.nextPage()}
//                 disabled={!table.getCanNextPage()}
//               >
//                 Next
//               </Button>
//             </div>
//           </>
//         )}
//       </div>

//     </div>
//   );
// };
