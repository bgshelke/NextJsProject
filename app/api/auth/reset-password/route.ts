
import ResetPassword from "@/components/EmailTemplates/templates/ResetPassword";
import prisma from "@/lib/db";
import { sendEmail } from "@/lib/nodemailer";

import { ApiResponse } from "@/lib/response";
import { render } from "@react-email/components";
import { hash } from "bcrypt";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (token) {
        const tokenResult = await decodedToken(token);
        if (!tokenResult || "status" in tokenResult) {
          return ApiResponse(false, "Invalid token or token expired", 404);
        }
        return ApiResponse(true, "Token is valid", 200);
    }
    return ApiResponse(false, "Invalid request", 400);
  } catch (error) {
    return ApiResponse(false, "Invalid token or token expired", 404);
  }
}

export async function POST(request: Request) {
  const { token, password, confirmPassword, email } = await request.json();

  try {
    if (token && password && confirmPassword) {
      return handlePasswordReset(token, password, confirmPassword);
    }

   
    if (email) {
      return initiatePasswordReset(email);
    }
    return ApiResponse(false, "Invalid request", 400);
  } catch (error) {
    console.error("Error in password reset process:", error);
    return ApiResponse(false, "Error resetting password", 500);
  } finally {
    prisma.$disconnect();
  }
}
async function decodedToken(token: string) {
  const decodedToken = jwt.verify(token, process.env.NEXTAUTH_SECRET as string);
  if (!decodedToken) {
    return ApiResponse(false, "Invalid token or token expired", 404);
  }
  const { userid } = decodedToken as jwt.JwtPayload;
  if (!userid) {
    return ApiResponse(false, "Invalid token or token expired", 404);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userid,
      customer: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
    },
  });

  if (!user) {
    return null;
  }
  return user;
}

async function handlePasswordReset(
  token: string,
  password: string,
  confirmPassword: string
) {
  if (password !== confirmPassword) {
    return ApiResponse(false, "Passwords do not match", 400);
  }
  const tokenResult = await decodedToken(token);
  if (!tokenResult || "status" in tokenResult) {
    return ApiResponse(false, "Invalid token or token expired", 404);
  }
  const hashedPassword = await hash(password, 10);
  await prisma.customer.update({
    where: { userId: tokenResult.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    },
  });

  return ApiResponse(true, "Password reset successful", 200);
}

async function initiatePasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return ApiResponse(false, "User not found", 404);
  }

  const user_token = jwt.sign(
    { userid: user.id, email: user.email },
    process.env.NEXTAUTH_SECRET as string,
    { expiresIn: "1h" }
  );

  await prisma.customer.update({
    where: { userId: user.id },
    data: {
      resetPasswordToken: user_token,
      resetPasswordExpiresAt: new Date(Date.now() + 3600000),
    },
  });

  const resetLink = `${process.env.NEXT_PUBLIC_URL}/reset-password?token=${user_token}`;
  const html = await render(ResetPassword({ resetLink, type: "RESET" }));
  await sendEmail(email, "Reset Password", html);
  // await transporter.sendMail({
  //   from: `${process.env.NOREPLYEMAIL} - ${process.env.EMAILFROMNAME}`,
  //   to: email,
  //   subject: "Reset Password",
  //   html: render(ResetPassword({ resetLink, type: "RESET" })),
  // });
  return ApiResponse(true, "Password reset link sent to email", 200);
}
