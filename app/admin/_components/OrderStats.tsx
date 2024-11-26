"use client";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  CardContent,
  CardDescription,
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
import { DateRange } from "react-day-picker";

const chartConfig = {
  subscriptionOrders: {
    label: "Subscription Orders",
    color: "hsl(var(--chart-1))",
  },
  oneTimeOrders: {
    label: "One-Time Orders",
    color: "hsl(var(--chart-2))",
  },
  pickupOrders: {
    label: "Pickup Orders",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

type OrderDataGraphType = {
  date: string;
  subscriptionOrders: number;
  oneTimeOrders: number;
  pickupOrders: number;
};

export function OrderStats({
  date,
  data,
  isLoading,
}: {
  date: DateRange | undefined;
  data: OrderDataGraphType[];
  isLoading: boolean;
}) {
    

  return (
    <div className="w-full bg-white p-2 rounded-lg">

      <CardHeader>
        <CardTitle>Order Statistics</CardTitle>
        <CardDescription>
          {date?.from?.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          {date?.to &&
            `- ${date.to.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} >
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
              })}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="subscriptionOrders"
              fill="var(--color-subscriptionOrders)"
              radius={4}
            />
            <Bar
              dataKey="oneTimeOrders"
              fill="var(--color-oneTimeOrders)"
              radius={4}
            />
            <Bar
              dataKey="pickupOrders"
              fill="var(--color-pickupOrders)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </div>
  );
}
