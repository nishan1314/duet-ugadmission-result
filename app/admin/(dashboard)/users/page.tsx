"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, UserPlus, ShieldAlert, Check } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const supabase = createClient()

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: true })

      if (error) {
        toast.error("Failed to load admin users: " + error.message)
        return
      }

      if (data) {
        setUsers(data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role === "super_admin" ? "Super Admin" : "Admin",
          createdAt: new Date(u.created_at).toISOString().split("T")[0],
        })))
      }
    } catch (err: any) {
      console.error("Error fetching users:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    try {
      // Use server API route to create user without disrupting current session
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const result = await res.json()

      if (!res.ok) {
        if (result.needsServiceRole) {
          toast.error(
            "To create users from the dashboard, add SUPABASE_SERVICE_ROLE_KEY to .env.local. " +
            "Alternatively, create users in the Supabase Auth dashboard — they will sync automatically."
          )
        } else {
          toast.error("Failed to create admin: " + result.error)
        }
        return
      }

      toast.success("Admin user created successfully!")
      setIsAddOpen(false)

      // Reset form fields
      setName("")
      setEmail("")
      setPassword("")

      // Refresh list
      loadUsers()
    } catch (err: any) {
      toast.error("Unexpected error creating user: " + (err.message || err))
    }
  }

  const confirmDelete = (id: string) => {
    setUserToDelete(id)
    setIsDeleteOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (userToDelete === user?.id) {
        toast.error("Cannot delete your own active Admin profile")
        setIsDeleteOpen(false)
        return
      }

      // Delete from admin_users profile table (revokes dashboard access)
      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", userToDelete)

      if (error) {
        toast.error("Failed to delete admin: " + error.message)
        return
      }

      setUsers(users.filter((u) => u.id !== userToDelete))
      setIsDeleteOpen(false)
      toast.success("Admin dashboard access revoked successfully")
      setUserToDelete(null)
    } catch (err: any) {
      toast.error("Unexpected error deleting user: " + (err.message || err))
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title="User Management"
        description="Add and manage administrative users who have access to this portal."
        action={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#006a4e] hover:bg-[#005a40] text-white flex items-center gap-2 rounded-xl transition-all shadow hover:shadow-md cursor-pointer">
                <UserPlus className="w-4 h-4" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1a365d] dark:text-zinc-50">Add Admin User</DialogTitle>
                <DialogDescription>
                  Create a new administrative user with access privileges.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Nishan Ahmed"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. nishan@duet.ac.bd"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pass" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">Password</Label>
                  <Input
                    id="pass"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800"
                    required
                  />
                </div>
                <DialogFooter className="pt-4 flex sm:justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#006a4e] hover:bg-[#005a40] text-white rounded-xl cursor-pointer">
                    Save Admin
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="w-8 h-8 border-3 border-[#006a4e] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Name</TableHead>
                <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Admin ID</TableHead>
                <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Email</TableHead>
                <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Role</TableHead>
                <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Created Date</TableHead>
                <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                    No admin accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20">
                    <TableCell className="font-medium text-[#1a365d] dark:text-zinc-50">{user.name}</TableCell>
                    <TableCell className="font-mono text-xs text-[#4a5568] dark:text-zinc-400">{user.id.slice(0, 8)}...</TableCell>
                    <TableCell className="text-[#4a5568] dark:text-zinc-400">{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          user.role === "Super Admin"
                            ? "bg-[#006a4e]/10 text-[#006a4e]"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400"
                        }`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-500">{user.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50"
                          onClick={() => confirmDelete(user.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-2">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#1a365d] dark:text-zinc-50">Revoke Dashboard Access</DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to remove this administrator profile? They will immediately lose dashboard access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-center gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl flex-1">
              Cancel
            </Button>
            <Button onClick={handleDeleteUser} className="bg-red-500 hover:bg-red-600 text-white rounded-xl flex-1">
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
