import User from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { z } from "zod";
import { verifySchema } from "@/schemas/verifySchema";


export async function POST(request: Request) {
  await dbConnect();

  try {
    const { username, code } = await request.json();

    // Validate with zod
    const result = verifySchema.safeParse({ code: code });
    console.log(result); // TODO: remove

    if (!result.success) {
      const codeErrors = result.error.format().code?._errors || [];
      return Response.json(
        {
          success: false,
          message:
            codeErrors?.length > 0
              ? codeErrors.join(", ")
              : "Invalid code value",
        },
        { status: 400 }
      );
    }

    const { code: verificationCode } = result.data;
    

    const decodedUsername = decodeURIComponent(username); // For checking uri
    const user = await User.findOne({
        username: decodedUsername
    });

    if (!user) {
        return Response.json({
            success: false,
            message: "User not found"
        }, { status: 500 })
    }

    const isCodeValid = user.verifyCode === code;
    const isCodeNotExpired = new Date(user.verifyCodeExpiry) > new Date();

    if (isCodeValid && isCodeNotExpired) {
        user.isVerified = true
        await user.save();
        return Response.json(
            {
              success: true,
              message: "Account verified successfully",
            },
            { status: 200 }
          );
    } else if (!isCodeNotExpired) {
        return Response.json(
            {
              success: false,
              message: "Verification code has expired, please signup again to get a new code",
            },
            { status: 400 }
          );
    } else {
        return Response.json(
            {
              success: false,
              message: "Incorrect Verification code",
            },
            { status: 400 }
          );
    }

  } catch (error) {
    console.error("Error verifying user", error);
    return Response.json(
      {
        success: false,
        message: "Error verifying user",
      },
      { status: 500 }
    );
  }
}