"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-12">
      <SignIn />
    </div>
  );
}
