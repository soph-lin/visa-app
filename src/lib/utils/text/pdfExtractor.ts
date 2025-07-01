import extractText from 'react-pdftotext'

export interface PDFExtractionResult {
  text: string
  pages: number
}

export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  try {
    // Extract text from PDF using react-pdftotext
    const text = await extractText(file)
    
    return {
      text: text,
      pages: 1 // react-pdftotext doesn't provide page count, defaulting to 1
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF.')
  }
} 