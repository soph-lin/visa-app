import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from './lib/database'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/onboarding', '/api/webhooks/clerk'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
    
    // After authentication, check onboarding status
    const { userId } = await auth()
    if (userId) {
      try {
        // Check if user has completed onboarding in database
        const user = await prisma.user.findUnique({
          where: { clerkUserId: userId },
          select: { onboardingComplete: true }
        })
        
        // If user doesn't exist or hasn't completed onboarding, redirect to onboarding
        if (!user || !user.onboardingComplete) {
          return NextResponse.redirect(new URL('/onboarding', req.url))
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        // If there's an error, allow access (fail open)
      }
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}