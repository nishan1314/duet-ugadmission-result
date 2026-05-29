import { type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: string; positive: boolean }
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-[#006a4e]",
  iconBg = "bg-[#e8f5f0]",
  trend,
}: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#4a5568] dark:text-zinc-400">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#1a365d] dark:text-zinc-50 tracking-tight">
              {value}
            </p>
            {trend && (
              <p
                className={`text-xs font-semibold ${
                  trend.positive ? "text-green-500" : "text-red-500"
                }`}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div
            className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
