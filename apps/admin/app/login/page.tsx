'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ApiError, login, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { access } = await login(email, password);
      setToken(access);
      router.push('/accreditation');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to sign in. Please try again.';
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-brand-dark">
            Sehaty Admin
          </h1>
          <p className="mt-1 text-sm text-brand-dark/60">
            Sign in to the staff console
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-brand-dark">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-brand/20 px-3 py-2 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-brand-dark">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-brand/20 px-3 py-2 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? <Spinner label="Signing in" /> : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
