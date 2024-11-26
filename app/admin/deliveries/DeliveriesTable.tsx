"use client";
import { OrderStatusLabel } from "@/app/(customer)/my-subscription/_components/OrderStatusLabel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useReactToPrint } from "react-to-print";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetcher, getPricingLabel } from "@/lib/helper";
import { cn } from "@/lib/utils";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  } from "@/components/ui/popover";
import { Item, ShippingInfo, SubOrderStatusType } from "@/types/main";
import { OrderItem, PlanType } from "@prisma/client";
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
import React, { useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { format } from "date-fns";
import {
  CalendarIcon,
  EllipsisVerticalIcon,
  Filter,
  Minus,
  Plus,
  SortAscIcon,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useItems } from "@/contexts/ItemContext";

export type DeliveryType = {
  id: string;
  deliveryDate: string;
  timeStart: string;
  timeEnd: string;
  deliveryId: string;
  status: string;
  items: OrderItem[];
  orderType: "SUBSCRIPTION" | "DABBHAH" | "GUESTDABBHAH";
  total: number;
  order: {
    id: string;
    planType: PlanType;
    shippingInfo: ShippingInfo;
  };
};

const columns: ColumnDef<DeliveryType>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "deliveryId",
    header: "Delivery ID",
    cell: ({ row }) => {
      const shippingInfo = row.original?.order?.shippingInfo;
      return (
        <div className="capitalize">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>{row.original?.deliveryId}</TooltipTrigger>
              <TooltipContent>
                <p>
                  {shippingInfo?.addressLine1},{" "}
                  {shippingInfo?.addressLine2
                    ? shippingInfo?.addressLine2 + ","
                    : ""}
                  {shippingInfo?.city}, {shippingInfo?.state},{" "}
                  {shippingInfo?.zipCode}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
  {
    accessorKey: "order.shippingInfo.fullName",
    header: "Name",
    cell: ({ row }) => {
      const shippingInfo = row.original?.order?.shippingInfo;
      return <div className="capitalize">{shippingInfo?.fullName}</div>;
    },
  },
  {
    accessorKey: "order.shippingInfo.phone",
    header: "Phone Number",
    cell: ({ row }) => {
      const shippingInfo = row.original?.order?.shippingInfo;
      return <div className="capitalize">{shippingInfo?.phone}</div>;
    },
  },

  {
    accessorKey: "order.shippingInfo.addressLine1",
    header: "Address",
    cell: ({ row }) => {
      const shippingInfo = row.original?.order?.shippingInfo;
      return (
        <div className="capitalize">
          {shippingInfo?.addressLine1}, {shippingInfo?.zipCode}
        </div>
      );
    },
  },
  {
    accessorKey: "deliveryDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Delivery Date
        <SortAscIcon className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const deliveryDate = row.original.deliveryDate;
      const date = new Date(deliveryDate);
      const formattedDate = date.toLocaleDateString();
      return <div>{formattedDate}</div>;
    },
  },

  {
    accessorKey: "amount",
    header: () => <div className="">Amount</div>,
    cell: ({ row }) => {
      const total = row.original.total;
      return (
        <div className="font-medium">{getPricingLabel(total ? total : 0)}</div>
      );
    },
  },
  {
    accessorKey: "status",
    header: () => <div className="">Status</div>,
    cell: ({ row }) => {
      const status = row.getValue("status");
      return <OrderStatusLabel status={status as SubOrderStatusType} />;
    },
  },
  {
    accessorKey: "action",
    header: () => <div className="">Action</div>,
    cell: ({ row, table }) => {
      const handlers = (table.options.meta as any)?.handlers;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={"outline"} size={"icon"}>
              <EllipsisVerticalIcon size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => handlers?.handleView(row.original)}
            >
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handlers?.handleRefund(row.original)}
            >
              Refund
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => handlers?.handleRefundFullAmount(row.original)}
            >
              Refund Full Amount
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

function DeliveriesTable({ customerId }: { customerId?: string }) {
  const { items } = useItems();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [statusFilter, setStatusFilter] =
    React.useState<SubOrderStatusType | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pageSize, setPageSize] = React.useState(10);
  const [orderType, setOrderType] = React.useState<
    "ALL" | "SUBSCRIPTION" | "DABBHAH" | "GUESTDABBHAH" | null
  >(null);
  let query = "";
  if (date && date !== undefined && date.from && date.from !== undefined)
    query = `date=${date.from.toISOString().split("T")[0]}`;
  if (date && date !== undefined && date.to && date.to !== undefined)
    query = `${query}&to=${date.to.toISOString().split("T")[0]}`;

  if (statusFilter) query = `${query}&status=${statusFilter}`;
  if (customerId) query = `${query}&customerId=${customerId}`;
  const { data, isLoading, error, mutate } = useSWR(
    `/api/admin/orders/deliveries?${query}`,
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  const tableData = React.useMemo(() => {
    if (isLoading) return Array(7).fill({});
    if (data && data.data) {
      return data.data.filter((delivery: DeliveryType) => {
        if (orderType && orderType !== "ALL") {
          return delivery.orderType === orderType;
        }
        return true;
      });
    }
    return [];
  }, [isLoading, data, orderType]);

  const tableColumns = React.useMemo(
    () =>
      isLoading
        ? columns.map((column) => ({
            ...column,
            cell: () => <Skeleton className="h-4 w-2/3" />,
          }))
        : columns,
    [isLoading, columns ]
  );

  const [selectedDelivery, setSelectedDelivery] =
    React.useState<DeliveryType | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = React.useState(false);

  const [refundQuantities, setRefundQuantities] = useState<{
    [key: string]: number;
  }>({});

  const [isRefundFullAmountModalOpen, setIsRefundFullAmountModalOpen] = React.useState(false);

  const handleRefundQtyChange = (
    itemId: string,
    newQuantity: number,
    maxQuantity: number
  ) => {
    const item = selectedDelivery?.items.find((i) => i.itemId === itemId);
    if (!item) return;

    const refundedQty = item.refundQuantity || 0;
    const clampedQuantity = Math.max(
      refundedQty,
      Math.min(newQuantity, maxQuantity)
    );

    setRefundQuantities((prev) => ({
      ...prev,
      [itemId]: clampedQuantity,
    }));
  };

  const handlersRef = useRef({
    handleView: (delivery: DeliveryType) => {
      setSelectedDelivery(delivery);
      setIsViewModalOpen(true);
    },
    handleRefund: (delivery: DeliveryType) => {
      setSelectedDelivery(delivery);
      setIsRefundModalOpen(true);
    },
    handleRefundFullAmount: (delivery: DeliveryType) => {
      setSelectedDelivery(delivery);
      setIsRefundFullAmountModalOpen(true);
    },
  });

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
    initialState: {
      pagination: {
        pageSize,
      },
    },
    meta: {
      handlers: handlersRef.current,
    },
  });

  const reactToPrintFn = useReactToPrint({
    content: () => contentRef.current,
  }) as any;

  async function refundSelectedItems(
    refundQuantities: { [key: string]: number },
    selectedDeliveryId: string,
    orderId: string,
    orderType: "SUBSCRIPTION" | "DABBHAH" | "GUESTDABBHAH"
  ) {
    try {
      const response = await fetch(`/api/admin/orders/deliveries/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refundQuantities,
          selectedDeliveryId,
          orderId,
          orderType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        mutate();
        setIsRefundModalOpen(false);
        setSelectedDelivery(null);
        setRefundQuantities({});
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error refunding items:", error);
      toast.error("Something went wrong. Please try again later.");
    }
  }

  async function refundFullAmount(
    selectedDeliveryId: string,
    orderId: string,
    orderType: "SUBSCRIPTION" | "DABBHAH" | "GUESTDABBHAH"
  ) {
    try {
      if(orderType == "GUESTDABBHAH"){
        toast.error("Guest Dabbah order cannot be refunded fully.")
        return
      }
      const response = await fetch(`/api/admin/orders/deliveries/refund/refund-full`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedDeliveryId,
          orderId,
          orderType,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        mutate();
        setIsRefundFullAmountModalOpen(false);
        setSelectedDelivery(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error refunding full amount:", error);
      toast.error("Something went wrong. Please try again later.");
    }
  }

  return (
    <div className="">
      <div>
        <div className="w-full">
          <div className="flex items-center py-4 justify-between">
            <Input
              placeholder="Filter Orders by Delivery ID..."
              value={
                (table.getColumn("deliveryId")?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn("deliveryId")
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />

            <div className="flex items-center gap-2">
              {tableData.length > 0 && Object.keys(rowSelection).length > 0 && (
                <Button onClick={() => reactToPrintFn()} variant={"outline"}>
                  Print
                </Button>
              )}
              <div className={cn("grid gap-2")}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[250px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"}>
                    <Filter size={16} className="mr-1" /> Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="space-y-2">
                    <Label htmlFor="statusFilter">Status:</Label>
                    <Select
                      value={statusFilter ?? undefined}
                      onValueChange={(value) =>
                        setStatusFilter(value as SubOrderStatusType)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "ACCEPTED",
                          "PREPARING",
                          "OUT_FOR_DELIVERY",
                          "DELIVERED",
                          "SKIPPED",
                          "CANCELLED",
                          "REFUNDED",
                        ].map((status) => (
                          <SelectItem key={status} value={status}>
                            <OrderStatusLabel
                              status={status as SubOrderStatusType}
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 mt-2">
                    <Label htmlFor="orderType">Order Type:</Label>
                    <Select
                      value={orderType ?? undefined}
                      onValueChange={(value) =>
                        setOrderType(
                          value as
                            | "ALL"
                            | "SUBSCRIPTION"
                            | "DABBHAH"
                            | "GUESTDABBHAH"
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="ALL" value="ALL">
                          All
                        </SelectItem>
                        <SelectItem key="SUBSCRIPTION" value="SUBSCRIPTION">
                          Subscription
                        </SelectItem>
                        <SelectItem key="DABBHAH" value="DABBHAH">
                          Dabbah
                        </SelectItem>
                        <SelectItem key="GUESTDABBHAH" value="GUESTDABBHAH">
                          Guest Dabbah
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 mt-2">
                    <Label htmlFor="pageSize">Page Size:</Label>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => setPageSize(parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
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

          {table.getSelectedRowModel().rows.length > 0 && (
            <div
              className="hidden flex-col max-w-sm text-xs  print:flex"
              ref={contentRef}
            >
              {table
                .getSelectedRowModel()
                .rows.map((item: Row<DeliveryType>) => {
                  const delivery = item.original;
                  if (delivery.status !== "ACCEPTED") return null;

                  return (
                    <div key={delivery.id} className="mt-4 p-6 border-b">
                      <div className="flex justify-between">
                        <div>
                          <Image
                            src="/logo.svg"
                            alt="logo"
                            width={50}
                            height={50}
                            className="saturate-0"
                          />
                          <h1 className="text-sm font-semibold mt-2">
                            Dabbahwala
                          </h1>
                          <p>contact@dabbahwala.com</p>
                          <p>www.dabbahwala.com</p>
                        </div>

                        <div className="text-right">
                          <p>Delivery ID: #{delivery.deliveryId}</p>
                          <p>
                            Delivery Date:{" "}
                            {new Date(
                              delivery.deliveryDate
                            ).toLocaleDateString()}
                          </p>
                          <p className="font-semibold mt-2">From</p>
                          <p>Dabbahwala Kitchen</p>
                          <p>Address: 123 Main St, Anytown, USA</p>
                          <p>Phone: 123-456-7890</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="font-semibold">Delivery Address:</p>{" "}
                        <p>
                          <span>{delivery.order?.shippingInfo?.fullName}</span>
                          <br />
                          <span>
                            {delivery.order?.shippingInfo?.addressLine1}
                          </span>
                          <br />
                          {delivery.order?.shippingInfo?.addressLine2 && (
                            <>
                              {delivery.order?.shippingInfo?.addressLine2}
                              <br />
                            </>
                          )}
                          {delivery.order?.shippingInfo?.city},{" "}
                          {delivery.order?.shippingInfo?.state} -{" "}
                          {delivery.order?.shippingInfo?.zipCode}
                          <br />
                          <span className="font-semibold">Phone:</span>{" "}
                          {delivery.order?.shippingInfo?.phone}
                        </p>
                      </div>
                      <div className="mt-3">
                        {delivery.items && (
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="uppercase">
                                <th className="text-left">Item</th>
                                <th className="text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {delivery.items?.map((orderItem: OrderItem) => {
                                const item = items.find(
                                  (i) => i.id === orderItem.id
                                ) as Item;
                                return (
                                  <React.Fragment key={item?.id}>
                                    <tr>
                                      <td className="capitalize text-left">
                                        <p>
                                          {item?.itemName}{" "}
                                          <span className="text-[11px] italic text-gray-600">{`(${item?.unit}${item?.unitType})`}</span>
                                        </p>
                                      </td>
                                      <td className="text-right">
                                        x{orderItem?.quantity}
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Items in Delivery</DialogTitle>
            <DialogDescription>
              Delivery ID: {selectedDelivery?.deliveryId}
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery?.items && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="uppercase">
                  <th className="text-left">Item</th>
                  <th className="text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {selectedDelivery?.items?.map((orderItem: OrderItem) => {
                  const item = items.find(
                    (i) => i.id === orderItem.id
                  ) as Item;
                  return (
                    <React.Fragment key={item?.id}>
                      <tr>
                        <td className="capitalize text-left">
                          <p>
                            {item?.itemName}{" "}
                            <span className="text-gray-600 text-xs">{`(${item?.unit}${item?.unitType})`}</span>
                          </p>
                        </td>
                        <td className="text-right">x{orderItem?.quantity}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Confirmation</DialogTitle>
            <DialogDescription>
              <p>Are you sure you want to refund this items?</p>
              <p>
                <span className="font-semibold">Delivery ID:</span>{" "}
                {selectedDelivery?.deliveryId}
              </p>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Ordered Qty</TableHead>
                      <TableHead className="text-right">Refund Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDelivery?.items?.map((item: OrderItem) => {
                      const orderedItem = items.find(
                        (i) => i.id ===   item.id
                      );
                      const refundedQty = item.refundQuantity || 0;
                      const currentRefundQty =
                        refundQuantities[item.id] || refundedQty;

                      return (
                        <TableRow key={item?.id}>
                          <TableCell>{orderedItem?.itemName}</TableCell>
                          <TableCell>{item?.quantity}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center space-x-2 justify-end">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleRefundQtyChange(
                                    item.id,
                                    currentRefundQty - 1,
                                    item.quantity || 0
                                  )
                                }
                                disabled={currentRefundQty <= refundedQty}
                              >
                                <Minus size={15} />
                              </Button>
                              <Input
                                type="number"
                                value={currentRefundQty}
                                onChange={(e) =>
                                  handleRefundQtyChange(
                                    item.id,
                                    parseInt(e.target.value) || refundedQty,
                                    item.quantity || 0
                                  )
                                }
                                className="w-16 text-center"
                                min={refundedQty}
                                max={item.quantity || 0}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleRefundQtyChange(
                                    item.id,
                                    currentRefundQty + 1,
                                    item.quantity || 0
                                  )
                                }
                                disabled={
                                  currentRefundQty >= (item.quantity || 0)
                                }
                              >
                                <Plus size={15} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2 mt-6 justify-end">
                <Button
                  onClick={() =>
                    refundSelectedItems(
                      refundQuantities,
                      selectedDelivery?.id as string,
                      selectedDelivery?.order?.id as string,
                      selectedDelivery?.orderType == "SUBSCRIPTION"
                        ? "SUBSCRIPTION"
                        : selectedDelivery?.orderType == "DABBHAH"
                        ? "DABBHAH"
                        : "GUESTDABBHAH"
                    )
                  }
                >
                  Refund Selected Items
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
          {/* Add refund confirmation buttons or form here */}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isRefundFullAmountModalOpen}
        onOpenChange={setIsRefundFullAmountModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you absolutely sure you want to refund full amount?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will refund the full amount for
              the selected delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                refundFullAmount(
                  selectedDelivery?.id as string,
                  selectedDelivery?.order?.id as string,
                  selectedDelivery?.orderType == "SUBSCRIPTION"
                  ? "SUBSCRIPTION"
                  : selectedDelivery?.orderType == "DABBHAH"
                  ? "DABBHAH"
                  : "GUESTDABBHAH"
                )
              }
            >
              Refund Full Amount
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DeliveriesTable;