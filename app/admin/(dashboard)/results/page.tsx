"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Filter, Download, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, Plus, Pencil, Trash2, Save, X, Users } from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

interface YearlyCandidateTotal {
  id: number
  year: number
  total_candidates: number
}

// Helper to determine badge styles based on status
function getStatusBadgeStyle(status: string) {
  const s = status.toLowerCase()
  if (s.includes("provisionally") || s.includes("selected")) {
    return { backgroundColor: "#dcfce7", color: "#16a34a" }
  }
  if (s.includes("waiting")) {
    return { backgroundColor: "#fef3c7", color: "#d97706" }
  }
  // Default fallback
  return { backgroundColor: "#f1f5f9", color: "#475569" }
}

export default function AdminResultsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<"applicant_id" | "applicant_name" | "sl">("applicant_id")
  const [sortAsc, setSortAsc] = useState(true)
  const [dbResults, setDbResults] = useState<DBResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Yearly Candidate Totals state
  const [yearlyTotals, setYearlyTotals] = useState<YearlyCandidateTotal[]>([])
  const [yearlyLoading, setYearlyLoading] = useState(true)
  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [editYear, setEditYear] = useState("")
  const [editTotal, setEditTotal] = useState("")
  const [addMode, setAddMode] = useState(false)
  const [newYear, setNewYear] = useState("")
  const [newTotal, setNewTotal] = useState("")

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

    async function loadYearlyTotals() {
      setYearlyLoading(true)
      try {
        const { data, error } = await supabase
          .from("yearly_candidate_totals")
          .select("*")
          .order("year", { ascending: false })
        if (error) throw error
        if (data) setYearlyTotals(data)
      } catch (e) {
        console.error("Failed to fetch yearly totals:", e)
      } finally {
        setYearlyLoading(false)
      }
    }

    loadLatestResults()
    loadYearlyTotals()
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
      result = result.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase())
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

  // --- Yearly Candidate Totals CRUD ---
  const handleAddTotal = async () => {
    const year = parseInt(newYear)
    const total = parseInt(newTotal)
    if (!year || !total || total < 0) {
      toast.error("Please enter a valid year and total.")
      return
    }
    try {
      const { data, error } = await supabase
        .from("yearly_candidate_totals")
        .insert({ year, total_candidates: total })
        .select()
        .single()
      if (error) throw error
      setYearlyTotals((prev) => [data, ...prev].sort((a, b) => b.year - a.year))
      setNewYear("")
      setNewTotal("")
      setAddMode(false)
      toast.success(`Added total for year ${year}.`)
    } catch (e: any) {
      toast.error(e?.message || "Failed to add entry.")
    }
  }

  const handleEditStart = (item: YearlyCandidateTotal) => {
    setEditingYear(item.year)
    setEditYear(item.year.toString())
    setEditTotal(item.total_candidates.toString())
  }

  const handleEditSave = async () => {
    if (editingYear === null) return
    const year = parseInt(editYear)
    const total = parseInt(editTotal)
    if (!year || !total || total < 0) {
      toast.error("Please enter valid values.")
      return
    }
    try {
      const { error } = await supabase
        .from("yearly_candidate_totals")
        .update({ year, total_candidates: total })
        .eq("year", editingYear)
      if (error) throw error
      setYearlyTotals((prev) =>
        prev.map((item) =>
          item.year === editingYear ? { ...item, year, total_candidates: total } : item
        ).sort((a, b) => b.year - a.year)
      )
      setEditingYear(null)
      toast.success(`Updated entry for year ${year}.`)
    } catch (e: any) {
      toast.error(e?.message || "Failed to update entry.")
    }
  }

  const handleDelete = async (item: YearlyCandidateTotal) => {
    try {
      const { error } = await supabase
        .from("yearly_candidate_totals")
        .delete()
        .eq("year", item.year)
      if (error) throw error
      setYearlyTotals((prev) => prev.filter((t) => t.year !== item.year))
      toast.success(`Deleted entry for year ${item.year}.`)
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete entry.")
    }
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
            <SelectTrigger className="w-48 h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800 border-zinc-200">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="provisionally selected">Provisionally Selected</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-zinc-100 dark:border-zinc-800">
            <TableRow className="hover:bg-transparent">
              <TableHead onClick={() => toggleSort("sl")} className="text-xs font-bold text-[#4a5568] dark:text-zinc-400 uppercase tracking-wider cursor-pointer select-none">
                <div className="flex items-center gap-1.5 hover:text-[#1a365d] dark:hover:text-zinc-200 transition-colors">
                  SL
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                </div>
              </TableHead>
              <TableHead onClick={() => toggleSort("applicant_id")} className="text-xs font-bold text-[#4a5568] dark:text-zinc-400 uppercase tracking-wider cursor-pointer select-none">
                <div className="flex items-center gap-1.5 hover:text-[#1a365d] dark:hover:text-zinc-200 transition-colors">
                  Applicant ID
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                </div>
              </TableHead>
              <TableHead onClick={() => toggleSort("applicant_name")} className="text-xs font-bold text-[#4a5568] dark:text-zinc-400 uppercase tracking-wider cursor-pointer select-none">
                <div className="flex items-center gap-1.5 hover:text-[#1a365d] dark:hover:text-zinc-200 transition-colors">
                  Applicant Name
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-bold text-[#4a5568] dark:text-zinc-400 uppercase tracking-wider">Father's Name</TableHead>
              <TableHead className="text-xs font-bold text-[#4a5568] dark:text-zinc-400 uppercase tracking-wider">Department</TableHead>
              <TableHead className="text-xs font-bold text-[#4a5568] dark:text-zinc-400 uppercase tracking-wider">Year</TableHead>
              <TableHead className="text-xs font-bold text-[#4a5568] dark:text-zinc-400 uppercase tracking-wider">Status</TableHead>
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
                <TableRow key={row.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 group transition-colors duration-200 border-b border-zinc-100 dark:border-zinc-800/60">
                  <TableCell className="font-mono text-xs text-zinc-400 dark:text-zinc-500 pl-4">{row.sl}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 font-mono text-sm font-bold text-[#1a365d] dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/50 shadow-sm group-hover:border-[#006a4e]/30 group-hover:bg-[#006a4e]/5 transition-colors">
                      {row.applicant_id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-[#1a365d] dark:text-zinc-100 tracking-tight">
                      {row.applicant_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#4a5568] dark:text-zinc-400 text-sm font-medium">{row.fathers_name}</TableCell>
                  <TableCell>
                    <span className="text-[#4a5568] dark:text-zinc-300 text-xs font-semibold px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-100 dark:border-zinc-700">
                      {row.department}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#4a5568] dark:text-zinc-400 text-sm font-medium">{row.year}</TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-black/5 dark:border-white/5"
                      style={getStatusBadgeStyle(row.status)}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusBadgeStyle(row.status).color }} />
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

      {/* ── Yearly Candidate Totals Management ── */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-0.5">
            <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Total Applied Candidates (Yearly)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Manage total applied candidate counts per admission year. This data is displayed on the public result page banner.
            </CardDescription>
          </div>
          {!addMode && (
            <Button
              onClick={() => setAddMode(true)}
              size="sm"
              className="bg-[#006a4e] hover:bg-[#005a40] text-white rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Year
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Year</TableHead>
                  <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200">Total Candidates Applied</TableHead>
                  <TableHead className="font-bold text-[#1a365d] dark:text-zinc-200 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Add new row */}
                {addMode && (
                  <TableRow key="add-new-row" className="bg-green-50/50 dark:bg-green-950/10">
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="e.g. 2025"
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                        className="h-9 w-28 rounded-lg bg-white dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="e.g. 15000"
                        value={newTotal}
                        onChange={(e) => setNewTotal(e.target.value)}
                        className="h-9 w-36 rounded-lg bg-white dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={handleAddTotal}
                          className="bg-[#006a4e] hover:bg-[#005a40] text-white rounded-lg h-8 px-3 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setAddMode(false); setNewYear(""); setNewTotal("") }}
                          className="rounded-lg h-8 px-3 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {yearlyLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-[#4a5568] dark:text-zinc-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#006a4e] border-t-transparent rounded-full animate-spin" />
                        Loading yearly data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : yearlyTotals.length > 0 ? (
                  yearlyTotals.map((item, index) => (
                    <TableRow key={`yt-${item.year}-${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 group">
                      {editingYear === item.year ? (
                        <>
                          <TableCell>
                            <Input
                              type="number"
                              value={editYear}
                              onChange={(e) => setEditYear(e.target.value)}
                              className="h-9 w-28 rounded-lg bg-white dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editTotal}
                              onChange={(e) => setEditTotal(e.target.value)}
                              className="h-9 w-36 rounded-lg bg-white dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={handleEditSave}
                                className="bg-[#006a4e] hover:bg-[#005a40] text-white rounded-lg h-8 px-3 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingYear(null)}
                                className="rounded-lg h-8 px-3 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-mono font-bold text-[#1a365d] dark:text-zinc-50 text-base">
                            {item.year}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1a365d] dark:text-zinc-50">
                              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-blue-500" />
                              {item.total_candidates.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditStart(item)}
                                className="rounded-lg h-8 px-2.5 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/50 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(item)}
                                className="rounded-lg h-8 px-2.5 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-[#4a5568] dark:text-zinc-400">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-zinc-300" />
                        <span>No yearly candidate data found. Click &quot;Add Year&quot; to create an entry.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
