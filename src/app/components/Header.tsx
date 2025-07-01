'use client'

import { usePathname } from 'next/navigation'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

export function Header() {
  const pathname = usePathname()

  // Hide header on onboarding page
  if (pathname === '/onboarding') {
    return null
  }

  return (
    <header className="flex justify-end items-center p-4 gap-4 h-16">
      <SignedOut>
        <SignInButton
          forceRedirectUrl="/onboarding"
          fallbackRedirectUrl="/onboarding"
          mode="modal"
        />
        <SignUpButton
          forceRedirectUrl="/onboarding"
          fallbackRedirectUrl="/onboarding"
          mode="modal"
        >
          <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  )
}
