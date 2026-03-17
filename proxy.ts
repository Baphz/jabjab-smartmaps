import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/sign-up(.*)",
  "/accept-invitation(.*)",
]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAdminApiRoute = createRouteMatcher(["/api/admin(.*)"]);
const isLabsMutationRoute = createRouteMatcher(["/api/labs(.*)"]);

export default clerkMiddleware(
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

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
