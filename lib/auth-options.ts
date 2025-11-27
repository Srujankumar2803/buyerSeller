import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email || "",
          name: user.name || "",
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt", // Required for CredentialsProvider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth
      if (account?.provider === "google") {
        try {
          // Ensure email is verified by Google
          const googleProfile = profile as { email_verified?: boolean; email?: string };
          if (!googleProfile.email_verified) {
            console.error("Google email not verified");
            return false;
          }

          // Validate email domain (prevent fake emails)
          const email = user.email!.toLowerCase();
          const domain = email.split('@')[1];
          const invalidDomains = ['example.com', 'test.com', 'localhost', 'temp.com', 'fake.com', 'domain.com'];
          if (invalidDomains.includes(domain) || !domain.includes('.') || domain.endsWith('.local')) {
            console.error("Invalid email domain:", domain);
            return false;
          }

          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!existingUser) {
            // Create new user for Google OAuth
            const newUser = await prisma.user.create({
              data: {
                email,
                name: user.name,
                image: user.image,
                role: "BUYER", // Default role for OAuth users
              },
            });
            
            // Link the account to the user
            await prisma.account.create({
              data: {
                userId: newUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null,
              },
            });
          } else {
            // Check if account is already linked
            const existingAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
            });

            // If account doesn't exist, link it
            if (!existingAccount) {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state as string | null,
                },
              });
            }
          }
        } catch (error) {
          console.error("Error in Google OAuth:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in - get user from database
      if (user) {
        token.id = user.id;
        token.role = user.role;
      } else if (account?.provider === "google" && token.email) {
        // For Google OAuth, fetch user from database if not in token
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Add role, id, and image to session from token
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "BUYER" | "SELLER";
        
        // Fetch user image from database
        if (token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { image: true, avatarImageId: true },
          });
          if (dbUser?.image) {
            session.user.image = dbUser.image;
          } else if (dbUser?.avatarImageId) {
            session.user.image = `/api/images/${dbUser.avatarImageId}`;
          }
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
