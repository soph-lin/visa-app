import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { updateClerkUser } from '../utils/clerk';
import { validateTravelHistory } from '../utils/validation';

export const onboardingRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email address'),
      profilePhoto: z.any().optional(),
      passportFile: z.any().optional(),
      resumeFile: z.any().optional(),
      i94File: z.any().optional(),
      passportUrl: z.string().optional(),
      resumeUrl: z.string().optional(),
      i94Url: z.string().optional(),
      travelHistory: z.object({
        entryDate: z.string().optional(),
        exitDate: z.string().optional(),
        country: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Onboarding mutation called with input:', input);
        console.log('User ID:', ctx.userId);

        // 1. Update Clerk user profile (name only - image handled separately)
        try {
          console.log('Attempting to update Clerk user...');
          const clerkUpdateResult = await updateClerkUser(ctx.userId!, {
            firstName: input.firstName,
            lastName: input.lastName,
          });

          if (!clerkUpdateResult.success) {
            console.warn(`Failed to update Clerk profile: ${clerkUpdateResult.error}`);
          } else {
            console.log('Clerk user updated successfully');
          }
        } catch (error) {
          console.warn('Error updating Clerk user:', error);
        }

        // 2. Create or update user in database
        const user = await ctx.prisma.user.upsert({
          where: { clerkUserId: ctx.userId },
          update: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            onboardingComplete: true,
          },
          create: {
            clerkUserId: ctx.userId,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            onboardingComplete: true,
          },
        });

        console.log('User created/updated:', user);

        // 3. Create document records in database (files are already uploaded via API route)
        const documentData = [];
        
        if (input.passportUrl) {
          documentData.push({ userId: user.id, url: input.passportUrl, type: 'passport' });
        }
        if (input.resumeUrl) {
          documentData.push({ userId: user.id, url: input.resumeUrl, type: 'resume' });
        }
        if (input.i94Url) {
          documentData.push({ userId: user.id, url: input.i94Url, type: 'i94' });
        }

        if (documentData.length > 0) {
          await ctx.prisma.document.createMany({
            data: documentData,
          });
          console.log('Documents created:', documentData);
        }

        // 4. Process travel history if provided and valid
        if (input.travelHistory && input.travelHistory.entryDate && input.travelHistory.exitDate && input.travelHistory.country) {
          try {
            const validation = validateTravelHistory({
              entryDate: input.travelHistory.entryDate,
              exitDate: input.travelHistory.exitDate,
              country: input.travelHistory.country,
            });

            if (validation.isValid) {
              await ctx.prisma.travelHistory.create({
                data: {
                  userId: user.id,
                  entryDate: new Date(input.travelHistory.entryDate),
                  exitDate: new Date(input.travelHistory.exitDate),
                  country: input.travelHistory.country,
                },
              });
              console.log('Travel history created');
            } else {
              console.warn('Invalid travel history data:', validation.errors);
            }
          } catch (error) {
            console.warn('Error creating travel history:', error);
          }
        }

        return { 
          success: true,
          userId: user.id,
        };
      } catch (error) {
        console.error('Onboarding submission error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    })
}); 