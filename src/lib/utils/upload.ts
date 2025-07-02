import { supabaseAdmin } from '../supabase'

export interface UploadResult {
  url: string
  path: string
  error?: string
}

export async function uploadFile(
  file: any, // Changed from File to any since tRPC serializes File objects
  userId: string,
  documentType: 'passport' | 'resume' | 'i94'
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now()
    const fileName = file.name || `${documentType}_${timestamp}`
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'pdf'
    const finalFileName = `${documentType}_${timestamp}.${fileExtension}`
    const filePath = `user-documents/${userId}/${documentType}/${finalFileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('user-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { url: '', path: '', error: error.message }
    }

    // Generate signed URL for secure access
    const { data: urlData } = await supabaseAdmin.storage
      .from('user-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry

    if (!urlData?.signedUrl) {
      return { url: '', path: filePath, error: 'Failed to generate signed URL' }
    }

    return {
      url: urlData.signedUrl,
      path: filePath
    }
  } catch (error) {
    console.error('File upload error:', error)
    return { 
      url: '', 
      path: '', 
      error: error instanceof Error ? error.message : 'Unknown upload error' 
    }
  }
}

export async function deleteFile(filePath: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabaseAdmin.storage
      .from('user-documents')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return { error: error.message }
    }

    return {}
  } catch (error) {
    console.error('File deletion error:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown deletion error' 
    }
  }
} 