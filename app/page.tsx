"use client"

import { useState, useEffect, useRef } from "react"

import Marquee from "react-fast-marquee"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, X, CheckCircle2, Clock, AlertTriangle, Heart } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"

type ResultData = {
  applicant_id: string
  applicant_name: string
  fathers_name: string
  department: string
  status: string
  sl: number
  year: number
  quota?: string
} | null

export default function CheckResultPage() {
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [applicantId, setApplicantId] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [result, setResult] = useState<ResultData>(null)
  const [notFound, setNotFound] = useState(false)
  const [stats, setStats] = useState({ selected: 0, waiting: 0, total: 0 })

  // Portal Config Settings State
  const [settings, setSettings] = useState({
    site_title: "Undergraduate Admission Test Result - DUET",
    site_description: "Official portal to check Dhaka University of Engineering & Technology undergraduate admission results.",
    admission_year: "2025",
    result_published: true,
    show_announcement: true,
    show_stats_in_banner: true,
    announcement_text: "Admission Test 2025 results are officially published. Please enter your Applicant ID to check.",
    maintenance_mode: false,
    maintenance_message: "The portal is undergoing scheduled maintenance. Please check back in a few minutes."
  })

  const supabase = createClient()

  useEffect(() => {
    // 1. Log unique visitor
    fetch("/api/log-visit", { method: "POST" }).catch(() => {})

    // 2. Load site configuration from Supabase site_settings
    async function loadSettings() {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("*")
        
        let loadedSettings: any = { ...settings }
        if (data && data.length > 0) {
          data.forEach((row: { key: string; value: string }) => {
            const val = row.value
            // Map types correctly
            if (val === "true") {
              loadedSettings[row.key as keyof typeof settings] = true as any
            } else if (val === "false") {
              loadedSettings[row.key as keyof typeof settings] = false as any
            } else {
              loadedSettings[row.key as keyof typeof settings] = val as any
            }
          })


          // Proactively update browser tab title
          document.title = loadedSettings.site_title
          
          // Update Meta description tag
          const metaDesc = document.querySelector('meta[name="description"]')
          if (metaDesc) {
            metaDesc.setAttribute("content", loadedSettings.site_description)
          }
        }

        // Determine the latest published year from the database
        const { data: maxYearData } = await supabase.from("results").select("year").order("year", { ascending: false }).limit(1)
        const latestYear = maxYearData?.[0]?.year || new Date().getFullYear().toString()
        loadedSettings.admission_year = latestYear.toString()
        
        // Finalize setting state
        setSettings(loadedSettings)

        // Fetch dynamic stats for banner using the latest year
        const { data: resultsData } = await supabase.from("results").select("status").eq("year", latestYear)
        
        // Fetch total applied candidates from yearly_candidate_totals
        const { data: totalData } = await supabase
          .from("yearly_candidate_totals")
          .select("total_candidates")
          .eq("year", latestYear)
          .single()

        if (resultsData) {
          setStats({
            selected: resultsData.filter((r: any) => r.status?.toLowerCase().includes("provisionally selected")).length,
            waiting: resultsData.filter((r: any) => r.status?.toLowerCase().includes("waiting")).length,
            total: totalData?.total_candidates || resultsData.length
          })
        }
      } catch (err) {
        console.error("Error loading settings from DB:", err)
      } finally {
        setIsPageLoading(false)
      }
    }

    loadSettings()
  }, [])

  const selectedCount = stats.selected
  const waitingCount = stats.waiting
  const totalCount = stats.total

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Premium loading delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    const inputId = applicantId.trim()
    
    try {
      const { data: found, error } = await supabase
        .from("results")
        .select("*")
        .eq("applicant_id", inputId)
        .eq("year", settings.admission_year)
        .single()
        
      if (found) {
        setResult(found)
        setNotFound(false)
      } else {
        setResult(null)
        setNotFound(true)
      }

      // Log query in search_logs
      await supabase.from("search_logs").insert({
        applicant_id: inputId,
        found: !!found,
        department: found ? found.department : null
      })
    } catch (err) {
      console.error("Error fetching result:", err)
      setResult(null)
      setNotFound(true)
    }

    setIsLoading(false)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setResult(null)
    setNotFound(false)
  }

  // ── Render Full Site Loading Screen ──
  if (isPageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f4fb] dark:bg-zinc-950 px-4">
        <div className="relative w-24 h-24 mb-6 drop-shadow-md">
          <Image
            src="/images/duet-logo.png"
            alt="DUET Logo"
            fill
            sizes="96px"
            className="object-contain animate-pulse"
            priority
          />
        </div>
        <div className="w-8 h-8 border-4 border-[#006a4e] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-[#1a365d] dark:text-zinc-400 tracking-wide uppercase">
          Initializing Portal
        </p>
      </div>
    )
  }

  // ── Render Maintenance Screen ──
  if (settings.maintenance_mode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f4fb] dark:bg-zinc-950 px-4 text-center">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-[0_4px_28px_rgba(0,106,78,0.11)] border-t-4 border-t-[#006a4e] space-y-6">
          <div className="relative w-20 h-20 mx-auto drop-shadow-md">
            <Image
              src="/images/duet-logo.png"
              alt="DUET Logo"
              fill
              sizes="80px"
              className="object-contain animate-pulse"
            />
          </div>
          <h1 className="text-2xl font-bold text-[#1a365d] dark:text-zinc-50 tracking-tight">
            System Maintenance
          </h1>
          <p className="text-sm text-[#4a5568] dark:text-zinc-400 leading-relaxed">
            {settings.maintenance_message}
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              Check panel is temporarily offline
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[#f0f4fb] dark:bg-zinc-950">

      {/* ── TOP: Announcement Banner ── */}
      {settings.show_announcement && (
        <div className="bg-white dark:bg-zinc-900 text-[#1a365d] dark:text-zinc-50 border-y-2 border-[#006a4e] py-2.5 px-4 text-xs sm:text-sm font-semibold tracking-wide flex items-center shadow-sm relative z-20 overflow-hidden">
          <div className="flex-shrink-0 flex items-center gap-2 pr-4 z-10 bg-white dark:bg-zinc-900 absolute left-0 pl-4 h-full">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="uppercase font-bold tracking-wider text-red-600 dark:text-red-500">Notice</span>
          </div>
          
          <div className="flex-1 overflow-hidden relative flex items-center pl-24">
            <Marquee speed={45} gradient={false} pauseOnHover={true} className="overflow-hidden">
              <span className="inline-flex items-center gap-6 pr-6">
                {settings.show_stats_in_banner && (
                  <span className="inline-flex items-center gap-6 mr-2">
                    <span className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 px-3 py-1 rounded-full">
                      <span className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wide text-xs">Admission {settings.admission_year}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">Provisionally Selected:</span>
                      <span className="font-bold text-[#1a365d] dark:text-white text-base">{selectedCount}</span>
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <span className="flex items-center gap-2">
                      <span className="text-amber-600 dark:text-amber-500">Waiting List:</span>
                      <span className="font-bold text-[#1a365d] dark:text-white text-base">{waitingCount}</span>
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <span className="flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400">Total Candidates Applied in {settings.admission_year}:</span>
                      <span className="font-bold text-[#1a365d] dark:text-white text-base">{totalCount}</span>
                    </span>
                  </span>
                )}
                {(settings.announcement_text || "").split('\n').filter(t => t.trim() !== "").map((text, i) => (
                  <span key={i} className="inline-flex items-center gap-6">
                    { (i > 0 || settings.show_stats_in_banner) && <span className="text-zinc-300 dark:text-zinc-700">•</span> }
                    <span>{text.trim()}</span>
                  </span>
                ))}
              </span>
            </Marquee>
          </div>
        </div>
      )}

      {/* ── TOP: Info Panel ── */}
      <section className="flex-shrink-0 w-full bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-3 sm:gap-5">

          {/* Logo */}
          <div className="relative w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 drop-shadow-md hover:scale-105 transition-transform duration-300">
            <Image
              src="/images/duet-logo.png"
              alt="DUET Logo"
              fill
              sizes="96px"
              className="object-contain"
              priority
            />
          </div>

          {/* Text Container */}
          <div className="flex flex-col justify-center">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-[#1a365d] dark:text-zinc-50 leading-tight tracking-tight">
              Undergraduate Admission Test Result{" "}
              <span className="text-[#e53e3e] whitespace-nowrap">— {settings.admission_year}</span>
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-[#4a5568] dark:text-zinc-400 font-semibold uppercase tracking-widest mt-1">
              Dhaka University of Engineering &amp; Technology, Gazipur
            </p>
          </div>

        </div>
      </section>

      {/* ── MIDDLE: Stats + Form ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-4 gap-4 overflow-hidden">



        {/* Form Card */}
        <div className="w-full max-w-md sm:max-w-lg">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-[0_4px_28px_rgba(0,106,78,0.11)] border-t-4 border-t-[#006a4e]">
            <div className="px-8 sm:px-10 py-8 sm:py-10">
              <div className="mb-6 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1a365d] dark:text-zinc-50 tracking-tight">
                  Check Result
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="applicantId" className="text-base font-semibold text-[#1a365d] dark:text-zinc-300">
                    Applicant ID
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4a5568] dark:text-zinc-400" />
                    <Input
                      id="applicantId"
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 10001"
                      className="pl-12 h-12 rounded-xl border-zinc-200 dark:border-zinc-700 bg-[#f7fafc] dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] text-base sm:text-lg text-[#1a365d] dark:text-zinc-50 placeholder:text-zinc-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                      min={1}
                      value={applicantId}
                      onChange={(e) => setApplicantId(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Result check status check */}
                {!settings.result_published ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                      Result checking has been temporarily disabled by the administration.
                    </p>
                  </div>
                ) : null}

                <div className="flex justify-center pt-2">
                  <Button
                    type="submit"
                    className="w-1/2 h-12 rounded-xl font-semibold text-base tracking-wide transition-all duration-200 shadow hover:shadow-md cursor-pointer"
                    style={{
                      backgroundColor: applicantId.trim() && !isLoading && settings.result_published ? "#006a4e" : undefined,
                    }}
                    disabled={isLoading || !applicantId.trim() || !settings.result_published}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Checking...
                      </span>
                    ) : (
                      "Check"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </section>

      {/* ── BOTTOM: Footer ── */}
      <footer className="flex-shrink-0 w-full bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center">
          <p className="text-[#4a5568] dark:text-zinc-400 text-xs sm:text-sm text-center flex items-center justify-center gap-1.5 flex-wrap">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse inline" />
            <span>by</span>
            <a
              href="https://www.linkedin.com/in/dev-nishan108/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#006a4e] dark:text-emerald-400 hover:text-[#1a365d] dark:hover:text-emerald-300 transition-colors duration-200 underline decoration-dotted underline-offset-4"
            >
              Nishan
            </a>
            <span className="text-zinc-400 dark:text-zinc-600 mx-1">|</span>
            <span>Dept of CSE, DUET</span>
          </p>
        </div>
      </footer>

      {/* ── RESULT MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>

            {result ? (
              <>
                {/* Success / Waiting header */}
                <div
                  className="px-8 py-6 text-center"
                  style={{
                    backgroundColor: result.status?.toLowerCase().includes("provisionally selected") ? "#f0fdf4" : "#fffbeb",
                  }}
                >
                  {result.status?.toLowerCase().includes("provisionally selected") ? (
                    <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
                  ) : (
                    <Clock className="w-14 h-14 text-amber-500 mx-auto mb-3" />
                  )}
                  <h3 className="text-xl font-bold text-[#1a365d] dark:text-zinc-900">
                    Admission Result
                  </h3>
                </div>

                {/* Result details */}
                <div className="px-8 py-6 space-y-4">
                  {/* Applicant ID */}
                  <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-medium text-[#4a5568] dark:text-zinc-400">Applicant ID</span>
                    <span className="text-sm font-bold text-[#1a365d] dark:text-zinc-50">{result.applicant_id}</span>
                  </div>

                  {/* Name */}
                  <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-medium text-[#4a5568] dark:text-zinc-400">Name</span>
                    <span className="text-sm font-bold text-[#1a365d] dark:text-zinc-50">{result.applicant_name}</span>
                  </div>

                  {/* Father's Name */}
                  <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-medium text-[#4a5568] dark:text-zinc-400">Father's Name</span>
                    <span className="text-sm font-bold text-[#1a365d] dark:text-zinc-50">{result.fathers_name}</span>
                  </div>

                  {/* Department */}
                  <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-medium text-[#4a5568] dark:text-zinc-400">Department</span>
                    <span className="text-sm font-bold text-[#1a365d] dark:text-zinc-50 text-right max-w-[60%]">{result.department}</span>
                  </div>


                  {/* Quota (if exists) */}
                  {result.quota && (
                    <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm font-medium text-[#4a5568] dark:text-zinc-400">Quota</span>
                      <span className="text-sm font-bold text-[#6b21a8]">{result.quota}</span>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm font-medium text-[#4a5568] dark:text-zinc-400">Status</span>
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full capitalize"
                      style={{
                        backgroundColor: result.status?.toLowerCase().includes("provisionally selected") ? "#dcfce7" : "#fef3c7",
                        color: result.status?.toLowerCase().includes("provisionally selected") ? "#16a34a" : "#d97706",
                      }}
                    >
                      {result.status?.toLowerCase().includes("provisionally selected") ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      {result.status}
                    </span>
                  </div>
                </div>

                {/* Close action */}
                <div className="px-8 pb-6">
                  <Button
                    onClick={closeModal}
                    className="w-full h-11 rounded-xl bg-[#006a4e] hover:bg-[#005a40] text-white font-semibold text-sm tracking-wide transition-all"
                  >
                    Close
                  </Button>
                </div>
              </>
            ) : notFound ? (
              <>
                {/* Not Found */}
                <div className="px-8 py-6 text-center bg-red-50 dark:bg-red-950/30">
                  <AlertTriangle className="w-14 h-14 text-red-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-[#1a365d] dark:text-zinc-50">
                    Result Not Found
                  </h3>
                </div>

                <div className="px-8 py-6 text-center">
                  <p className="text-sm text-[#4a5568] dark:text-zinc-400 leading-relaxed">
                    No result was found for Applicant ID <span className="font-bold text-[#1a365d] dark:text-zinc-50">{applicantId}</span>. Please double-check your ID and try again.
                  </p>
                </div>

                <div className="px-8 pb-6">
                  <Button
                    onClick={closeModal}
                    className="w-full h-11 rounded-xl bg-[#006a4e] hover:bg-[#005a40] text-white font-semibold text-sm tracking-wide transition-all"
                  >
                    Try Again
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

    </main>
  )
}
