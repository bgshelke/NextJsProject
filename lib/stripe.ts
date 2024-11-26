import { Customer } from "@prisma/client";
import Stripe from "stripe";
type StripeCustomerType = {
  email: string;
  fullName: string;
  phone: string;
  source?: string;
};

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const getTaxRateStripe = async (taxRate: number) => {
  const stripeTaxRate = await stripe.taxRates.create({
    display_name: "Sales Tax",
    description: `${taxRate}% sales tax`,
    percentage: taxRate,
    inclusive: false,
    country: "US",
    jurisdiction: "US",
    tax_type: "sales_tax",
  });
  return stripeTaxRate;
};

export const createStripeCustomer = async ({
  customer,
}: {
  customer: StripeCustomerType;
}) => {
  try {
    let stripeCustomer;
    const existingStripeCustomers = await stripe.customers.list({
      email: customer.email,
      limit: 1,
    });

    if (existingStripeCustomers.data.length === 0) {
      stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.fullName,
        phone: customer.phone ? customer.phone : undefined,
        source: customer.source ? customer.source : undefined,
      });
    } else {
      stripeCustomer = existingStripeCustomers.data[0];
    }
    return stripeCustomer;
  } catch (error) {
    console.log(error);
    throw Error("Error creating stripe customer");
  }
};

export const createStripePayment = async ({
  amountToPay,
  description = "",
  paymentMethodId,
  customer,
}: {
  amountToPay: number;
  description?: string;
  paymentMethodId: string;
  customer: StripeCustomerType;
}) => {
  try {
    
    const stripeCustomer = await createStripeCustomer({ customer });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountToPay * 100), 
      currency: "usd",
      payment_method_types: ["card"],
      payment_method: paymentMethodId ? paymentMethodId : undefined,
      customer: stripeCustomer.id,
      description: description,
      confirm: true,
    });
    return paymentIntent;
  } catch (error) {
    throw error;
  }
};
