import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      <p className="text-sm tracking-[0.3em] text-indigo-600 font-semibold uppercase mb-3">404</p>
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="text-slate-500 mt-4 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="btn-primary mt-8 no-underline">
        Back to home
      </Link>
    </div>
  );
}
