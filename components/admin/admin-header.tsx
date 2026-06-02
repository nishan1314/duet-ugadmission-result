"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  LayoutDashboard,
  Users,
  Upload,
  FileText,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/results", label: "Results", icon: FileText },
  { href: "/admin/upload", label: "Upload", icon: Upload },
]

export function AdminHeader() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Left: Logo + Admin Badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="relative w-9 h-9">
                <Image
                  src="/images/duet-logo.png"
                  alt="DUET Logo"
                  fill
                  sizes="36px"
                  className="object-contain"
                />
              </div>
              <span className="text-sm font-bold text-white bg-[#006a4e] px-2.5 py-1 rounded-md tracking-wide">
                Admin
              </span>
            </Link>
          </div>

          {/* Center: Navigation (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "text-[#006a4e] bg-[#e8f5f0] dark:text-emerald-400 dark:bg-emerald-950/30"
                      : "text-[#4a5568] dark:text-zinc-400 hover:text-[#1a365d] hover:bg-zinc-50 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: User dropdown (desktop) + Mobile menu */}
          <div className="flex items-center gap-2">

            {/* Desktop dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#4a5568] dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006a4e]">
                  <div className="w-8 h-8 rounded-full bg-[#006a4e] flex items-center justify-center text-white text-xs font-bold">
                    {user?.name?.charAt(0) || "A"}
                  </div>
                  <span className="max-w-[100px] truncate">{user?.name || "Admin"}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-[#1a365d] dark:text-zinc-50">
                    {user?.name}
                  </p>
                  <p className="text-xs text-[#4a5568] dark:text-zinc-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile" className="flex items-center gap-2 cursor-pointer">
                    <UserCircle className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    Site Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 text-red-500 focus:text-red-500 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-[#4a5568] dark:text-zinc-400"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-8 h-8">
                        <Image
                          src="/images/duet-logo.png"
                          alt="DUET Logo"
                          fill
                          sizes="32px"
                          className="object-contain"
                        />
                      </div>
                      <span className="text-sm font-bold text-white bg-[#006a4e] px-2 py-0.5 rounded-md">
                        Admin
                      </span>
                    </div>
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <X className="w-4 h-4 text-[#4a5568]" />
                    </button>
                  </div>

                  {/* Mobile nav */}
                  <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            active
                              ? "text-[#006a4e] bg-[#e8f5f0] dark:text-emerald-400 dark:bg-emerald-950/30"
                              : "text-[#4a5568] dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Link>
                      )
                    })}

                    <div className="my-3 border-t border-zinc-100 dark:border-zinc-800" />

                    <Link
                      href="/admin/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#4a5568] dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                    >
                      <UserCircle className="w-5 h-5" />
                      Profile
                    </Link>
                    <Link
                      href="/admin/settings"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#4a5568] dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                    >
                      <Settings className="w-5 h-5" />
                      Site Settings
                    </Link>
                  </nav>

                  {/* Mobile user info + logout */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#006a4e] flex items-center justify-center text-white text-sm font-bold">
                        {user?.name?.charAt(0) || "A"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1a365d] dark:text-zinc-50">
                          {user?.name}
                        </p>
                        <p className="text-xs text-[#4a5568] dark:text-zinc-500">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileOpen(false)
                        logout()
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
