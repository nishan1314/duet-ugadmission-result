"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  XCircle,
} from "lucide-react";
import Papa from "papaparse";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function AdmissionResultUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [year, setYear] = useState<string>("");
  const [clearExisting, setClearExisting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        setUploadError("Please select a valid CSV file.");
        return;
      }
      setFile(selectedFile);
      setUploadError(null);
      setParsedData(null);
      setSaveSuccess(false);
    }
  };

  const handleProcess = () => {
    if (!file) return;
    if (!year || year.trim().length === 0) {
      setUploadError("Please enter the admission year.");
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          setUploadError("Error parsing CSV file.");
          setIsProcessing(false);
          return;
        }
        setParsedData(results.data);
        setIsProcessing(false);
      },
      error: (error: any) => {
        setUploadError("Error reading file: " + error.message);
        setIsProcessing(false);
      }
    });
  };

  const handleConfirmSave = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setIsSaving(true);
    setUploadError(null);

    try {
      if (clearExisting) {
        const { error: deleteError } = await supabase
          .from("results")
          .delete()
          .neq("year", -1); // deletes all valid records

        if (deleteError) {
          throw new Error("Failed to clear old results: " + deleteError.message);
        }
      }

      const mappedData = parsedData.map((row, idx) => {
        const mappedRow: Record<string, any> = {};

        for (const [key, value] of Object.entries(row)) {
          const dbColumn = key
            .trim()
            .toLowerCase()
            .replace(/['"]/g, '')
            .replace(/[\s-]+/g, '_');
          
          mappedRow[dbColumn] = value;
        }

        return {
          sl: mappedRow.sl ?? null,
          applicant_id: mappedRow.applicant_id ?? null,
          applicant_name: mappedRow.applicant_name ?? null,
          fathers_name: mappedRow.fathers_name ?? null,
          department: mappedRow.department ?? null,
          status: mappedRow.status ?? "Selected",
          year: parseInt(year.trim(), 10),
        };
      });

      const { error } = await supabase
        .from("results")
        .insert(mappedData);

      if (error) {
        throw new Error(error.message);
      }
      setSaveSuccess(true);
    } catch (err: any) {
      setUploadError("Error saving data to Supabase: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = () => {
    setParsedData(null);
    setFile(null);
    setYear("");
    setSaveSuccess(false);
    setUploadError(null);
  };

  return (
    <div className="w-full bg-gray-50 text-gray-900 font-sans rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold tracking-tight">
            Admission Results Uploader
          </h2>
        </div>
        <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          CSV to Supabase
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Upload Section */}
        {!parsedData && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <div className="max-w-2xl mx-auto text-center space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold tracking-tight">
                  Upload Admission Data
                </h3>
                <p className="text-gray-500">
                  Upload a CSV file containing the admission records to insert into the database.
                </p>
              </div>

              <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessing}
                />
                <div className="flex flex-col items-center gap-4 pointer-events-none">
                  <div className="p-4 bg-gray-100 rounded-full group-hover:bg-blue-100 group-hover:scale-110 transition-transform">
                    <FileUp className="w-8 h-8 text-gray-400 group-hover:text-blue-600" />
                  </div>
                  {file ? (
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-base font-medium text-gray-900">
                        Click or drag CSV to upload
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 text-red-600 justify-center bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{uploadError}</p>
                </div>
              )}

              {file && (
                <div className="flex flex-col items-center gap-4 justify-center mt-6 w-full">
                  <div className="w-full max-w-sm mx-auto">
                    <input
                      type="number"
                      placeholder="Admission Year (e.g., 2025)"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      disabled={isProcessing}
                    />
                  </div>
                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />{" "}
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileUp className="w-5 h-5" /> Proceed
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Results State */}
        {parsedData && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
                    CSV Data Ready
                  </h3>
                </div>
                <p className="text-gray-500">
                  Found {parsedData.length} records for year {year}. Please review before saving.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!saveSuccess ? (
                  <>
                    <label className="flex items-center gap-2 mr-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clearExisting}
                        onChange={(e) => setClearExisting(e.target.checked)}
                        disabled={isSaving}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      Clear all old results
                    </label>
                    <button
                      onClick={handleReject}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors shadow-sm focus:ring-2 focus:ring-offset-1 focus:ring-red-200 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={handleConfirmSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Confirm & Save
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    New Upload
                  </button>
                )}
              </div>
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-red-600 justify-start bg-red-50 p-4 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{uploadError}</p>
              </div>
            )}

            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="font-medium">
                  Data successfully saved to the database!
                </p>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 shadow-sm">
                    <tr className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                      {parsedData.length > 0 && Object.keys(parsedData[0]).map((key, idx) => (
                         <th key={idx} className="px-6 py-4 whitespace-nowrap bg-gray-50">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-800">
                    {parsedData.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          No tabular data could be found or extracted from this file.
                        </td>
                      </tr>
                    )}
                    {parsedData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {Object.values(row).map((val: any, vIdx) => (
                          <td key={vIdx} className="px-6 py-3">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
