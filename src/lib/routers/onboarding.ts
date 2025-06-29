import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const onboardingRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(z.object({
      name: z.string(),
      dob: z.string(),
      passportUrl: z.string().url(),
      resumeUrl: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      // For now, we'll create a user if it doesn't exist
      const user = await ctx.prisma.user.upsert({
        where: { clerkUserId: ctx.userId },
        update: {
          dob: new Date(input.dob),
          onboardingComplete: true,
        },
        create: {
          clerkUserId: ctx.userId,
          email: 'temp@example.com', // We'll get this from Clerk later
          dob: new Date(input.dob),
          onboardingComplete: true,
        },
      });

      await ctx.prisma.document.createMany({
        data: [
          { userId: user.id, url: input.passportUrl, type: 'passport' },
          { userId: user.id, url: input.resumeUrl, type: 'resume' },
        ],
      });

      return { success: true };
    })
}); 