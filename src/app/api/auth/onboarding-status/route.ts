import { prisma } from "@/lib/database";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clerkUserId = searchParams.get('userId');
  
  if (!clerkUserId) {
    return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
  }
  
  try {
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
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
} 