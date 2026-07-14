'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
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
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-content">Sehaty Admin</h1>
          <p className="mt-1 text-sm text-content-muted">
            Sign in to the staff console
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-content">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-content outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-content">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal text-content outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
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
