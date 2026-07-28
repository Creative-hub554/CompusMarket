"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-khmer-red mb-4">Something went wrong</h1>
      <p className="text-gray-600 mb-6">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="bg-khmer-blue text-white px-6 py-2 rounded hover:bg-blue-800 transition"
      >
        Try again
      </button>
    </div>
  );
}
