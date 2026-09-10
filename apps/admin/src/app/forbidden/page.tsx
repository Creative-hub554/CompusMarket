import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access denied</h1>
        <p className="text-sm text-slate-600 mb-6">
          Your account doesn&apos;t have permission to use the admin console.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          &larr; Back to the site
        </Link>
      </div>
    </div>
  );
}