import { z } from "zod";

export const SignupSchema = z.object({
  firstname: z
    .string()
    .min(3, { message: "First name is required" })
    .max(25, { message: "First name is too long" })
    .regex(/^[A-Za-z]+$/i, "Please enter a valid first name"),
  lastname: z
    .string()
    .min(3, { message: "Last name is required" })
    .max(25, { message: "Last name is too long" })
    .regex(/^[A-Za-z]+$/i, "Please enter a valid last name"),
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email" })
    .toLowerCase(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(70, { message: "Password is too long" })
    .refine((value) => /[!@#$%^&*()-_=+{};:,<.>]/.test(value), {
      message: "Password must contain at least one symbol",
    })
    .refine((value) => /[A-Z]/.test(value), {
      message: "Password must contain at least one uppercase letter",
    }),
});

export const EmailVerificationSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email" })
    .toLowerCase()
    .optional(),
  verifyCode: z
    .string()
    .min(6, { message: "Please enter a valid code" })
    .max(6, { message: "Please enter a valid code" }),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const SignupSchemaAdmin = z.object({
  firstName: z
    .string()
    .min(3, { message: "First name is required" })
    .max(25, { message: "First name is too long" })
    .regex(/^[A-Za-z]+$/i, "Please enter a valid first name"),
  lastName: z
    .string()
    .min(3, { message: "Last name is required" })
    .max(25, { message: "Last name is too long" })
    .regex(/^[A-Za-z]+$/i, "Please enter a valid last name"),
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email" })
    .toLowerCase(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(70, { message: "Password is too long" })
    .refine((value) => /[A-Z]/.test(value), {
      message: "Password must contain at least one uppercase letter",
    })
    .refine((value) => /[!@#$%^&*()-_=+{};:,<.>]/.test(value), {
      message: "Password must contain at least one symbol",
    }),
  token: z.string().min(1, { message: "Token is required" }),
});
export type SignupSchemaAdminInput = z.infer<typeof SignupSchemaAdmin>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(70, { message: "Password is too long" })
      .refine((value) => /[!@#$%^&*()-_=+{};:,<.>]/.test(value), {
        message: "Password must contain at least one symbol",
      })
      .refine((value) => /[A-Z]/.test(value), {
        message: "Password must contain at least one uppercase letter",
      }),
    confirmPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(70, { message: "Password is too long" })
      .refine((value) => /[!@#$%^&*()-_=+{};:,<.>]/.test(value), {
        message: "Password must contain at least one symbol",
      })
      .refine((value) => /[A-Z]/.test(value), {
        message: "Password must contain at least one uppercase letter",
      }),
  })
  .refine(
    (values) => {
      return values.password === values.confirmPassword;
    },
    {
      message: "Passwords must match!",
      path: ["confirmPassword"],
    }
  );

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
