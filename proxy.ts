import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    process.env.CLERK_SECRET_KEY?.trim()
);

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/sign-up(.*)",
  "/accept-invitation(.*)",
]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAdminApiRoute = createRouteMatcher(["/api/admin(.*)"]);
const isLabsMutationRoute = createRouteMatcher(["/api/labs(.*)"]);

const clerkProxy = clerkMiddleware(
  async (auth, request) => {
    if (isPublicRoute(request)) {
      return;
    }

    if (
      isAdminRoute(request) ||
      isAdminApiRoute(request) ||
      (isLabsMutationRoute(request) && request.method !== "GET")
    ) {
      await auth.protect();
    }
  },
  {
    signInUrl: "/login",
  }
);

export default clerkConfigured
  ? clerkProxy
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
