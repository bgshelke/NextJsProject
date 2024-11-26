import { z } from "zod";

export const CouponSchema = z.object({
  code: z
    .string()
    .min(5, { message: "Code must be between 5 and 20 characters" })
    .max(20, { message: "Code must be between 5 and 20 characters" }),
  amount: z
    .string()
    .min(1, { message: "Amount is required" })
    .max(3, { message: "Amount must be between 1 and 3 characters" })
    .regex(/^\d+(\.\d{1,2})?$/, { message: "Invalid amount" }),
  coupenType: z.enum(["percentage", "amount"]),
  maxUsageLimit: z
    .string()
    .regex(/^\d+$/, { message: "Invalid max usage limit" })
    .optional(),
  expiry: z
    .date()
    .min(new Date(), { message: "Expiry date must be greater than today" })
    .optional(),
  addressUsageLimit: z
    .string()
    .regex(/^\d+$/, { message: "Invalid address usage limit" })
    .optional(),
});

export type CouponInputSchema = z.infer<typeof CouponSchema>;
