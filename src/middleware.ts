import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/api/webhooks/clerk', '/api/auth/onboarding-status', '/api/trpc(.*)', '/api/upload', '/api/upload-profile-image'])

export default clerkMiddleware(async (auth, req) => {
  console.log('Middleware running for:', req.url)
  
  // Check if user is trying to access onboarding page
  const isOnboardingPage = req.nextUrl.pathname === '/onboarding'
  
  if (!isPublicRoute(req)) {
    console.log('Protected route, checking auth...')
    await auth.protect()
    
    // After authentication, check onboarding status
    const { userId } = await auth()
    console.log('User ID from auth:', userId)
    
    if (userId) {
      try {
        // Call our API endpoint to check onboarding status
        const baseUrl = req.nextUrl.origin;
        const response = await fetch(`${baseUrl}/api/auth/onboarding-status?userId=${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Onboarding status:', data);
          
          if (isOnboardingPage) {
            // If user is trying to access onboarding but has completed it, redirect to home
            if (data.userExists && data.hasCompletedOnboarding) {
              console.log('User has completed onboarding, redirecting to home...');
              return NextResponse.redirect(new URL('/', req.url));
            }
          } else {
            // If user doesn't exist or hasn't completed onboarding, redirect to onboarding
            if (!data.userExists || !data.hasCompletedOnboarding) {
              console.log('Redirecting to onboarding...');
              return NextResponse.redirect(new URL('/onboarding', req.url));
            }
            
            console.log('User has completed onboarding, allowing access');
          }
        } else {
          console.error('Failed to check onboarding status:', response.status);
        }
      } catch (error) {
        // If there's an error, allow access (fail open)
        console.error('Error checking onboarding status:', error);
      }
    }
  } else {
    console.log('Public route, allowing access');
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