import EmailVerification from "@/components/EmailTemplates/templates/EmailVerification";
import prisma from "@/lib/db";
import { getRandomCustomerId } from "@/lib/helper";
import { sendEmail } from "@/lib/nodemailer";
import { ApiResponse } from "@/lib/response";
import { SignupInput, SignupSchema } from "@/types/zod/AuthSchema";

import { render } from "@react-email/components";
import bcrypt from "bcrypt";
export async function POST(request: Request) {
  try {
    const data: SignupInput = await request.json();
    const validation = await SignupSchema.safeParseAsync(data);
    if (!validation.success) {
      return ApiResponse(
        false,
        "Invalid input",
        400,
        validation.error.format()
      );
    }

    const { firstname, lastname, email, password } = validation.data;
    const userExists = await prisma.user.findUnique({
      where: { email },
    });
  

    if (userExists && userExists?.isVerified) {
      return ApiResponse(
        false,
        "An account with this email already exists. Please log in instead.",
        400
      );
    } else if (userExists && !userExists.isVerified) {
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const emailExpires = new Date(Date.now() + 10 * 60 * 1000);
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.update({
        where: { email },
        data: {
          email,
          name: firstname + " " + lastname,
          role: "CUSTOMER",
          customer: {
            upsert: {
              create: {
                firstName: firstname,
                lastName: lastname,
                email,
                password: hashedPassword,
                customerUniqueId: getRandomCustomerId(),
              },
              update: {
                firstName: firstname,
                lastName: lastname,
                email,
                password: hashedPassword,
              },
            },
          },
        },
      });

      await prisma.emailVerification.upsert({
        where: { email },
        update: {
          token: verificationCode,
          expires: emailExpires,
          email,
        },
        create: {
          token: verificationCode,
          expires: emailExpires,
          email,
        },
      });

      const html = await render(
        EmailVerification({
          username: firstname + " " + lastname,
          code: verificationCode.toString(),
        })
      );
      await sendEmail(email, "Verify your email", html);
      return ApiResponse(
        true,
        "Your account has been created successfully. Please verify your email to continue.",
        200
      );
    } else {
      const verifyCode = Math.floor(100000 + Math.random() * 900000);
      const emailExpirytime = new Date(new Date().getTime() + 60 * 60 * 1000);

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          email,
          name: firstname + " " + lastname,
          role: "CUSTOMER",
        },
      });

      const customer = await prisma.customer.create({
        data: {
          firstName: firstname,
          lastName: lastname,
          email,
          password: hashedPassword,
          customerUniqueId: getRandomCustomerId(),
          userId: newUser.id,
        },
      });

      await prisma.emailVerification.create({
        data: {
          token: verifyCode.toString(),
          expires: emailExpirytime,
          email,
        },
      });

      const html = await render(
        EmailVerification({
          username: firstname + " " + lastname,
          code: verifyCode.toString(),
        })
      );
      await sendEmail(email, "Verify your email", html);
      return ApiResponse(
        true,
        "Your account has been created successfully. Please verify your email to continue.",
        200
      );
    }
  } catch (error) {
    console.log(error);
    return ApiResponse(
      false,
      "Error while registering user. Please try again",
      500
    );
  }
}
