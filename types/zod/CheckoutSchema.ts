import { z } from "zod";

const usZipCodeRegex = /^\d{5}(-\d{4})?$/;
export const billingAddressSchema = z.object({
  fullName: z.string().min(1, { message: "Full name is required" }),
  addressLine1: z.string().min(1, { message: "Address is required" }),
  addressLine2: z.string().optional(),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(1, { message: "State is required" }),
  zipCode: z
  .string()
  .regex(usZipCodeRegex, { message: "Invalid US zip code" }),
});

export const shippingAddressSchema = billingAddressSchema.extend({
  phone: z
  .string().min(1, { message: "Phone number is required" })
  .regex(/^\d{10}$/, { message: "Invalid phone number. Please enter a valid 10-digit phone number" }),
  deliveryInstructions: z.string().optional(),
  default: z.boolean().optional(),
  addressType: z.enum(["HOME", "WORK"]).optional(),
});

export type BillingInput = z.infer<typeof billingAddressSchema>;
export type ShippingInput = z.infer<typeof shippingAddressSchema>;


