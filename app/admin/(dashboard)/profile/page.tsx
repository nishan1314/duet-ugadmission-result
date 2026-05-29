"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { User, Lock, Mail, Shield, Calendar, Save, Check } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

export default function AdminProfilePage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [updating, setUpdating] = useState(false)
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadMemberDate() {
      if (!user?.id) return
      const { data } = await supabase
        .from("admin_users")
        .select("created_at")
        .eq("id", user.id)
        .single()
      if (data?.created_at) {
        setMemberSince(
          new Date(data.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        )
      }
    }
    loadMemberDate()
  }, [user?.id])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in the password fields")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        toast.error("Failed to update password: " + error.message)
      } else {
        toast.success("Security credentials updated successfully!")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred: " + (err.message || err))
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title="Admin Profile"
        description="Manage your user information and security credentials."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: User Profile Info Summary */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center p-6 justify-between">
          <div className="space-y-4 w-full">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-[#e8f5f0] dark:bg-emerald-950/20 text-[#006a4e] flex items-center justify-center text-3xl font-extrabold mx-auto shadow-sm">
              {user?.name?.charAt(0) || "A"}
            </div>
            
            {/* Name and Role */}
            <div>
              <h3 className="text-xl font-bold text-[#1a365d] dark:text-zinc-50">
                {user?.name || "Administrator"}
              </h3>
              <p className="text-sm font-semibold text-[#006a4e] dark:text-emerald-400 mt-1 uppercase tracking-wide">
                {user?.role || "System Admin"}
              </p>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 my-4" />

            {/* Extra Meta details */}
            <div className="space-y-3.5 text-left text-sm">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-[#4a5568] dark:text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Admin ID</p>
                  <p className="font-semibold text-[#1a365d] dark:text-zinc-50 font-mono text-xs">
                    {user?.id ? `${user.id.slice(0, 8)}...` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#4a5568] dark:text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Email Address</p>
                  <p className="font-semibold text-[#1a365d] dark:text-zinc-50">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-[#4a5568] dark:text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Authorization Level</p>
                  <p className="font-semibold text-[#1a365d] dark:text-zinc-50">Full Database Read/Write</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#4a5568] dark:text-zinc-400" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Member Since</p>
                  <p className="font-semibold text-[#1a365d] dark:text-zinc-50">
                    {memberSince || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full mt-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e8f5f0] text-[#006a4e]">
              <span className="w-2 h-2 rounded-full bg-[#006a4e] animate-pulse" />
              Active Admin Session
            </span>
          </div>
        </Card>

        {/* Card 2: Security settings */}
        <Card className="lg:col-span-2 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#006a4e]" />
              Update Password
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Change your admin portal login credentials. Use a strong password to ensure security.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              
              <div className="space-y-2">
                <Label htmlFor="curr-pass" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">
                  Current Password
                </Label>
                <Input
                  id="curr-pass"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pass" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">
                  New Password
                </Label>
                <Input
                  id="new-pass"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conf-pass" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">
                  Confirm New Password
                </Label>
                <Input
                  id="conf-pass"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e]"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={updating}
                  className="h-11 bg-[#006a4e] hover:bg-[#005a40] text-white rounded-xl font-semibold px-6 shadow hover:shadow-md cursor-pointer flex items-center gap-2"
                >
                  {updating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving credentials...
                    </span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
