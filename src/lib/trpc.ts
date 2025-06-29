import { initTRPC, TRPCError } from '@trpc/server';
import { prisma } from './database';
import superjson from 'superjson';

export const createTRPCContext = async (opts: { req: Request }) => {
  // For now, we'll handle auth in the middleware
  return {
    prisma,
    req: opts.req,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  // We'll implement proper auth later
  // For now, just pass through
  return next({
    ctx: {
      ...ctx,
      userId: 'temp-user-id', // Placeholder
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed); 