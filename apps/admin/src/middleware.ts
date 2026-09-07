import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Authentication only — authorization is done server-side against the
// database (requireAdmin / the admin layout guard), never here in the edge
// runtime where Postgres is unavailable.
const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();
  if (isProtectedRoute(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.nextUrl.toString() });
  }
});

export const config = {
  // Run on every request except static assets so that `auth()` works in all
  // route handlers (e.g. /api/admin/*, /api/auth/session).
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};