// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const username = credentials.username;
        const password = credentials.password;

        const validUser = process.env.ADMIN_USERNAME ?? "";
        const validPass = process.env.ADMIN_PASSWORD ?? "";

        if (!validUser || !validPass) {
          console.error("ADMIN_USERNAME / ADMIN_PASSWORD belum di-set");
          return null;
        }

        if (username !== validUser || password !== validPass) {
          return null;
        }

        // user yang nanti disimpan di session
        return {
          id: "admin",
          name: "Admin",
          role: "admin" as const,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as { role?: string }).role =
        (token as { role?: string }).role ?? "admin";
      return session;
    },
  },
  pages: {
    signIn: "/login", // kita pakai halaman login custom
  },
};
