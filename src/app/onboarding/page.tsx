export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Alavisa
          </h1>
          <p className="mt-2 text-gray-600">
            Let's get you set up for your visa application
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-700">
            This is where the onboarding form will go. For now, this is just a
            placeholder page.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Users who haven't completed onboarding will be redirected here.
          </p>
        </div>
      </div>
    </div>
  )
}
