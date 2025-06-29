import { createTRPCRouter } from '../trpc';
import { onboardingRouter } from './onboarding';
import { userRouter } from './user';

export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter; 