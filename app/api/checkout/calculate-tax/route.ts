import { stripe } from "@/lib/stripe";
import { BillingInfo, ResponseType } from "@/types/main";
import { NextResponse } from "next/server";

type CalculateTaxRequest = {
  address: BillingInfo;
  total: number;
  deliveryFees: number;
};

export async function POST(req: Request) {
  const { address, total, deliveryFees } =
    (await req.json()) as CalculateTaxRequest;
  const shippingCost = (deliveryFees || 0) * 100;
  try {
    const calculation = await stripe.tax.calculations.create({
      currency: "usd",
      customer_details: {
        address: {
          line1: address.addressLine1,
          city: address.city,
          state: address.state,
          postal_code: address.zipCode,
          country: "US",
        },
        address_source: "billing",
      },
      line_items: [
        {
          amount: total * 100,
          reference: "Dababhwala Web Checkout",
        },
      ],
      shipping_cost: {
        amount: shippingCost,
      },
    });
    const onlySpecificDetails = {
      tax_amount_exclusive: calculation.tax_amount_exclusive / 100,
      tax_rate:
        calculation.tax_breakdown[0].tax_rate_details.percentage_decimal,
      amount_total: calculation.amount_total / 100,
    };

    return NextResponse.json<ResponseType>(
      {
        success: true,
        message: "Tax calculated successfully",
        data: onlySpecificDetails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);

    return NextResponse.json<ResponseType>(
      {
        success: false,
        message: "Error calculating tax",
      },
      { status: 500 }
    );
  }
}
