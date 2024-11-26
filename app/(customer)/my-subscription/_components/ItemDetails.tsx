"use client";
import { Item } from "@/types/main";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import Image from "next/image";
import useSWR from "swr";

import PreferenceIcon from "@/app/(pages)/plans/_components/PreferenceIcon";
import { MenuItem } from "@prisma/client";
import { Label } from "@/components/ui/label";
import { fetcher } from "@/lib/helper";
import { getPricingLabel } from "@/lib/helper";
import { useItems } from "@/contexts/ItemContext";

export interface SubOrderItem {
  itemId: string;
  quantity: number;
  refundQuantity: number;
}

function ItemDetails({
  items,
  orderDate,
}: {
  items: SubOrderItem[];
  orderDate: string;
}) {
  const { items: menuItems } = useItems();
  const { data } = useSWR("/api/menu/by-date?date=" + orderDate, fetcher, {
    revalidateOnFocus: false,
  });
  const menuOfTheDay = data?.data;


  return (
    <div className="bg-white rounded-md p-2 mt-3 border">
      <div className="">
        <h5 className="font-semibold px-2 mt-2">Item Details</h5>
        <Table className="text-sm font-medium">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {menuItems
              .filter((item: Item) => items?.some((i) => i?.itemId === item.id))
              .map((item: Item) => {
                const menu = menuOfTheDay?.find(
                  (menu: MenuItem) => menu.itemId === item.id
                ) as MenuItem;
                const qty =
                  items.find((i: SubOrderItem) => i.itemId === item.id)
                    ?.quantity || 0;
                const refundQty =
                  items.find((i: SubOrderItem) => i.itemId === item.id)
                    ?.refundQuantity || 0;
                return (
                  <TableRow key={item.itemName}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.thumbnail && (
                          <div className="rounded-md overflow-hidden bg-gray-100 relative w-12 h-12">
                            <Image
                              src={
                                item.thumbnail
                                  ? process.env.NEXT_PUBLIC_AWS_URL +
                                    item.thumbnail
                                  : "/images/placeholder.jpg"
                              }
                              alt={item.itemName || ""}
                              width={100}
                              className="w-full h-full object-contain p-1 aspect-square"
                              height={100}
                              priority={true}
                            />
                            <PreferenceIcon
                              preference={item?.mealPreference || "VEG"}
                              className="absolute bottom-0 left-0 h-4 w-4"
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-sm">
                            {" "}
                            {menu?.name || "Menu not available"}
                            {refundQty > 0 && (
                              <Label className="text-xs text-blue-500 ">
                                Refunded x{refundQty}
                              </Label>
                            )}
                          </p>

                          <p className="text-xs text-gray-600">
                            {item.itemName}{" "}    {item.unit && (
                            <span className="text-xs text-gray-600 ">{`(${item.unit} ${item.unitType})`}</span>
                          )} 
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>x{qty}</TableCell>
                    <TableCell>{getPricingLabel(item.price || 0)}</TableCell>
                    <TableCell>
                      <p>{item.refundQuantity}</p>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ItemDetails;
