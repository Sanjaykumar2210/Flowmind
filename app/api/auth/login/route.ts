import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { comparePassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { apiError } from "@/app/api/_helpers";
import { env } from "@/lib/config/env";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid login request", 400);
    }

    const { email, password } = parsed.data;

    // Find user with their primary workspace membership
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { workspace: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user) {
      return apiError("Invalid email or password", 401);
    }

    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      return apiError("Invalid email or password", 401);
    }

    const membership = user.memberships[0];
    if (!membership) {
      return apiError("No workspace found for this account", 403);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId: membership.workspaceId,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          workspaceId: membership.workspaceId,
        },
      },
      { status: 200 }
    );

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    console.error("[login] Request failed");
    return apiError("Internal server error", 500);
  }
}
