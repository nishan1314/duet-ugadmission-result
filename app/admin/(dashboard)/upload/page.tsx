import { AdmissionResultUploader } from "@/components/admin/AdmissionResultUploader"

export default function AdminUploadPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#1a365d] dark:text-zinc-50">
          Upload Results
        </h1>
        <p className="text-sm text-[#4a5568] dark:text-zinc-400">
          Upload and process admission result CSV files.
        </p>
      </div>
      
      <div className="w-full">
        <AdmissionResultUploader />
      </div>
    </div>
  )
}
