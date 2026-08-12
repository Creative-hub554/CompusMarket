"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SellerApplyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [documents, setDocuments] = useState<{ type: string; file: File | null; url: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
        <p className="text-slate-600 mb-4">Please sign in to apply as a seller.</p>
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">Go to Login</Link>
      </div>
    );
  }

  const requiredDocs =
    accountType === "BUSINESS" ? ["ID", "BUSINESS_LICENSE"] : ["ID"];

  const handleUpload = async (type: string, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setDocuments((prev) => [
        ...prev.filter((d) => d.type !== type),
        { type, file, url: data.url, filename: data.filename },
      ]);
    } catch {
      setError("Failed to upload document");
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        accountType,
        phone,
        address,
        documents: documents.map((d) => ({
          type: d.type,
          url: d.url,
          filename: d.filename,
        })),
      };
      const res = await fetch("/api/seller/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      router.push("/seller/dashboard");
    } catch (e: any) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Become a Seller</h1>

      {/* Steps indicator */}
      <div className="flex gap-2 mb-8">
        {["Account Type", "Details", "Documents", "Review"].map((label, i) => (
          <div key={label} className="flex-1 text-center">
            <div
              className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-medium ${
                i <= step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </div>
            <p className="text-xs mt-1 text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Step 0: Account Type */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Choose Account Type</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setAccountType("PERSONAL")}
              className={`p-6 border-2 rounded-lg text-left ${
                accountType === "PERSONAL"
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <h3 className="font-bold text-lg">Personal</h3>
              <p className="text-sm text-slate-600 mt-1">Up to 5 products</p>
              <p className="text-sm text-slate-500">Requires ID</p>
            </button>
            <button
              onClick={() => setAccountType("BUSINESS")}
              className={`p-6 border-2 rounded-lg text-left ${
                accountType === "BUSINESS"
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <h3 className="font-bold text-lg">Business</h3>
              <p className="text-sm text-slate-600 mt-1">Up to 10 products</p>
              <p className="text-sm text-slate-500">Requires ID + License</p>
            </button>
          </div>
          <button
            onClick={() => setStep(1)}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Contact Details</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Address (optional)</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="px-6 py-2 border border-slate-300 rounded hover:bg-slate-50">
              Back
            </button>
            <button onClick={() => setStep(2)} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Documents */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Upload Documents</h2>
          <p className="text-sm text-slate-500">
            Documents will be reviewed within approximately 3 business days.
            Images are automatically compressed to webp format.
          </p>
          {requiredDocs.map((docType) => (
            <div key={docType} className="border border-slate-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {docType === "ID" ? "Government ID (Passport / National ID)" : "Business License"}
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(docType, file);
                }}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {documents.find((d) => d.type === docType) && (
                <p className="text-sm text-green-600 mt-1">Uploaded</p>
              )}
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-6 py-2 border border-slate-300 rounded hover:bg-slate-50">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={requiredDocs.some((t) => !documents.find((d) => d.type === t))}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Review &amp; Submit</h2>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p><strong>Account Type:</strong> {accountType}</p>
            <p><strong>Phone:</strong> {phone || "—"}</p>
            <p><strong>Address:</strong> {address || "—"}</p>
            <p><strong>Documents:</strong></p>
            <ul className="list-disc pl-6">
              {documents.map((d) => (
                <li key={d.type} className="text-sm">
                  {d.type === "ID" ? "Government ID" : "Business License"} — Uploaded
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            By submitting, you agree to the{" "}
            <a href="/terms/seller" className="text-blue-600 underline">Seller Terms &amp; Conditions</a>.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-6 py-2 border border-slate-300 rounded hover:bg-slate-50">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
