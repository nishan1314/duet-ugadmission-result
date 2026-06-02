"use client"

import { useState, useEffect } from "react"
import { Users, Search, CheckCircle2, Clock, Calendar as CalendarIcon, TrendingUp, Award, Activity } from "lucide-react"
import { StatCard } from "@/components/admin/stat-card"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts"



export default function AdminDashboardPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)
  
  const [visitorMonth, setVisitorMonth] = useState<string>("all")
  const [searchMonth, setSearchMonth] = useState<string>("all")
  const [visitorLoading, setVisitorLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  const [stats, setStats] = useState({
    uniqueVisitors: 0,
    resultsSearched: 0,
    selectedCandidates: 0,
    waitingList: 0,
    totalApplied: 0,
  })

  const [activityData, setActivityData] = useState<any[]>([])
  const [deptData, setDeptData] = useState<any[]>([])
  const [recentActions, setRecentActions] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // -----------------------------------

        // 1. Fetch total unique visitors count from active logs
        const { count: activeVisitorsCount, error: visitorsErr } = await supabase
          .from("visitor_logs")
          .select("*", { count: "exact", head: true })

        // 2. Fetch total searches count from active logs
        const { count: activeSearchesCount, error: searchesErr } = await supabase
          .from("search_logs")
          .select("*", { count: "exact", head: true })

        // Fetch historical counts from monthly_stats
        const { data: historicalStats, error: histErr } = await supabase
          .from("monthly_stats")
          .select("total_visitors, total_searches")

        let histVisitors = 0
        let histSearches = 0
        if (historicalStats) {
          historicalStats.forEach((stat: any) => {
            histVisitors += (stat.total_visitors || 0)
            histSearches += (stat.total_searches || 0)
          })
        }

        if (visitorsErr || searchesErr || histErr) {
          console.error("Dashboard count errors:", visitorsErr || searchesErr || histErr)
        }

        const visitorsCount = (activeVisitorsCount || 0) + histVisitors;
        const searchesCount = (activeSearchesCount || 0) + histSearches;

        const { count: selectedCount } = await supabase
          .from("results")
          .select("*", { count: "exact", head: true })
          .ilike("status", "%provisionally selected%")

        const { count: waitingCount } = await supabase
          .from("results")
          .select("*", { count: "exact", head: true })
          .ilike("status", "%waiting%")

        // Fetch total applied candidates from yearly_candidate_totals for the latest year
        const { data: maxYearData } = await supabase
          .from("results")
          .select("year")
          .order("year", { ascending: false })
          .limit(1)
        const latestYear = maxYearData?.[0]?.year

        let totalApplied = 0
        if (latestYear) {
          const { data: totalData } = await supabase
            .from("yearly_candidate_totals")
            .select("total_candidates")
            .eq("year", latestYear)
            .single()
          totalApplied = totalData?.total_candidates || 0
        }

        setStats({
          uniqueVisitors: visitorsCount || 0,
          resultsSearched: searchesCount || 0,
          selectedCandidates: selectedCount || 0,
          waitingList: waitingCount || 0,
          totalApplied,
        })

        // 3. Generate last 7 days calendar range
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - i)
          return d.toISOString().split("T")[0] // YYYY-MM-DD
        }).reverse()

        // 4. Fetch last 7 days visitor logs
        const { data: visits } = await supabase
          .from("visitor_logs")
          .select("visit_date")
          .gte("visit_date", last7Days[0])

        // 5. Fetch last 7 days search logs
        const { data: searches } = await supabase
          .from("search_logs")
          .select("searched_at")
          .gte("searched_at", new Date(last7Days[0]).toISOString())

        // 6. Map logs into daily chart values
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const activityMap = last7Days.map((dateStr) => {
          const dateObj = new Date(dateStr)
          const dayName = dayNames[dateObj.getDay()]
          
          const dayVisits = visits?.filter((v: any) => v.visit_date === dateStr).length || 0
          const daySearches = searches?.filter((s: any) => {
            const sDate = new Date(s.searched_at).toISOString().split("T")[0]
            return sDate === dateStr
          }).length || 0

          return {
            day: dayName,
            searches: daySearches,
            visitors: dayVisits
          }
        })
        setActivityData(activityMap)

        // 7. Aggregate Searches by Department
        const { data: deptSearches } = await supabase
          .from("search_logs")
          .select("department")
          .not("department", "is", null)

        const depts = ["CSE", "EEE", "ME", "CE", "TEXTILE"]
        const colors = ["#006a4e", "#1a365d", "#319795", "#d69e2e", "#b7791f"]
        
        const deptMap = depts.map((dept, index) => {
          const count = deptSearches?.filter((s: any) => {
            const d = s.department?.toUpperCase() || ""
            return d.includes(dept)
          }).length || 0

          return {
            name: dept,
            value: count,
            color: colors[index]
          }
        })
        setDeptData(deptMap)

        // 8. Load recent system activity
        const { data: recentSearches } = await supabase
          .from("search_logs")
          .select("*")
          .order("searched_at", { ascending: false })
          .limit(3)

        const actions = [] as any[]
        if (recentSearches) {
          recentSearches.forEach((s: any) => {
            const timeAgo = formatTimeAgo(new Date(s.searched_at))
            actions.push({
              title: s.found ? "Successful result check" : "Result search failed",
              desc: s.found 
                ? `Applicant ID ${s.applicant_id} checked (${s.department || "No department"}).`
                : `Applicant ID ${s.applicant_id} was queried but not found.`,
              color: s.found ? "bg-green-500" : "bg-red-500",
              time: timeAgo
            })
          })
        }

        // Fallback standard log
        if (actions.length === 0) {
          actions.push({
            title: "Dashboard Initialized",
            desc: "Dynamic logging system connected successfully.",
            color: "bg-blue-500",
            time: "Just now"
          })
        }
        setRecentActions(actions)

      } catch (err: any) {
        console.error("Dashboard loader error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  async function fetchVisitorStats(month: string) {
    setVisitorLoading(true)
    let startDate, endDate, monthYearStr;
    if (month !== "all") {
      const currentYear = new Date().getFullYear();
      const monthInt = parseInt(month, 10);
      startDate = new Date(currentYear, monthInt - 1, 1).toISOString();
      endDate = new Date(currentYear, monthInt, 1).toISOString();
      monthYearStr = `${currentYear}-${monthInt.toString().padStart(2, "0")}`;
    }

    let visitorsQuery = supabase.from("visitor_logs").select("*", { count: "exact", head: true })
    if (startDate && endDate) visitorsQuery = visitorsQuery.gte("visit_date", startDate).lt("visit_date", endDate)
    const { count } = await visitorsQuery

    let historicalQuery = supabase.from("monthly_stats").select("total_visitors")
    if (monthYearStr) historicalQuery = historicalQuery.eq("month_year", monthYearStr)
    const { data } = await historicalQuery

    let total = count || 0
    if (data) data.forEach((d: any) => total += (d.total_visitors || 0))

    setStats(prev => ({ ...prev, uniqueVisitors: total }))
    setVisitorLoading(false)
  }

  async function fetchSearchStats(month: string) {
    setSearchLoading(true)
    let startDate, endDate, monthYearStr;
    if (month !== "all") {
      const currentYear = new Date().getFullYear();
      const monthInt = parseInt(month, 10);
      startDate = new Date(currentYear, monthInt - 1, 1).toISOString();
      endDate = new Date(currentYear, monthInt, 1).toISOString();
      monthYearStr = `${currentYear}-${monthInt.toString().padStart(2, "0")}`;
    }

    let searchesQuery = supabase.from("search_logs").select("*", { count: "exact", head: true })
    if (startDate && endDate) searchesQuery = searchesQuery.gte("searched_at", startDate).lt("searched_at", endDate)
    const { count } = await searchesQuery

    let historicalQuery = supabase.from("monthly_stats").select("total_searches")
    if (monthYearStr) historicalQuery = historicalQuery.eq("month_year", monthYearStr)
    const { data } = await historicalQuery

    let total = count || 0
    if (data) data.forEach((d: any) => total += (d.total_searches || 0))
    
    // update deptData as well
    let deptSearchesQuery = supabase.from("search_logs").select("department").not("department", "is", null)
    if (startDate && endDate) deptSearchesQuery = deptSearchesQuery.gte("searched_at", startDate).lt("searched_at", endDate)
    const { data: deptSearches } = await deptSearchesQuery

    const depts = ["CSE", "EEE", "ME", "CE", "TEXTILE"]
    const colors = ["#006a4e", "#1a365d", "#319795", "#d69e2e", "#b7791f"]
    const deptMap = depts.map((dept, index) => {
      const deptCount = deptSearches?.filter((s: any) => s.department?.toUpperCase().includes(dept)).length || 0
      return { name: dept, value: deptCount, color: colors[index] }
    })

    setDeptData(deptMap)
    setStats(prev => ({ ...prev, resultsSearched: total }))
    setSearchLoading(false)
  }

  // Helper function to format time ago
  function formatTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return "Just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader
          title="Dashboard"
          description="Welcome back. Generating admin dashboard logs..."
        />
        <div className="flex items-center justify-center py-40 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
          <div className="w-8 h-8 border-3 border-[#006a4e] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Welcome back, Administrator. Here's what's happening on your result check portal."
      />

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Visitors"
          value={visitorLoading ? "..." : stats.uniqueVisitors.toLocaleString()}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-50 dark:bg-blue-950/20"
          action={
            <Select value={visitorMonth} onValueChange={(val) => { setVisitorMonth(val); fetchVisitorStats(val); }}>
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">Jan</SelectItem>
                <SelectItem value="2">Feb</SelectItem>
                <SelectItem value="3">Mar</SelectItem>
                <SelectItem value="4">Apr</SelectItem>
                <SelectItem value="5">May</SelectItem>
                <SelectItem value="6">Jun</SelectItem>
                <SelectItem value="7">Jul</SelectItem>
                <SelectItem value="8">Aug</SelectItem>
                <SelectItem value="9">Sep</SelectItem>
                <SelectItem value="10">Oct</SelectItem>
                <SelectItem value="11">Nov</SelectItem>
                <SelectItem value="12">Dec</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <StatCard
          title="Results Searched"
          value={searchLoading ? "..." : stats.resultsSearched.toLocaleString()}
          icon={Search}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50 dark:bg-emerald-950/20"
          action={
            <Select value={searchMonth} onValueChange={(val) => { setSearchMonth(val); fetchSearchStats(val); }}>
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">Jan</SelectItem>
                <SelectItem value="2">Feb</SelectItem>
                <SelectItem value="3">Mar</SelectItem>
                <SelectItem value="4">Apr</SelectItem>
                <SelectItem value="5">May</SelectItem>
                <SelectItem value="6">Jun</SelectItem>
                <SelectItem value="7">Jul</SelectItem>
                <SelectItem value="8">Aug</SelectItem>
                <SelectItem value="9">Sep</SelectItem>
                <SelectItem value="10">Oct</SelectItem>
                <SelectItem value="11">Nov</SelectItem>
                <SelectItem value="12">Dec</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <StatCard
          title="Provisionally Selected"
          value={stats.selectedCandidates.toLocaleString()}
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBg="bg-green-50 dark:bg-green-950/20"
        />
        <StatCard
          title="Waiting List"
          value={stats.waitingList.toLocaleString()}
          icon={Clock}
          iconColor="text-amber-500"
          iconBg="bg-amber-50 dark:bg-amber-950/20"
        />
        <StatCard
          title="Total Candidates Applied"
          value={stats.totalApplied.toLocaleString()}
          icon={TrendingUp}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-50 dark:bg-indigo-950/20"
        />
      </div>

      {/* Grid: Charts & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Chart Card */}
        <Card className="lg:col-span-2 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50">
                Portal Activity
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Real-time unique visitors vs results searched over the last 7 days.
              </CardDescription>
            </div>
            <Activity className="w-5 h-5 text-[#006a4e] opacity-75" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activityData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006a4e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#006a4e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a365d" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#1a365d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#1a365d"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="searches"
                    stroke="#006a4e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSearches)"
                    name="Searches"
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#1a365d"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorVisitors)"
                    name="Unique Visitors"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Card */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50">
                Calendar Schedule
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                System events and tasks
              </CardDescription>
            </div>
            <CalendarIcon className="w-5 h-5 text-[#006a4e] opacity-75" />
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-2 pb-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm bg-zinc-50/50 dark:bg-zinc-950/20"
            />
          </CardContent>
        </Card>

      </div>

      {/* Grid: Searches by Department */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Stats */}
        <Card className="lg:col-span-2 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50">
                Searches by Department
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Popularity distribution based on query metrics.
              </CardDescription>
            </div>
            <Award className="w-5 h-5 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              {deptData.every(d => d.value === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-sm text-zinc-500 dark:text-zinc-400 gap-2 border border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/30">
                  <TrendingUp className="w-8 h-8 text-zinc-300" />
                  No search logs mapped to departments yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={deptData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#1a365d"
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                      {deptData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live system state / summary list */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50">
              Live System Logs
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Real-time events recorded in search databases.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActions.map((act, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full ${act.color} mt-2 flex-shrink-0`} />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-[#1a365d] dark:text-zinc-50">
                    {act.title}
                  </p>
                  <p className="text-xs text-[#4a5568] dark:text-zinc-400">
                    {act.desc}
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">{act.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
