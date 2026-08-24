import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Terms & Conditions",
  description: "Terms and conditions for sellers on Champey.",
  alternates: { canonical: "/terms/seller" },
};

export default function SellerTermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in-up">
      <div className="text-center mb-8">
        <p className="text-2xl font-bold tracking-[0.12em] text-slate-900 mb-1">
          Champey
        </p>
        <p className="text-[10px] tracking-[0.3em] text-amber-500 uppercase">
          bytheo
        </p>
      </div>
      <h1 className="text-3xl font-bold mb-6">Seller Terms &amp; Conditions</h1>
      <div className="space-y-4 text-gray-700">
        <p>
          By applying to become a seller on our platform, you agree to the
          following terms.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">
          1. Account Types
        </h2>
        <p>
          <strong>Personal Account:</strong> Up to 5 products total (lifetime
          limit).
          <br />
          <strong>Business Account:</strong> Up to 10 products total (lifetime
          limit).
        </p>
        <p>
          Once a product slot is used, it cannot be freed up. Products can only
          be disabled, not deleted.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">
          2. Verification
        </h2>
        <p>All sellers must submit valid identification documents:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Personal account: Government-issued ID (passport, national ID card)
          </li>
          <li>
            Business account: Government-issued ID + Business license
            certificate
          </li>
        </ul>
        <p>
          Documents are reviewed within approximately 3 business days. You will
          be notified once your application is approved or rejected.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">
          3. Product Listings
        </h2>
        <p>
          All products must be accurately described with clear photos (up to 5
          per product). Misleading listings may result in account suspension.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">
          4. Customer Communication
        </h2>
        <p>
          Sellers must respond to buyer inquiries within 48 hours via the
          on-site chat system. Failure to do so may affect your seller status.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">
          5. Prohibited Items
        </h2>
        <p>
          Counterfeit goods, illegal items, and products that violate
          intellectual property rights are strictly prohibited.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">6. Fees</h2>
        <p>
          Current commission rates and listing fees will be communicated
          separately. The platform reserves the right to modify fee structures
          with 30 days notice.
        </p>
        <h2 className="text-xl font-semibold text-gray-900 mt-6">
          7. Account Suspension
        </h2>
        <p>
          Violation of these terms may result in temporary or permanent account
          suspension without prior notice.
        </p>
      </div>
    </div>
  );
}
