import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Panel - DUET",
  description: "DUET Admission Result Admin Panel",
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
