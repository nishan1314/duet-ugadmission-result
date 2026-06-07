"use client"

import { useState, useEffect, useRef } from "react"

import Marquee from "react-fast-marquee"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, X, CheckCircle2, Clock, AlertTriangle, Heart, Download, Upload } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import Papa from "papaparse"
import { DEPARTMENTS } from "@/lib/constants"

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

  // Group search state
  const [groupInput, setGroupInput] = useState("")
  const [isGroupLoading, setIsGroupLoading] = useState(false)
  const [groupResults, setGroupResults] = useState<NonNullable<ResultData>[]>([])
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupNotFound, setGroupNotFound] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<"individual" | "group">("individual")

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

  const performGroupSearch = async (ids: string[]) => {
    setIsGroupLoading(true)
    
    // Premium loading delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    try {
      const { data: foundList, error } = await supabase
        .from("results")
        .select("*")
        .in("applicant_id", ids)
        .eq("year", settings.admission_year)
        
      if (foundList && foundList.length > 0) {
        setGroupResults(foundList)
        
        // Find which ones were not found
        const foundIds = foundList.map(r => r.applicant_id.toString())
        const notFoundIds = ids.filter(id => !foundIds.includes(id))
        setGroupNotFound(notFoundIds)
      } else {
        setGroupResults([])
        setGroupNotFound(ids)
      }
    } catch (err) {
      console.error("Error fetching group results:", err)
      setGroupResults([])
      setGroupNotFound(ids)
    }

    setIsGroupLoading(false)
    setShowGroupModal(true)
  }

  const handleGroupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const ids = groupInput.split(',').map(id => id.trim()).filter(id => id !== '')
    if (ids.length > 0) {
      await performGroupSearch(ids)
    }
  }

  const closeGroupModal = () => {
    setShowGroupModal(false)
    setGroupResults([])
    setGroupNotFound([])
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const data = results.data as any[]
        const ids = data
          .map((row) => row.applicant_id || row.applicantid || row.id || row.applicant_id_no)
          .filter((id) => id !== undefined && id !== null && String(id).trim() !== "")
          .map((id) => String(id).trim())
        
        if (ids.length > 0) {
          setGroupInput(ids.join(", "))
          performGroupSearch(ids)
        } else {
          // If applicant_id column not found or empty, alert the user or fallback
          console.error("No valid applicant_id found in CSV. Headers found:", results.meta.fields)
          alert("Could not find any 'applicant_id' in the uploaded CSV. Please check the column name.")
        }
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error)
        alert("Error parsing CSV file.")
      }
    })
  }

  // Helper: convert full department name to short abbreviation
  const getDeptAbbr = (fullName: string): string => {
    const entry = Object.entries(DEPARTMENTS).find(([, name]) => name === fullName)
    return entry ? entry[0] : fullName
  }

  const downloadGroupPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // ── Title ──
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(26, 54, 93) // #1a365d
    doc.text(`Undergraduate Admission Result - ${settings.admission_year}`, 14, 20)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 100, 100)
    doc.text(`Group Wise Result | Dhaka University of Engineering & Technology, Gazipur`, 14, 27)
    
    // ── Divider line ──
    doc.setDrawColor(0, 106, 78)
    doc.setLineWidth(0.8)
    doc.line(14, 30, pageWidth - 14, 30)
    
    // ── Compute stats ──
    let pdfSelectedCount = 0;
    let pdfWaitingCount = 0;
    const selectedDeptStats: Record<string, number> = {};
    const waitingDeptStats: Record<string, number> = {};

    groupResults.forEach(r => {
      const dept = r.department ? getDeptAbbr(r.department) : "N/A";
      if (r.status?.toLowerCase().includes("provisionally selected")) {
        pdfSelectedCount++;
        selectedDeptStats[dept] = (selectedDeptStats[dept] || 0) + 1;
      } else if (r.status?.toLowerCase().includes("waiting")) {
        pdfWaitingCount++;
        waitingDeptStats[dept] = (waitingDeptStats[dept] || 0) + 1;
      }
    });

    const selectedDeptStr = Object.entries(selectedDeptStats)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count]) => `${dept}: ${count}`)
      .join(" | ");

    const waitingDeptStr = Object.entries(waitingDeptStats)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count]) => `${dept}: ${count}`)
      .join(" | ");

    // ── Summary row ──
    let cursorY = 36;
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    
    doc.setTextColor(26, 54, 93)
    doc.text(`Total Students: ${groupResults.length}`, 14, cursorY)
    
    doc.setTextColor(22, 163, 74) // Green
    doc.text(`Selected: ${pdfSelectedCount}`, 65, cursorY)
    
    doc.setTextColor(217, 119, 6) // Amber
    doc.text(`In Waiting List: ${pdfWaitingCount}`, 110, cursorY)
    
    if (groupNotFound.length > 0) {
      doc.setTextColor(220, 38, 38) // Red
      doc.text(`Not Found: ${groupNotFound.length}`, 160, cursorY)
    }
    
    cursorY += 7;

    // ── Selected dept breakdown (green) ──
    if (selectedDeptStr) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(22, 163, 74)
      doc.text("Selected", 14, cursorY)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 60, 60)
      doc.text(`- ${selectedDeptStr}`, 14 + doc.getTextWidth("Selected") + 2, cursorY)
      const selLines = doc.splitTextToSize(`Selected - ${selectedDeptStr}`, 180)
      cursorY += selLines.length * 4.5 + 2
    }

    // ── Waiting dept breakdown (amber) ──
    if (waitingDeptStr) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(217, 119, 6)
      doc.text("Waiting", 14, cursorY)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 60, 60)
      doc.text(`- ${waitingDeptStr}`, 14 + doc.getTextWidth("Waiting") + 2, cursorY)
      const waitLines = doc.splitTextToSize(`Waiting - ${waitingDeptStr}`, 180)
      cursorY += waitLines.length * 4.5 + 2
    }

    // ── Thin divider before table ──
    cursorY += 1
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(14, cursorY, pageWidth - 14, cursorY)
    cursorY += 4
    
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
    
    const tableColumn = ["#", "Applicant ID", "Name", "Department", "Status"]
    const tableRows: any[] = []
    
    groupResults.forEach((res, idx) => {
      tableRows.push([
        (idx + 1).toString(),
        res.applicant_id,
        res.applicant_name,
        getDeptAbbr(res.department),
        res.status
      ])
    })
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: cursorY,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
        textColor: [40, 40, 40],
      },
      headStyles: {
        fillColor: [0, 106, 78],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9.5,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [245, 250, 248]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },  // #
        1: { cellWidth: 30 },                     // Applicant ID
        4: { fontStyle: 'bold' }                   // Status
      },
      didParseCell: (data: any) => {
        // Color-code the Status column
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw).toLowerCase();
          if (val.includes('provisionally selected')) {
            data.cell.styles.textColor = [22, 163, 74]; // green
          } else if (val.includes('waiting')) {
            data.cell.styles.textColor = [217, 119, 6]; // amber
          }
        }
      },
      margin: { left: 14, right: 14 }
    })
    
    // ── Not Found / Not Selected Section ──
    if (groupNotFound.length > 0) {
      const lastTableY = (doc as any).lastAutoTable?.finalY || cursorY + 20
      let notFoundY = lastTableY + 10
      
      // Check if we need a new page
      if (notFoundY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        notFoundY = 20
      }
      
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(220, 38, 38) // Red
      doc.text(`Not Found / Not Selected (${groupNotFound.length})`, 14, notFoundY)
      
      notFoundY += 2
      doc.setDrawColor(220, 38, 38)
      doc.setLineWidth(0.4)
      doc.line(14, notFoundY, pageWidth - 14, notFoundY)
      notFoundY += 4
      
      const notFoundRows = groupNotFound.map((id, idx) => [
        (idx + 1).toString(),
        id,
        "Not Found"
      ])
      
      autoTable(doc, {
        head: [["#", "Applicant ID", "Status"]],
        body: notFoundRows,
        startY: notFoundY,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [220, 220, 220],
          lineWidth: 0.2,
          textColor: [40, 40, 40],
        },
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9.5,
          halign: 'left'
        },
        alternateRowStyles: {
          fillColor: [254, 242, 242]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          2: { fontStyle: 'bold', textColor: [220, 38, 38] }
        },
        margin: { left: 14, right: 14 }
      })
    }
    
    // ── Footer on each page ──
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      doc.text(
        `Generated from DUET Admission Portal  •  Page ${i} of ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      )
    }
    
    doc.save(`duet_group_results_${settings.admission_year}.pdf`)
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
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-[0_4px_28px_rgba(0,106,78,0.11)] border-t-4 border-t-[#006a4e]">
            <div className="px-8 sm:px-10 py-8 sm:py-10">
              <div className="mb-6 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1a365d] dark:text-zinc-50 tracking-tight">
                  Check Result
                </h2>
              </div>
              
              {/* Custom Tab Buttons */}
              <div className="grid grid-cols-2 gap-0 mb-8 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("individual")}
                  className={`relative rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 cursor-pointer overflow-hidden ${
                    activeTab === "individual"
                      ? "bg-white dark:bg-zinc-700 text-[#1a365d] dark:text-zinc-50 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {activeTab === "individual" && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-red-500 rounded-r-full transition-all duration-300" />
                  )}
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("group")}
                  className={`relative rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 cursor-pointer overflow-hidden ${
                    activeTab === "group"
                      ? "bg-white dark:bg-zinc-700 text-[#1a365d] dark:text-zinc-50 shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {activeTab === "group" && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-red-500 rounded-r-full transition-all duration-300" />
                  )}
                  Multiple
                </button>
              </div>

              {/* Sliding Tab Content */}
              <div className="relative h-[200px] overflow-hidden">
                <div
                  className="flex transition-transform duration-400 ease-in-out h-full"
                  style={{ transform: activeTab === "individual" ? "translateX(0%)" : "translateX(-100%)" }}
                >
                  {/* Individual Panel */}
                  <div className="w-full flex-shrink-0 flex flex-col justify-center">
                    <form onSubmit={handleSubmit} className="space-y-6 w-full">
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
                          className="w-full sm:w-1/2 h-12 rounded-xl font-semibold text-base tracking-wide transition-all duration-200 shadow hover:shadow-md cursor-pointer"
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

                  {/* Group/Multiple Panel */}
                  <div className="w-full flex-shrink-0 flex flex-col justify-center">
                    <form onSubmit={handleGroupSubmit} className="space-y-6 w-full">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold text-[#1a365d] dark:text-zinc-300">
                          Upload Applicant IDs (CSV)
                        </Label>
                        
                        <div 
                          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${isGroupLoading ? 'border-[#006a4e] bg-[#e6f0ed] dark:bg-[#006a4e]/10' : 'border-zinc-300 dark:border-zinc-700 bg-[#f7fafc] dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                          onClick={() => { if (!isGroupLoading) fileInputRef.current?.click() }}
                        >
                          {isGroupLoading ? (
                             <div className="flex flex-col items-center justify-center">
                                <svg className="animate-spin h-8 w-8 text-[#006a4e] mb-3" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <p className="text-sm font-medium text-[#1a365d] dark:text-zinc-200">Searching Group Results...</p>
                             </div>
                          ) : (
                             <>
                               <Upload className="w-8 h-8 text-zinc-400 mb-3" />
                               <p className="text-sm font-medium text-[#1a365d] dark:text-zinc-200 mb-1">Click to select CSV file</p>
                               <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                                 File must contain `applicant_id` column.<br/>
                                 {groupInput ? <span className="text-[#006a4e] dark:text-emerald-400 font-semibold mt-2 block">{groupInput.split(',').length} IDs loaded and ready to search.</span> : null}
                               </p>
                               <input 
                                 type="file" 
                                 accept=".csv" 
                                 ref={fileInputRef} 
                                 style={{ display: 'none' }} 
                                 onChange={handleFileUpload}
                               />
                             </>
                          )}
                        </div>
                      </div>
                      
                      {!settings.result_published ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                            Result checking has been temporarily disabled by the administration.
                          </p>
                        </div>
                      ) : null}
                    </form>
                  </div>
                </div>
              </div>
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

      {/* ── GROUP RESULT MODAL ── */}
      {showGroupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6 sm:py-10 animate-in fade-in duration-200"
          onClick={closeGroupModal}
        >
          <div
            className="relative w-full max-w-4xl max-h-full flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeGroupModal}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>

            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 sm:mt-0">
              <div>
                <h3 className="text-xl font-bold text-[#1a365d] dark:text-zinc-50">
                  Group Admission Results
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Found {groupResults.length} result(s)
                </p>
              </div>
              {groupResults.length > 0 && (
                <Button 
                  onClick={downloadGroupPDF}
                  className="bg-[#006a4e] hover:bg-[#005a40] text-white flex items-center gap-2 h-10 rounded-xl px-4 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              )}
            </div>

            {/* Content: Table */}
            <div className="flex-1 overflow-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50">
              {groupResults.length > 0 ? (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                  <Table>
                    <TableHeader className="bg-zinc-100/50 dark:bg-zinc-800/50">
                      <TableRow>
                        <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">ID</TableHead>
                        <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300 min-w-[150px]">Name</TableHead>
                        <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300">Department</TableHead>
                        <TableHead className="font-semibold text-zinc-700 dark:text-zinc-300">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupResults.map((res, idx) => (
                        <TableRow key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 border-b-zinc-100 dark:border-b-zinc-800/50">
                          <TableCell className="font-medium text-[#1a365d] dark:text-zinc-200 py-3">{res.applicant_id}</TableCell>
                          <TableCell className="py-3">{res.applicant_name}</TableCell>
                          <TableCell className="py-3">{res.department}</TableCell>
                          <TableCell className="py-3">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap"
                              style={{
                                backgroundColor: res.status?.toLowerCase().includes("provisionally selected") ? "#dcfce7" : "#fef3c7",
                                color: res.status?.toLowerCase().includes("provisionally selected") ? "#16a34a" : "#d97706",
                              }}
                            >
                              {res.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full min-h-[200px]">
                  <AlertTriangle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No results found</p>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    We couldn't find any results for the provided Applicant IDs.
                  </p>
                </div>
              )}
              
              {groupNotFound.length > 0 && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    IDs not found ({groupNotFound.length})
                  </h4>
                  <p className="text-xs text-red-600 dark:text-red-500 leading-relaxed break-words">
                    {groupNotFound.join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <Button
                onClick={closeGroupModal}
                variant="outline"
                className="w-full h-11 rounded-xl font-semibold text-sm tracking-wide bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
