import { NextAuthConfig } from 'next-auth';
import CredentialProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient()

const authConfig = {
  session: { strategy: "jwt" },
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? ''
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID ?? '',
      clientSecret: process.env.GOOGLE_SECRET ?? ''
    }),
    CredentialProvider({
      credentials: {
        email: {
          type: 'email'
        },
        password: {
          type: 'password'
        }
      },
      async authorize(credentials, req) {
        try {
          // Query the database for a user with the provided email
          const user = await prisma.user.findUnique({
            where: {
              email: credentials?.email as string
            }
          });
          // If no user is found, or the password doesn't match, return null
          if (!user || !(await bcrypt.compare(credentials?.password as string, user.hashedPassword as string ))) {
            return null;
          }
          return user; // Success
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
        // const user = {
        //   id: '1',
        //   name: 'John',
        //   email: credentials?.email as string
        // };
        // if (user) {
        //   // Any object returned will be saved in `user` property of the JWT
        //   return user;
        // } else {
        //   // If you return null then an error will be displayed advising the user to check their details.
        //   return null;

        //   // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
        // }
      }
    })
  ],
  pages: {
    signIn: '/' //sigin page
  },
  secret: process.env.NEXTAUTH_SECRET, 
  callbacks:{
    signIn: async ({ user, account }) => {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          console.log(user, account);
          const {email, name, image, id, provider, providerAccountId } = user as any;
          const alreadyUser = await prisma.user.findUnique({
            where: {
              email: user.email as string
            }
          });

          if (!alreadyUser) {
            await prisma.user.create({
              data: {
                email: email as string,
                name: name as string,
                image: image as string,
                providerName: provider as string,
                providerId: id as string,
                providerAccountId: providerAccountId as string,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            return true;
          } else {
            return true;
          }
        } catch (error) {
          throw new Error("Error while creating user");
        }
      }
      if (account?.provider === "credentials") {
        return true;
      } else {
        return false;
      }
    },
  }
} satisfies NextAuthConfig;

export default authConfig;
