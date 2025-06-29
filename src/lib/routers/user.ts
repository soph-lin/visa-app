import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';

export const userRouter = createTRPCRouter({
  // Create or get user from Clerk auth
  createOrGetUser: publicProcedure
    .input(z.object({
      clerkUserId: z.string(),
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.upsert({
        where: { clerkUserId: input.clerkUserId },
        update: {}, // Don't update anything if user exists
        create: {
          clerkUserId: input.clerkUserId,
          email: input.email,
          onboardingComplete: false,
        },
      });
      
      return user;
    }),

  // Check if user has completed onboarding
  getOnboardingStatus: publicProcedure
    .input(z.object({
      clerkUserId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkUserId: input.clerkUserId },
        select: { 
          id: true,
          onboardingComplete: true,
          email: true,
        }
      });
      
      return user;
    }),
}); 