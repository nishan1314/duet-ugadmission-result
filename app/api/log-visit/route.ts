import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"
    const userAgent = request.headers.get("user-agent") || "unknown"
    
    // Hash IP + User Agent for visitor fingerprint privacy
    const hash = crypto.createHash("sha256").update(`${ip}-${userAgent}`).digest("hex")

    const { error } = await supabase
      .from("visitor_logs")
      .insert({
        visitor_hash: hash,
        page: "/",
      })

    // 23505 is the PostgreSQL error code for unique constraint violation (already counted today)
    if (error && error.code !== "23505") {
      console.error("Error logging visit:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Visit logging error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
