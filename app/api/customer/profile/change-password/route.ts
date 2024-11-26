import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import ResetPassword from "@/components/EmailTemplates/templates/ResetPassword";
import prisma from "@/lib/db";
import { sendEmail } from "@/lib/nodemailer";

import { ApiResponse } from "@/lib/response";
import { changePasswordSchema } from "@/types/zod/CustomerSchema";
import { render } from "@react-email/components";
import { hash, compare } from "bcrypt";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return ApiResponse(false, "Unauthorized", 401);
    }

    const data = await req.json();
    const validate = await changePasswordSchema.safeParseAsync(data);

    if (!validate.success) {
      return ApiResponse(false, "Invalid input", 400, validate.error.format());
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!customer) {
      return ApiResponse(false, "User not found", 404);
    }

    const { currentPassword, newPassword, confirmNewPassword } = validate.data;

    if (newPassword !== confirmNewPassword) {
      return ApiResponse(
        false,
        "New password and confirm password do not match.",
        400
      );
    }

    if (!customer.password) {
       //set new password for google and apple provider

       const hashedPassword = await hash(newPassword, 10);
       await prisma.customer.update({
         where: {
           userId: session.user.id,
         },
         data: {
           password: hashedPassword,
         },
      });
      return ApiResponse(true, "New password set successfully.", 200);
    }

    const isCurrentPasswordValid = await compare(
      currentPassword,
      customer.password
    );
    if (!isCurrentPasswordValid) {
      return ApiResponse(false, "Current password is incorrect", 400);
    }

    const isSamePassword = await compare(newPassword, customer.password);
    if (isSamePassword) {
      return ApiResponse(
        false,
        "New password must be different from the current password.",
        400
      );
    }

    const hashedPassword = await hash(newPassword, 10);
    await prisma.customer.update({
      where: {
        userId: session.user.id,
      },
      data: {
        password: hashedPassword,
      },
    });
    const html = await render(
      ResetPassword({
        type: "CHANGE",
      })
    );
    await sendEmail(customer.email, "Your password has been updated.", html);

    return ApiResponse(true, "Password updated.", 200);
  } catch (error) {
    console.log("Error while changing password", error);
    return ApiResponse(false, "Something went wrong. Please try again.", 500);
  } finally {
    await prisma.$disconnect();
  }
}
