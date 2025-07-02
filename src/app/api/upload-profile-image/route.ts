import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Profile image upload API route called')
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    console.log('Profile image upload request data:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userId
    })

    if (!file || !userId) {
      console.error('Missing required fields:', { file: !!file, userId })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type)
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    console.log('Uploading profile image to Clerk...')
    
    // Upload the image to Clerk
    const clerk = await clerkClient()
    const imageUrl = await clerk.users.updateUserProfileImage(userId, {
      file: file
    })

    console.log('Profile image uploaded successfully:', imageUrl)

    return NextResponse.json({
      url: imageUrl
    })
  } catch (error) {
    console.error('Profile image upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 