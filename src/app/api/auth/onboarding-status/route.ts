/*
Onboarding status route is created in API layer and not in tRPC because tRPC didn't work in middleware.
May need to revisit this later if there is a solution, but hey this works.
*/

import { prisma } from "@/lib/database";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clerkUserId = searchParams.get('userId');
  
  if (!clerkUserId) {
    return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
  }
  
  try {
    // Test database connection first
    await prisma.$connect();
    
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { onboardingComplete: true }
    });
    
    return NextResponse.json({ 
      hasCompletedOnboarding: user?.onboardingComplete || false,
      userExists: !!user 
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    
    // If it's a connection error, return a default response
    if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
      console.log('Database connection failed, returning default response');
      return NextResponse.json({ 
        hasCompletedOnboarding: false,
        userExists: false,
        error: 'Database temporarily unavailable'
      });
    }
    
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 