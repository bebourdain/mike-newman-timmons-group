import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

// Test-only endpoint to retrieve captured OTPs for E2E testing
// Only available in non-production environments
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  try {
    const ctx = await auth.$context;
    const otp = await (ctx as any).test?.getOTP(email);
    if (otp) {
      return NextResponse.json({ otp });
    }
    // Next route bundles can have separate testUtils memory. Read only an
    // unexpired plaintext test OTP, never return a hash or an expired code.
    const record = await prismadb.verification.findFirst({
      where: { identifier: `sign-in-otp-${email.trim().toLowerCase()}`, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { value: true },
    });
    const storedOtp = record?.value.match(/^(\d{6}):\d+$/)?.[1];
    if (storedOtp) return NextResponse.json({ otp: storedOtp });
    return NextResponse.json({ error: "No OTP found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "testUtils not enabled" }, { status: 500 });
  }
}
