import Link from "next/link";

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Community Resources</h1>
      <p className="text-gray-600 mb-8">
        Free tools and resources for Cambodian job seekers and professionals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/community/resume"
          className="rounded-xl border p-6 hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">Resume Builder</h2>
          <p className="text-gray-600 text-sm">
            Create professional resumes with our free builder. Choose from
            multiple templates, export to PDF, and get AI-powered suggestions.
          </p>
        </Link>

        <Link
          href="/community/careers"
          className="rounded-xl border p-6 hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">Career Resources</h2>
          <p className="text-gray-600 text-sm">
            Interview tips, career guides, resume examples, and job search
            advice to help you succeed.
          </p>
        </Link>
      </div>
    </div>
  );
}
