import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-fade-in">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/champey-mark.svg"
        alt=""
        width={72}
        height={72}
        className="animate-temple-float drop-shadow-[0_0_24px_rgba(255,107,94,0.45)] mb-6"
      />
      <p className="text-sm tracking-[0.3em] text-gold-500 dark:text-gold-400 font-semibold uppercase mb-3">
        404
      </p>
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
        Page not found
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary no-underline px-6">
          Back to home
        </Link>
        <Link
          href="/shop"
          className="btn-ghost no-underline !text-sm !px-6 !py-2"
        >
          Browse the shop
        </Link>
      </div>
    </div>
  );
}
