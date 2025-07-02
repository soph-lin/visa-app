import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API route called')
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const documentType = formData.get('documentType') as string

    console.log('Upload request data:', {
      fileName: file?.name,
      fileSize: file?.size,
      userId,
      documentType
    })

    if (!file || !userId || !documentType) {
      console.error('Missing required fields:', { file: !!file, userId, documentType })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'pdf'
    const fileName = `${documentType}_${timestamp}.${fileExtension}`
    const filePath = `user-documents/${userId}/${documentType}/${fileName}`

    console.log('Attempting to upload to Supabase:', filePath)
    
    // Upload file to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('user-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('File uploaded to Supabase successfully')

    // Generate signed URL for secure access
    const { data: urlData } = await supabaseAdmin.storage
      .from('user-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry

    if (!urlData?.signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: urlData.signedUrl,
      path: filePath
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 