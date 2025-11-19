// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      // hanya izinkan kalau ada token & rolenya admin
      return !!token && (token as { role?: string }).role === "admin";
    },
  },
});

export const config = {
  matcher: ["/admin/:path*"], // semua route /admin wajib login
};
