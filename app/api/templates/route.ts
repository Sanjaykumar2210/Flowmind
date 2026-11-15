import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const templates = await prisma.workflowTemplate.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return apiSuccess({ templates });
  } catch {
    console.error("[templates list] Request failed");
    return apiError("Failed to fetch templates", 500);
  }
}

