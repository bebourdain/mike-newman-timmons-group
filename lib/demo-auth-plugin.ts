import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { verifyDemoAccess } from "@/lib/demo-access";

export const demoAccess = () => ({
  id: "demo-access",
  endpoints: {
    signInDemo: createAuthEndpoint("/sign-in/demo", {
      method: "POST",
      body: z.object({ email: z.string().trim().email().max(254), code: z.string().max(64) }),
    }, async (ctx) => {
      const access = await verifyDemoAccess(ctx.body.email, ctx.body.code);
      if (!access) throw ctx.error("UNAUTHORIZED", { message: "Demo access is unavailable or the email and code do not match." });
      const user = await ctx.context.internalAdapter.findUserById(access.userId);
      if (!user || access.expiresAt.getTime() <= Date.now()) {
        throw ctx.error("UNAUTHORIZED", { message: "Demo access is unavailable or the code is invalid." });
      }
      const session = await ctx.context.internalAdapter.createSession(
        user.id, true, { expiresAt: access.expiresAt }, true,
      );
      if (!session) throw ctx.error("INTERNAL_SERVER_ERROR", { message: "Unable to create demo session." });
      await setSessionCookie(ctx, { session, user }, true, { expires: access.expiresAt });
      return ctx.json({ success: true });
    }),
  },
});
