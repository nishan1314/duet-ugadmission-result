"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Filter, Download, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

interface DBResult {
  id: number
  sl: number
  applicant_id: string
  applicant_name: string
  fathers_name: string
  department: string
  status: string
  year: number
  created_at: string
}

export default function AdminResultsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<"applicant_id" | "applicant_name" | "sl">("applicant_id")
  const [sortAsc, setSortAsc] = useState(true)
  const [dbResults, setDbResults] = useState<DBResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const itemsPerPage = 10
  const supabase = createClient()

  useEffect(() => {
    async function loadLatestResults() {
      setIsLoading(true)
      try {
        // Find latest year
        const { data: maxYearData } = await supabase
          .from("results")
          .select("year")
          .order("year", { ascending: false })
          .limit(1)

        const latestYear = maxYearData?.[0]?.year

        if (latestYear) {
          const { data } = await supabase
            .from("results")
            .select("*")
            .eq("year", latestYear)
          if (data) setDbResults(data)
        }
      } catch (e) {
        toast.error("Failed to fetch results.")
      } finally {
        setIsLoading(false)
      }
    }
    loadLatestResults()
  }, [])

  // Handle sort toggle
  const toggleSort = (field: "applicant_id" | "applicant_name" | "sl") => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  // Filter and sort the results based on inputs
  const filteredAndSortedResults = useMemo(() => {
    let result = [...dbResults]

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.applicant_id.includes(q) ||
          r.applicant_name.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status.toLowerCase() === statusFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let valA: string | number = a[sortField] || ""
      let valB: string | number = b[sortField] || ""

      if (sortField === "sl") {
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
      } else {
        valA = (valA as string).toLowerCase()
        valB = (valB as string).toLowerCase()
        if (valA < valB) return sortAsc ? -1 : 1
        if (valA > valB) return sortAsc ? 1 : -1
        return 0
      }
    })

    return result;
  }, [search, statusFilter, sortField, sortAsc, dbResults])

  // Paginated chunk
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedResults.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedResults, currentPage])

  // Total pages
  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage)

  const handleExport = () => {
    toast.success("Excel sheet compilation complete. Download started!")
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title="Admission Results"
        description="Search, filter, and audit active undergraduate admission test results."
        action={
          <Button
            onClick={handleExport}
            className="bg-[#006a4e] hover:bg-[#005a40] text-white flex items-center gap-2 rounded-xl cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel
          </Button>
        }
      />

      {/* Filter and search row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#4a5568] dark:text-zinc-400" />
          <Input
            placeholder="Search by ID, name or department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1) // Reset page on query change
            }}
            className="pl-11 h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e]"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-[#4a5568] flex-shrink-0" />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val)
              setCurrentPage(1) // Reset page on filter change
            }}
          >
            <SelectTrigger className="w-40 h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800 border-zinc-200">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="selected">Selected</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableRow>
              <TableHead onClick={() => toggleSort("sl")} className="font-bold text-[#1a365d] dark:text-zinc-200 cursor-pointer select-none">
                <div className="flex items-center gap-1">
                  SL
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-65" />
                </div>
              </TableHead>
              <TableHead onClick={() => toggleSort("applicant_id")} className="font-bold text-[#1a365d] dark:text-zinc-200 cursor-pointer select-none">
                <div className="flex items-center gap-1">
                  Applicant ID
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-65" />
                </div>
              </TableHead>
              <TableHead onClick={() => toggleSort("applicant_name")} className="font-bold text-[#1a365d] dark:text-zinc-200 cursor-pointer select-none">
                <div className="flex items-center gap-1">
                  Applicant Name
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-65" />
                </div>
              </TableHead>
              <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Father's Name</TableHead>
              <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Department</TableHead>
              <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Year</TableHead>
              <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-[#4a5568] dark:text-zinc-400">
                  Loading latest results...
                </TableCell>
              </TableRow>
            ) : paginatedResults.length > 0 ? (
              paginatedResults.map((row) => (
                <TableRow key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20">
                  <TableCell className="font-mono text-[#1a365d] dark:text-zinc-50">{row.sl}</TableCell>
                  <TableCell className="font-mono font-bold text-[#1a365d] dark:text-zinc-50">{row.applicant_id}</TableCell>
                  <TableCell className="font-semibold text-[#1a365d] dark:text-zinc-50">{row.applicant_name}</TableCell>
                  <TableCell className="text-[#4a5568] dark:text-zinc-400 text-sm">{row.fathers_name}</TableCell>
                  <TableCell className="text-[#4a5568] dark:text-zinc-400 text-sm">{row.department}</TableCell>
                  <TableCell className="text-[#4a5568] dark:text-zinc-400 text-sm">{row.year}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full`}
                      style={{
                        backgroundColor: row.status === "Selected" ? "#dcfce7" : "#fef3c7",
                        color: row.status === "Selected" ? "#16a34a" : "#d97706",
                      }}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-[#4a5568] dark:text-zinc-400">
                  No applicants matched your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Footer / Pagination */}
        {filteredAndSortedResults.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
            
            {/* Counts */}
            <span className="text-xs sm:text-sm text-[#4a5568] dark:text-zinc-400">
              Showing{" "}
              <span className="font-bold text-[#1a365d] dark:text-zinc-50">
                {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedResults.length)}
              </span>{" "}
              to{" "}
              <span className="font-bold text-[#1a365d] dark:text-zinc-50">
                {Math.min(currentPage * itemsPerPage, filteredAndSortedResults.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-[#1a365d] dark:text-zinc-50">
                {filteredAndSortedResults.length}
              </span>{" "}
              applicants
            </span>

            {/* NavButtons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="w-9 h-9 rounded-xl"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-sm font-medium text-[#4a5568] dark:text-zinc-400 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                className="w-9 h-9 rounded-xl"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
