"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

interface User {
  id: string
  name: string
  role: string
  email: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  isLoading: true,
})

function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000, fallbackValue: T): Promise<T> {
  let timeoutId: NodeJS.Timeout
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn("[AuthContext] Operation timed out after " + timeoutMs + "ms. Connection is very slow or offline.");
      resolve(fallbackValue);
    }, timeoutMs)
  })

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId)
      return res
    }).catch((err) => {
      clearTimeout(timeoutId)
      throw err
    }),
    timeoutPromise
  ])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const loadUser = useCallback(async () => {
    let initialLoadDone = false

    // Safety fallback (cleared immediately if loadUser finishes faster than 15s)
    const safetyTimeout = setTimeout(() => {
      if (!initialLoadDone) {
        console.warn("[AuthContext] loadUser did not resolve within 15 seconds! Forcing isLoading to false to unblock UI.")
        setIsLoading(false)
      }
    }, 15000)

    try {
      console.log("[AuthContext] Starting loadUser()...")
      
      // --- OFFLINE MOCK CHECK ---
      if (typeof window !== "undefined") {
        const match = document.cookie.match(new RegExp('(^| )mock_admin_auth=([^;]+)'))
        if (match && match[2]) {
          try {
            const rawVal = decodeURIComponent(match[2])
            let mockUser = null
            if (rawVal === "true") {
              mockUser = {
                id: "mock-admin-id",
                name: "Mock Administrator",
                email: "admin@duet.ac.bd",
                role: "Super Admin",
              }
              // Upgrade cookie to proper JSON format
              document.cookie = `mock_admin_auth=${encodeURIComponent(JSON.stringify(mockUser))}; path=/; max-age=86400;`
              console.log("[AuthContext] Upgraded mock_admin_auth cookie from true to JSON.")
            } else {
              mockUser = JSON.parse(rawVal)
            }

            if (mockUser && mockUser.email === "admin@duet.ac.bd") {
              console.log("[AuthContext] Found offline mock session in active cookie. Bypassing Supabase.")
              setUser(mockUser)
              initialLoadDone = true
              setIsLoading(false)
              clearTimeout(safetyTimeout)
              return
            }
          } catch (e) {
            console.warn("Failed to parse mock_admin_auth cookie", e)
          }
        }
      }
      // --------------------------

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      console.log("[AuthContext] Environment variables check - URL exists:", !!supabaseUrl, "Key exists:", !!supabaseKey)

      console.log("[AuthContext] Getting session...")
      // Using getSession first is much faster because it uses local storage/cookies
      const { data: { session }, error: sessionError }: any = await withTimeout(
        supabase.auth.getSession(),
        3000,
        { data: { session: null }, error: { message: "supabase.auth.getSession timed out" } as any }
      )

      if (sessionError) {
        console.warn("[AuthContext] getSession returned error:", sessionError.message)
      }

      let authUser = session?.user || null

      // If we have a session, we can optionally double-check the user securely with a fast timeout
      if (authUser) {
        console.log("[AuthContext] Found session user:", authUser.email, "Checking secure user details...")
        try {
          const { data: { user: verifiedUser } } = await withTimeout(
            supabase.auth.getUser(),
            4000,
            { data: { user: authUser } } // Fallback to session user on timeout/error
          )
          if (verifiedUser) {
            authUser = verifiedUser
          }
        } catch (e) {
          console.warn("[AuthContext] Secure user check failed, falling back to session user:", e)
        }
      }

      if (authUser) {
        try {
          console.log("[AuthContext] Fetching admin profile from admin_users for ID:", authUser.id)
          const { data: profile, error: profileErr }: any = await withTimeout(
            supabase
              .from("admin_users")
              .select("*")
              .eq("id", authUser.id)
              .single(),
            4000,
            { data: null, error: { message: "admin_users profile fetch timed out" } as any }
          )

          if (profileErr) {
            console.warn("[AuthContext] Could not load admin profile:", profileErr.message || profileErr)
          }

          setUser({
            id: authUser.id,
            name: profile?.name || authUser.user_metadata?.name || "Administrator",
            email: authUser.email || "",
            role: profile?.role === "super_admin" ? "Super Admin" : "Admin",
          })
          console.log("[AuthContext] User state successfully set in Context:", authUser.email)
        } catch (profileErr: any) {
          console.warn("[AuthContext] Caught error loading admin profile:", profileErr.message || profileErr)
          setUser({
            id: authUser.id,
            name: authUser.user_metadata?.name || "Administrator",
            email: authUser.email || "",
            role: "Admin",
          })
        }
      } else {
        console.log("[AuthContext] No auth user found, setting user state to null")
        setUser(null)
      }
    } catch (err: any) {
      console.warn("[AuthContext] Unexpected error during loadUser:", err.message || err)
      setUser(null)
    } finally {
      console.log("[AuthContext] loadUser finally block reached. Setting loading states...")
      initialLoadDone = true
      setIsLoading(false)
      clearTimeout(safetyTimeout)
    }
  }, [supabase])

  useEffect(() => {
    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      // --- OFFLINE MOCK LOGIN ---
      if (email === "admin@duet.ac.bd") {
        console.log("[AuthContext] Offline mock login triggered for admin@duet.ac.bd")
        const mockUser = {
          id: "mock-admin-id",
          name: "Mock Administrator",
          email: "admin@duet.ac.bd",
          role: "Super Admin",
        }
        setUser(mockUser)
        if (typeof window !== "undefined") {
          const cookieValue = encodeURIComponent(JSON.stringify(mockUser))
          document.cookie = `mock_admin_auth=${cookieValue}; path=/; max-age=86400;`
        }
        return { success: true }
      }
      // --------------------------

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("admin_users")
          .select("*")
          .eq("id", data.user.id)
          .single()

        setUser({
          id: data.user.id,
          name: profile?.name || data.user.user_metadata?.name || "Administrator",
          email: data.user.email || "",
          role: profile?.role === "super_admin" ? "Super Admin" : "Admin",
        })
        return { success: true }
      }
      return { success: false, error: "Failed to authenticate" }
    } catch (err: any) {
      return { success: false, error: err.message || "An unexpected error occurred" }
    }
  }

  const logout = async () => {
    if (typeof window !== "undefined") {
      document.cookie = "mock_admin_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
    await supabase.auth.signOut().catch(() => {})
    setUser(null)
    router.push("/admin/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
