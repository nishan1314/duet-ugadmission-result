"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthProvider, useAuth } from "@/contexts/auth-context"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated using a side effect
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/admin/dashboard")
    }
  }, [authLoading, isAuthenticated, router])

  if (!authLoading && isAuthenticated) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate network delay for premium feel
    await new Promise((r) => setTimeout(r, 600))

    const result = await login(email.trim(), password)
    if (result.success) {
      router.replace("/admin/dashboard")
    } else {
      setError(result.error || "Invalid email or password")
    }
    setIsLoading(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="w-8 h-8 border-3 border-[#006a4e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4 drop-shadow-md">
            <Image
              src="/images/duet-logo.png"
              alt="DUET Logo"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-[#1a365d] dark:text-zinc-50 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-sm text-[#4a5568] dark:text-zinc-400 mt-1">
            Sign in to manage the admission system
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_4px_28px_rgba(0,106,78,0.11)] border-t-4 border-t-[#006a4e] overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5568] dark:text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@duet.ac.bd"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-11 rounded-xl border-zinc-200 dark:border-zinc-700 bg-[#f7fafc] dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] text-sm text-[#1a365d] dark:text-zinc-50"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5568] dark:text-zinc-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-11 rounded-xl border-zinc-200 dark:border-zinc-700 bg-[#f7fafc] dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] text-sm text-[#1a365d] dark:text-zinc-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4a5568] dark:text-zinc-400 hover:text-[#1a365d] dark:hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 shadow hover:shadow-md cursor-pointer"
              style={{
                backgroundColor:
                  email.trim() && password.trim() && !isLoading
                    ? "#006a4e"
                    : undefined,
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#4a5568] dark:text-zinc-500 mt-6">
          DUET Admission System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}
