import { clerkClient } from '@clerk/nextjs/server'

export interface ClerkUpdateResult {
  success: boolean
  error?: string
}

export async function updateClerkUser(
  clerkUserId: string,
  updates: {
    firstName?: string
    lastName?: string
    profileImage?: File
  }
): Promise<ClerkUpdateResult> {
  try {
    const clerk = await clerkClient()
    const updateData: any = {}

    // Update name if provided
    if (updates.firstName !== undefined) {
      updateData.firstName = updates.firstName
    }
    if (updates.lastName !== undefined) {
      updateData.lastName = updates.lastName
    }

    // Update profile image if provided
    if (updates.profileImage) {
      try {
        console.log('Profile image details:', {
          name: updates.profileImage.name,
          size: updates.profileImage.size,
          type: updates.profileImage.type
        })
        
        // Upload the image to Clerk
        const imageUrl = await clerk.users.updateUserProfileImage(clerkUserId, {
          file: updates.profileImage
        })
        
        console.log('Profile image uploaded successfully:', imageUrl)
      } catch (error) {
        console.error('Error uploading profile image:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          status: (error as any)?.status,
          errors: (error as any)?.errors
        })
        // Continue with other updates even if image upload fails
      }
    }

    // Update user in Clerk
    await clerk.users.updateUser(clerkUserId, updateData)

    return { success: true }
  } catch (error) {
    console.error('Clerk update error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown Clerk update error' 
    }
  }
}

export async function getClerkUser(clerkUserId: string) {
  try {
    const clerk = await clerkClient()
    return await clerk.users.getUser(clerkUserId)
  } catch (error) {
    console.error('Error fetching Clerk user:', error)
    throw error
  }
} 