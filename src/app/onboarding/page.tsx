'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useForm, Controller } from 'react-hook-form'
import { useDropzone } from 'react-dropzone'
import {
  TextField,
  Button,
  Box,
  Typography,
  Avatar,
  Paper,
  Chip,
  CircularProgress,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material'
import {
  Person,
  Description,
  FlightTakeoff,
  ExpandMore,
} from '@mui/icons-material'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { extractTextFromPDF } from '@/lib/utils/text/pdfExtractor'
import { parseI94Text } from '@/lib/utils/text/i94Parser'
import { trpc } from '@/lib/trpc/client'
import { useRouter } from 'next/navigation'

const onboardingSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

interface TravelEntry {
  country: string
  entryDate: string
  exitDate: string
}

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [i94File, setI94File] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessingI94, setIsProcessingI94] = useState(false)
  const [travelHistory, setTravelHistory] = useState<TravelEntry[]>([])
  const [i94ProcessingError, setI94ProcessingError] = useState<string | null>(
    null,
  )

  const onboardingMutation = trpc.onboarding.submit.useMutation({
    onSuccess: () => {
      router.push('/')
    },
    onError: (error) => {
      console.error('Onboarding submission error:', error)
      alert('Failed to submit onboarding. Please try again.')
    },
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.emailAddresses[0]?.emailAddress || 'no-email@example.com',
    },
    mode: 'onChange',
  })

  // Custom validation that includes file uploads
  // Profile photo is valid if either uploaded or already exists from Clerk
  const hasValidProfilePhoto = !!(profilePhoto || user?.imageUrl)
  const isFormValid = Boolean(
    isValid && hasValidProfilePhoto && passportFile && resumeFile,
  )

  useEffect(() => {
    if (user) {
      // Reset form with user data when it becomes available
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.emailAddresses[0]?.emailAddress || '',
      })
    }
  }, [user, reset])

  const profilePhotoDropzone = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setProfilePhoto(acceptedFiles[0])
      }
    },
  })

  const passportDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setPassportFile(acceptedFiles[0])
      }
    },
  })

  const resumeDropzone = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setResumeFile(acceptedFiles[0])
      }
    },
  })

  const i94Dropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        setI94File(file)

        try {
          console.log('Processing I-94 file:', file.name)
          setIsProcessingI94(true)
          setI94ProcessingError(null)

          // Extract text from PDF
          const extractionResult = await extractTextFromPDF(file)
          console.log('Extracted text:', extractionResult.text)

          // Parse I-94 data
          const travelData = parseI94Text(extractionResult.text)
          console.log('Extracted travel data:', travelData)

          // Convert to array format for the table
          if (
            travelData.entryDate &&
            travelData.exitDate &&
            travelData.country
          ) {
            setTravelHistory([
              {
                country: travelData.country,
                entryDate: travelData.entryDate,
                exitDate: travelData.exitDate,
              },
            ])
          } else {
            setTravelHistory([])
          }
        } catch (error) {
          console.error('Error processing I-94 file:', error)
          setI94ProcessingError(
            'Error processing I-94 file. Please try again later.',
          )
        } finally {
          setIsProcessingI94(false)
        }
      }
    },
  })

  const uploadFileToSupabase = async (
    file: File,
    documentType: string,
  ): Promise<string> => {
    try {
      console.log(`Uploading ${documentType} file:`, file.name, file.size)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user!.id)
      formData.append('documentType', documentType)

      console.log('Sending request to /api/upload...')
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log(`Upload response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload error response:', errorText)
        throw new Error(
          `Failed to upload ${documentType}: ${response.status} - ${errorText}`,
        )
      }

      const result = await response.json()
      console.log(`${documentType} upload result:`, result)
      return result.url
    } catch (error) {
      console.error(`Error uploading ${documentType}:`, error)
      throw error
    }
  }

  const uploadProfileImageToClerk = async (file: File): Promise<string> => {
    try {
      console.log('Uploading profile image to Clerk:', file.name, file.size)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user!.id)

      console.log('Sending request to /api/upload-profile-image...')
      const response = await fetch('/api/upload-profile-image', {
        method: 'POST',
        body: formData,
      })

      console.log(`Profile image upload response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Profile image upload error response:', errorText)
        throw new Error(
          `Failed to upload profile image: ${response.status} - ${errorText}`,
        )
      }

      const responseText = await response.text()
      console.log('Profile image upload response text:', responseText)

      try {
        const result = JSON.parse(responseText)
        console.log('Profile image upload result:', result)
        return result.url
      } catch (parseError) {
        console.error(
          'Failed to parse profile image upload response:',
          parseError,
        )
        throw new Error(`Invalid response format: ${responseText}`)
      }
    } catch (error) {
      console.error('Error uploading profile image:', error)
      throw error
    }
  }

  const onSubmit = async (data: OnboardingFormData, event?: any) => {
    console.log('onSubmit called!')

    // Prevent default form submission
    event?.preventDefault?.()

    if (!user) {
      alert('User not found. Please try again.')
      return
    }

    setIsSubmitting(true)
    try {
      console.log('Form data:', data)
      console.log('Profile photo:', profilePhoto)
      console.log('Passport file:', passportFile)
      console.log('Resume file:', resumeFile)
      console.log('I-94 file:', i94File)

      // Check if required files are uploaded
      if (!passportFile || !resumeFile) {
        alert('Please upload both passport and resume files.')
        return
      }

      // Upload files to Supabase and profile image to Clerk
      console.log('Uploading files...')
      const uploadPromises = []

      if (passportFile) {
        uploadPromises.push(uploadFileToSupabase(passportFile, 'passport'))
      }
      if (resumeFile) {
        uploadPromises.push(uploadFileToSupabase(resumeFile, 'resume'))
      }
      if (i94File) {
        uploadPromises.push(uploadFileToSupabase(i94File, 'i94'))
      }

      // Upload profile image to Clerk separately
      if (profilePhoto) {
        uploadPromises.push(uploadProfileImageToClerk(profilePhoto))
      }

      const uploadResults = await Promise.all(uploadPromises)
      console.log('Files uploaded successfully:', uploadResults)

      // Extract URLs from upload results
      const passportUrl = passportFile ? uploadResults[0] : undefined
      const resumeUrl = resumeFile ? uploadResults[1] : undefined
      const i94Url = i94File ? uploadResults[2] : undefined

      console.log('Extracted URLs:', { passportUrl, resumeUrl, i94Url })

      console.log('Calling tRPC mutation...')
      await onboardingMutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        profilePhoto: profilePhoto || undefined,
        passportFile: passportFile,
        resumeFile: resumeFile,
        i94File: i94File || undefined,
        passportUrl,
        resumeUrl,
        i94Url,
        travelHistory:
          travelHistory.length > 0
            ? {
                entryDate: travelHistory[0].entryDate,
                exitDate: travelHistory[0].exitDate,
                country: travelHistory[0].country,
              }
            : undefined,
      })
      console.log('tRPC mutation completed successfully!')
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded || !user) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4, px: 2 }}>
        <Box maxWidth="md" mx="auto">
          <Paper elevation={3} sx={{ p: 4 }}>
            {/* Header Skeleton */}
            <Box textAlign="center" mb={4}>
              <Skeleton
                variant="text"
                width="60%"
                height={48}
                sx={{ mx: 'auto', mb: 1 }}
              />
              <Skeleton
                variant="text"
                width="40%"
                height={24}
                sx={{ mx: 'auto' }}
              />
            </Box>

            {/* Form Skeleton */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Name Fields Skeleton */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <Skeleton variant="rectangular" height={56} sx={{ flex: 1 }} />
                <Skeleton variant="rectangular" height={56} sx={{ flex: 1 }} />
              </Box>

              {/* Email Field Skeleton */}
              <Skeleton variant="rectangular" height={56} />

              {/* Profile Photo Skeleton */}
              <Box>
                <Skeleton
                  variant="text"
                  width="30%"
                  height={32}
                  sx={{ mb: 1 }}
                />
                <Skeleton
                  variant="rectangular"
                  height={120}
                  sx={{ borderRadius: 2 }}
                />
              </Box>

              {/* Passport Upload Skeleton */}
              <Box>
                <Skeleton
                  variant="text"
                  width="20%"
                  height={32}
                  sx={{ mb: 1 }}
                />
                <Skeleton
                  variant="text"
                  width="40%"
                  height={16}
                  sx={{ mb: 1 }}
                />
                <Skeleton
                  variant="rectangular"
                  height={120}
                  sx={{ borderRadius: 2 }}
                />
              </Box>

              {/* Resume Upload Skeleton */}
              <Box>
                <Skeleton
                  variant="text"
                  width="25%"
                  height={32}
                  sx={{ mb: 1 }}
                />
                <Skeleton
                  variant="text"
                  width="30%"
                  height={16}
                  sx={{ mb: 1 }}
                />
                <Skeleton
                  variant="rectangular"
                  height={120}
                  sx={{ borderRadius: 2 }}
                />
              </Box>

              {/* I-94 Upload Skeleton */}
              <Box>
                <Skeleton
                  variant="text"
                  width="35%"
                  height={32}
                  sx={{ mb: 1 }}
                />
                <Skeleton
                  variant="text"
                  width="40%"
                  height={16}
                  sx={{ mb: 1 }}
                />
                <Skeleton
                  variant="rectangular"
                  height={120}
                  sx={{ borderRadius: 2 }}
                />
              </Box>

              {/* Submit Button Skeleton */}
              <Skeleton variant="rectangular" height={48} />
            </Box>
          </Paper>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4, px: 2 }}>
      <Box maxWidth="md" mx="auto">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box textAlign="center" mb={4}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{ color: '#111827', fontWeight: 'bold' }}
            >
              Welcome to Alavisa
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Let's get you set up for your visa application
            </Typography>
          </Box>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="First Name"
                        required
                        error={!!errors.firstName}
                        helperText={errors.firstName?.message}
                        variant="outlined"
                      />
                    )}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Last Name"
                        required
                        error={!!errors.lastName}
                        helperText={errors.lastName?.message}
                        variant="outlined"
                      />
                    )}
                  />
                </Box>
              </Box>

              <Box>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email"
                      required
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      variant="outlined"
                      disabled
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: 'rgba(0, 0, 0, 0.6)',
                        },
                      }}
                    />
                  )}
                />
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Profile Photo *
                </Typography>
                <Box
                  {...profilePhotoDropzone.getRootProps()}
                  sx={{
                    border: '2px dashed',
                    borderColor: profilePhotoDropzone.isDragActive
                      ? 'primary.main'
                      : 'grey.300',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: profilePhotoDropzone.isDragActive
                      ? 'action.hover'
                      : 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <input {...profilePhotoDropzone.getInputProps()} />
                  {profilePhoto ? (
                    <Box>
                      <Avatar
                        src={URL.createObjectURL(profilePhoto)}
                        sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {profilePhoto.name}
                      </Typography>
                      <Chip
                        label="Click to change"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ) : user?.imageUrl ? (
                    <Box>
                      <Avatar
                        src={user.imageUrl}
                        sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Current profile photo
                      </Typography>
                      <Chip
                        label="Click to change"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ) : (
                    <Box>
                      <Person sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        {profilePhotoDropzone.isDragActive
                          ? 'Drop the image here'
                          : 'Drag & drop an image here, or click to select'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Passport *
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Supported formats: JPG, JPEG, PNG, PDF
                </Typography>
                <Box
                  {...passportDropzone.getRootProps()}
                  sx={{
                    border: '2px dashed',
                    borderColor: passportDropzone.isDragActive
                      ? 'primary.main'
                      : 'grey.300',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: passportDropzone.isDragActive
                      ? 'action.hover'
                      : 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <input {...passportDropzone.getInputProps()} />
                  {passportFile ? (
                    <Box>
                      <Description
                        sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {passportFile.name}
                      </Typography>
                      <Chip
                        label="Click to change"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ) : (
                    <Box>
                      <Description
                        sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {passportDropzone.isDragActive
                          ? 'Drop the file here'
                          : 'Drag & drop a passport scan here, or click to select'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Resume *
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Supported formats: PDF
                </Typography>
                <Box
                  {...resumeDropzone.getRootProps()}
                  sx={{
                    border: '2px dashed',
                    borderColor: resumeDropzone.isDragActive
                      ? 'primary.main'
                      : 'grey.300',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: resumeDropzone.isDragActive
                      ? 'action.hover'
                      : 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <input {...resumeDropzone.getInputProps()} />
                  {resumeFile ? (
                    <Box>
                      <Description
                        sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {resumeFile.name}
                      </Typography>
                      <Chip
                        label="Click to change"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ) : (
                    <Box>
                      <Description
                        sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {resumeDropzone.isDragActive
                          ? 'Drop the PDF here'
                          : 'Drag & drop a PDF here, or click to select'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  I-94 Form
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Supported formats: PDF
                </Typography>
                <Box
                  {...i94Dropzone.getRootProps()}
                  sx={{
                    border: '2px dashed',
                    borderColor: i94Dropzone.isDragActive
                      ? 'primary.main'
                      : 'grey.300',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: isProcessingI94 ? 'not-allowed' : 'pointer',
                    bgcolor: i94Dropzone.isDragActive
                      ? 'action.hover'
                      : 'background.paper',
                    '&:hover': {
                      borderColor: isProcessingI94
                        ? 'grey.300'
                        : 'primary.main',
                      bgcolor: isProcessingI94
                        ? 'background.paper'
                        : 'action.hover',
                    },
                    opacity: isProcessingI94 ? 0.6 : 1,
                  }}
                >
                  <input
                    {...i94Dropzone.getInputProps()}
                    disabled={isProcessingI94}
                  />
                  {isProcessingI94 ? (
                    <Box>
                      <CircularProgress size={48} sx={{ mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        Processing I-94 form...
                      </Typography>
                    </Box>
                  ) : i94File ? (
                    <Box>
                      <FlightTakeoff
                        sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {i94File.name}
                      </Typography>
                      <Chip
                        label="Click to change"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ) : (
                    <Box>
                      <FlightTakeoff
                        sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {i94Dropzone.isDragActive
                          ? 'Drop the PDF here'
                          : 'Drag & drop a PDF here, or click to select'}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Error message */}
                {i94ProcessingError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {i94ProcessingError}
                  </Alert>
                )}

                {/* Travel History Section */}
                {travelHistory.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Accordion>
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <FlightTakeoff sx={{ fontSize: 20 }} />
                          Travel History
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                  Country
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                  Entry Date
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                  Exit Date
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {travelHistory.map((entry, index) => (
                                <TableRow key={index}>
                                  <TableCell>{entry.country}</TableCell>
                                  <TableCell>{entry.entryDate}</TableCell>
                                  <TableCell>{entry.exitDate}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}
              </Box>

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={!isFormValid || isSubmitting}
                  sx={{
                    bgcolor: '#4ADE80',
                    color: 'white',
                    py: 1.5,
                    '&:hover': {
                      bgcolor: '#22C55E',
                    },
                    '&:disabled': {
                      bgcolor: 'grey.300',
                      color: 'grey.500',
                    },
                    textTransform: 'none',
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Complete Onboarding'
                  )}
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      </Box>
    </Box>
  )
}
