"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { signInEmailPassword } from "@/actions/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);

        const result = await signInEmailPassword(formData);
        if (!result.ok) throw new Error(result.error || "Login failed");
      } catch (err: any) {
        setError(err.message || "Login failed");
      }
    });
  }

  // ... 나머지 JSX 그대로
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/LEXiOX.png" alt="LEXiOX" className="h-12 w-auto mb-8" />
      <h1 className="text-2xl font-semibold mb-6">Sign In</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 mt-1"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded border px-4 py-2"
        >
          {isPending ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
