import { Button } from "@/components/ui/button";
import React, { useRef } from "react";
import { DateRange } from "react-day-picker";
import { TrendingUp } from "lucide-react";
import {
  Label,
  LabelList,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Sector,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReactToPrint } from "react-to-print";
import { Item, OrderItem, UnitType } from "@prisma/client";
import { useItems } from "@/contexts/ItemContext";
import { Skeleton } from "@/components/ui/skeleton";
import { PieSectorDataItem } from "recharts/types/polar/Pie";
function KitchenMenuData({
  data,
  date,
  menuDataLoading,
}: {
  data: any;
  date: DateRange | undefined;
  menuDataLoading: boolean;
}) {
  const { items } = useItems();
  const contentToPrint = useRef(null);

  const dateFrom = date?.from || new Date();
  const contentRef = useRef(null);
  const formattedFromDate = dateFrom?.toISOString().split("T")[0];
  const formattedToDate = date?.to?.toISOString().split("T")[0];


  const handlePrint = useReactToPrint({
    documentTitle: `Menu of ${formattedFromDate} - ${formattedToDate}`,
    pageStyle: `@page { size: 500px; margin: 0;  }`,
  });

  const topOrderedItems = data
    ?.map((orderItem: OrderItem, index: number) => {
      const item = items.find((item) => item.id === orderItem.itemId);
      if (!item) return null;
      return {
        name: item.itemName,
        count: orderItem.quantity,
        unit: item.unit,
        unitType: item.unitType,
        fill: `hsl(var(--chart-${index + 1}))`,
      };
    })
    .filter(Boolean); 

  const chartData = topOrderedItems?.map((item: any) => ({
    name: item.name,
    count: item.count,
    fill: item.fill,
  }));

  const chartConfig: ChartConfig = {
    count: {
      label: "Count",
    },
    ...topOrderedItems?.reduce(
      (acc: any, item: any, index: number) => ({
        ...acc,
        [item.name]: {
          label: item.name,
          color: item.fill,
        },
      }),
      {}
    ),
  };

  return (
    <div className="bg-white  p-6  rounded-lg" ref={contentToPrint}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-sm font-semibold">
          {dateFrom?.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          {date?.to &&
            `- ${date.to.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })} `} {" "}
          Orders
        </h1>
        <Button
          variant="outline"
          size={"sm"}
          onClick={() => {
            handlePrint();
          }}
          className="print:hidden"
        >
          Download Print
        </Button>
      </div>
      {menuDataLoading && <>
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-96 w-full " />
      </>}
      {data && (
        <div>
          <div className="flex flex-col print:hidden">
            <CardHeader className="items-center pb-0">
              <CardTitle>Top Ordered Items</CardTitle>
              <CardDescription>
                {formattedFromDate} {formattedToDate && `- ${formattedToDate}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 relative">
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {chartData
                                  .reduce(
                                    (sum: number, item: any) =>
                                      sum + item.count,
                                    0
                                  )
                                  .toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Orders
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                    className="-translate-y-2 flex-wrap gap-2 "
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topOrderedItems?.length > 0 ? (
                topOrderedItems.map((item: any) => (
                  <TableRow key={item.name}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.count}</TableCell>
                    <TableCell>
                      {item.unit * item.count}{" "}
                      <span className="text-xs text-gray-500">
                        {item.unitType}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default KitchenMenuData;
