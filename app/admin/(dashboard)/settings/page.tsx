"use client"

import { useState, useEffect } from "react"
import { Settings, Eye, Volume2, ShieldAlert, Save } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Config States
  const [siteTitle, setSiteTitle] = useState("")
  const [siteDesc, setSiteDesc] = useState("")
  const [publishResult, setPublishResult] = useState(true)
  const [showAnnounce, setShowAnnounce] = useState(true)
  const [showStatsInBanner, setShowStatsInBanner] = useState(false)
  const [announceText, setAnnounceText] = useState("")
  const [maintenance, setMaintenance] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState("")

  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("*")
        
        if (error) {
          toast.error("Failed to load site settings: " + error.message)
          return
        }

        if (data) {
          data.forEach((row: { key: string; value: string }) => {
            const val = row.value
            if (row.key === "site_title") setSiteTitle(val)
            else if (row.key === "site_description") setSiteDesc(val)
            else if (row.key === "result_published") setPublishResult(val === "true")
            else if (row.key === "show_announcement") setShowAnnounce(val === "true")
            else if (row.key === "show_stats_in_banner") setShowStatsInBanner(val === "true")
            else if (row.key === "announcement_text") setAnnounceText(val)
            else if (row.key === "maintenance_mode") setMaintenance(val === "true")
            else if (row.key === "maintenance_message") setMaintenanceMsg(val)
          })
        }
      } catch (err: any) {
        toast.error("Error loading settings: " + (err.message || err))
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const settingsData = [
        { key: "site_title", value: siteTitle, updated_by: user?.id },
        { key: "site_description", value: siteDesc, updated_by: user?.id },
        { key: "result_published", value: String(publishResult), updated_by: user?.id },
        { key: "show_announcement", value: String(showAnnounce), updated_by: user?.id },
        { key: "show_stats_in_banner", value: String(showStatsInBanner), updated_by: user?.id },
        { key: "announcement_text", value: announceText, updated_by: user?.id },
        { key: "maintenance_mode", value: String(maintenance), updated_by: user?.id },
        { key: "maintenance_message", value: maintenanceMsg, updated_by: user?.id },
      ]

      const { error } = await supabase
        .from("site_settings")
        .upsert(settingsData)

      if (error) {
        toast.error("Failed to save settings: " + error.message)
      } else {
        toast.success("Global site settings updated successfully!")
      }
    } catch (err: any) {
      toast.error("Unexpected saving error: " + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PageHeader
          title="Site Settings"
          description="Configure admission parameters, announcement banner options and general frontend variables."
        />
        <div className="flex items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <div className="w-8 h-8 border-3 border-[#006a4e] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }



  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        title="Site Settings"
        description="Configure admission parameters, announcement banner options and general frontend variables."
      />

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        
        {/* Card 1: General Settings */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
            <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#006a4e]" />
              General Configuration
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Global title and description used for SEO search indexation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-title" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">
                Site Title
              </Label>
              <Input
                id="site-title"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-desc" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">
                Meta Description
              </Label>
              <Textarea
                id="site-desc"
                value={siteDesc}
                onChange={(e) => setSiteDesc(e.target.value)}
                className="rounded-xl bg-zinc-50/50 dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] h-20 resize-none"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Result Publication Settings */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
            <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#006a4e]" />
              Result Visibility &amp; Calendar
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Control whether search panels are active for the public.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
              <div className="space-y-0.5">
                <Label className="text-sm sm:text-base font-semibold text-[#1a365d] dark:text-zinc-50">
                  Publish Results Live
                </Label>
                <p className="text-xs text-[#4a5568] dark:text-zinc-400">
                  Enable/disable search queries from applicants on public homepage.
                </p>
              </div>
              <Switch checked={publishResult} onCheckedChange={setPublishResult} />
            </div>



          </CardContent>
        </Card>

        {/* Card 3: Announcement settings */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
            <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-amber-500" />
              Portal Announcement Banner
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Show/hide a critical news alert at the top of the homepage.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
              <div className="space-y-0.5">
                <Label className="text-sm sm:text-base font-semibold text-[#1a365d] dark:text-zinc-50">
                  Display Announcement Banner
                </Label>
                <p className="text-xs text-[#4a5568] dark:text-zinc-400">
                  Activates a colorful notification alert above the site header.
                </p>
              </div>
              <Switch checked={showAnnounce} onCheckedChange={setShowAnnounce} />
            </div>

            {showAnnounce && (
              <div className="space-y-6 animate-in slide-in-from-top-3 duration-200">
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm sm:text-base font-semibold text-[#1a365d] dark:text-zinc-50">
                      Show Admission Statistics
                    </Label>
                    <p className="text-xs text-[#4a5568] dark:text-zinc-400">
                      Toggle to display dynamic result statistics in the banner.
                    </p>
                  </div>
                  <Switch checked={showStatsInBanner} onCheckedChange={setShowStatsInBanner} />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="announce-desc" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">
                      Notice Headline(s)
                    </Label>
                    <p className="text-xs text-[#4a5568] dark:text-zinc-400">
                      Enter multiple notices by separating them with a new line (Enter).
                    </p>
                  </div>
                  <Textarea
                    id="announce-desc"
                    value={announceText}
                    onChange={(e) => setAnnounceText(e.target.value)}
                    className="rounded-xl bg-zinc-50/50 dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] h-24 resize-none"
                    placeholder="Enter notice text here..."
                  />
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Card 4: Portal Maintenance Mode */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
            <CardTitle className="text-base sm:text-lg font-bold text-[#1a365d] dark:text-zinc-50 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              System Maintenance Offline Mode
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Instantly lock search portal for scheduled system updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-red-50/30">
              <div className="space-y-0.5">
                <Label className="text-sm sm:text-base font-semibold text-red-600 dark:text-red-400">
                  Activate Maintenance Mode
                </Label>
                <p className="text-xs text-[#4a5568] dark:text-zinc-400">
                  Blocks all applicant traffic and shows a maintenance screen.
                </p>
              </div>
              <Switch checked={maintenance} onCheckedChange={setMaintenance} />
            </div>

            {maintenance && (
              <div className="space-y-2 animate-in slide-in-from-top-3 duration-200">
                <Label htmlFor="maint-desc" className="text-sm font-semibold text-[#1a365d] dark:text-zinc-300">
                  Offline Message Content
                </Label>
                <Textarea
                  id="maint-desc"
                  value={maintenanceMsg}
                  onChange={(e) => setMaintenanceMsg(e.target.value)}
                  className="rounded-xl bg-zinc-50/50 dark:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-[#006a4e] h-20 resize-none"
                  required
                />
              </div>
            )}

          </CardContent>
        </Card>

        {/* Global Save Button */}
        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="h-11 bg-[#006a4e] hover:bg-[#005a40] text-white rounded-xl font-semibold px-8 shadow hover:shadow-md cursor-pointer flex items-center gap-2"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving Global settings...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Portal Settings
              </>
            )}
          </Button>
        </div>

      </form>
    </div>
  )
}
