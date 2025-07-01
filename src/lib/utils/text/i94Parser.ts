export interface I94TravelData {
  entryDate: string | null
  exitDate: string | null
  country: string | null
}

export function parseI94Text(text: string): I94TravelData {
  const result: I94TravelData = {
    entryDate: null,
    exitDate: null,
    country: null
  }

  try {
    // Clean up the text by removing excessive spaces and normalizing
    let cleanedText = text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s*([:.])\s*/g, '$1 ') // Normalize spacing around colons and periods
      .trim()
    
    // Fix specific known issues
    cleanedText = cleanedText
      .replace(/Ca\s+nada/g, 'Canada')
      .replace(/AmerJca/g, 'America')
      .replace(/Unt\s+il/g, 'Until')
      .replace(/prov\s+ided/g, 'provided')
      .replace(/a\s+dmitting/g, 'admitting')
      .replace(/a\s+dmission/g, 'admission')
      .replace(/a\s+liens/g, 'aliens')
      .replace(/a\s+gen\s+cy/g, 'agency')
      .replace(/a\s+ddit\s+ion\s+al/g, 'additional')
      .replace(/rec\s+om\s+men\s+d/g, 'recommend')
      .replace(/retriev\s+in\s+g/g, 'retrieving')
      .replace(/w\s+eb\s+site/g, 'website')
      .replace(/const\s+itutes/g, 'constitutes')
      .replace(/law\s+ful/g, 'lawful')
      .replace(/in\s+form\s+a\s+tion/g, 'information')
      .replace(/brow\s+ser/g, 'browser')
      .replace(/fin\s+ished/g, 'finished')
      .replace(/num\s+ber/g, 'number')
      .replace(/Ex\s+pi\s+rat\s+ion/g, 'Expiration')
      .replace(/D\s+ate/g, 'Date')
      .replace(/No\s+\./g, 'No.')
      .replace(/https:\s*\/\s*\/\s*/g, 'https://')
      .replace(/cbp\s*\.\s*dhs\s*\.\s*gov/g, 'cbp.dhs.gov')

    // Extract entry date - look for "Most Recent Date of Entry"
    const entryDateMatch = cleanedText.match(/Most Recent Date of Entry:\s*(\d{4}\s+\w+\s+\d{1,2})/i)
    if (entryDateMatch) {
      const dateStr = entryDateMatch[1]
      // Convert "2015 May 2" to "2015-05-02" format
      const [year, month, day] = dateStr.split(' ')
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase())
      if (monthIndex !== -1) {
        // Use UTC to avoid timezone issues
        const date = new Date(Date.UTC(parseInt(year), monthIndex, parseInt(day)))
        if (!isNaN(date.getTime())) {
          result.entryDate = date.toISOString().split('T')[0]
        }
      }
    }

    // Extract exit date - look for "Admit Until Date" (handle typos like "Unt il")
    const exitDateMatch = cleanedText.match(/Admit\s+Until\s+Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
                         cleanedText.match(/Admit\s+Until\s+Date:\s*(\d{5}\/\d{4})/i) // Handle "07131/2017" format
    if (exitDateMatch) {
      const dateStr = exitDateMatch[1]
      
      // Handle different date formats
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/')
        if (parts.length === 3) {
          // Handle "07/31/2017" format
          const [month, day, year] = parts
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          if (!isNaN(date.getTime())) {
            result.exitDate = date.toISOString().split('T')[0]
          }
        } else if (parts.length === 2 && parts[0].length === 5) {
          // Handle "07131/2017" format - this looks like "07/31/2017" with missing slash
          // The pattern is MMxDDxYYYY where x is any character
          const month = parts[0].substring(0, 2)
          const day = parts[0].substring(2, 4)
          const year = parts[1]
          
          const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
          if (!isNaN(date.getTime())) {
            result.exitDate = date.toISOString().split('T')[0]
          }
        }
      }
    }

    // Extract country - look for "Country of Issuance"
    const countryMatch = cleanedText.match(/Country of Issuance:\s*([A-Za-z]+)/i)
    if (countryMatch) {
      result.country = countryMatch[1].trim()
    }

    return result

  } catch (error) {
    console.error('Error parsing I-94 text:', error)
    return result
  }
} 