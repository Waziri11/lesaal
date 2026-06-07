import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../lib/auth";

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Session expired.",
          code: "SESSION_EXPIRED",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to verify admin session", error);
    return NextResponse.json(
      {
        error: "Unable to verify session.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
