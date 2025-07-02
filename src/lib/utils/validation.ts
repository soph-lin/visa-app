export interface TravelHistoryData {
  entryDate: string
  exitDate: string
  country: string
}

export function validateTravelHistory(data: TravelHistoryData): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check if all required fields are present
  if (!data.entryDate) {
    errors.push('Entry date is required')
  }
  if (!data.exitDate) {
    errors.push('Exit date is required')
  }
  if (!data.country || data.country.trim() === '') {
    errors.push('Country is required')
  }

  // Validate dates
  if (data.entryDate && data.exitDate) {
    const entryDate = new Date(data.entryDate)
    const exitDate = new Date(data.exitDate)

    // Check if dates are valid
    if (isNaN(entryDate.getTime())) {
      errors.push('Invalid entry date format')
    }
    if (isNaN(exitDate.getTime())) {
      errors.push('Invalid exit date format')
    }

    // Check if exit date is after entry date
    if (entryDate && exitDate && exitDate <= entryDate) {
      errors.push('Exit date must be after entry date')
    }
  }

  // Validate country (basic check)
  if (data.country && data.country.trim().length < 2) {
    errors.push('Country name must be at least 2 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
} 