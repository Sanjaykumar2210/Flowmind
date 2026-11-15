import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError } from "@/app/api/_helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Unauthorized", 401);
    }
    return NextResponse.json({ success: true, data: { user: session } }, { status: 200 });
  } catch {
    console.error("[me] Request failed");
    return apiError("Internal server error", 500);
  }
}
