import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { User as UserAuth } from "next-auth";
import mongoose from "mongoose";

export async function GET(request: Request) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const user: UserAuth = session?.user as UserAuth;

  if (!session || !session.user) {
    return Response.json(
      {
        success: false,
        message: "Not authenticated",
      },
      { status: 401 }
    );
  }

  const userId = new mongoose.Types.ObjectId(user._id);

  try {
    const user = await User.aggregate([
        { $match: {id: userId} }, // First pipeline
        { $unwind: '$messages' }, // Second pipeling
        { $sort: {'messages.createdAt': -1}}, // Third pipeline
        { $group: { _id: '$_id', messages: { $push: '$messages'} }} // Fourth pipeline
    ])

    if (!user || user.length === 0) {
        return Response.json(
            {
              success: false,
              message: "User not found",
            },
            { status: 401 }
          );
    }
    return Response.json(
        {
          success: true,
          messages: user[0].messages,
        },
        { status: 200 }
      );


  } catch (error) {
    console.log("An unexpected error occured", error);
    
    return Response.json(
        {
            success: false,
            message: "An unexpected error occured"
        },
        {
            status: 500
        }
    )
  }
}
