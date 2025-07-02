import { initTRPC, TRPCError } from '@trpc/server';
import { prisma } from './database';
import superjson from 'superjson';
import { auth } from '@clerk/nextjs/server';

export const createTRPCContext = async (opts: { req: Request }) => {
  const { userId } = await auth();
  
  return {
    prisma,
    req: opts.req,
    userId,
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
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed); 