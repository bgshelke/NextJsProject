import { z } from "zod";

export const customerProfileSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 3 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 3 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z
  .string().min(1, { message: "Phone number is required" })
  .regex(/^\d{10}$/, { message: "Invalid phone number. Please enter a valid 10-digit phone number" }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, {
      message: "Please enter your current password.",
    }),
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(70, { message: "Password is too long" })
      .refine((value) => /[!@#$%^&*()-_=+{};:,<.>]/.test(value), {
        message: "Password must contain at least one symbol",
      })
      .refine((value) => /[A-Z]/.test(value), {
        message: "Password must contain at least one uppercase letter",
      }),
    confirmNewPassword: z.string().min(1, {
      message: "Please enter your new password.",
    }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;

export const subscriptionCancelSchema = z
  .object({
    reason: z.string({
      required_error: "Please select a reason.",
    }),
    otherReason: z.string().optional(),
  })
  .refine(
    (data: { reason: string; otherReason?: string }) => {
      return data.reason !== "Other" || data.otherReason;
    },
    {
      message: "Please specify your reason",
      path: ["otherReason"],
    }
  );

export type SubscriptionCancelInput = z.infer<typeof subscriptionCancelSchema>;
