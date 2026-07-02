import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center">
      <h1 className="text-5xl font-bold mb-4">Theo Platform</h1>
      <p className="text-xl text-gray-600 mb-8">
        Smart Commerce & Community Platform for Cambodia
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <div className="rounded-xl border p-8 text-left">
          <h2 className="text-2xl font-semibold mb-3">Shop Electronics</h2>
          <p className="text-gray-600 mb-4">
            Affordable second-hand electronics with warranty. Gaming PCs,
            laptops, components, and accessories.
          </p>
          <Link
            href="/shop"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700"
          >
            Browse Shop
          </Link>
        </div>

        <div className="rounded-xl border p-8 text-left">
          <h2 className="text-2xl font-semibold mb-3">Community Resources</h2>
          <p className="text-gray-600 mb-4">
            Free resume builder, career guides, interview prep, and AI-powered
            writing assistance.
          </p>
          <Link
            href="/community"
            className="inline-block rounded-lg bg-green-600 px-6 py-2 text-white font-medium hover:bg-green-700"
          >
            Explore Resources
          </Link>
        </div>
      </div>
    </div>
  );
}
