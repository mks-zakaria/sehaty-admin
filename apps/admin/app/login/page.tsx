'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '@sehaty/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconAlert } from '@/components/icons';
import { ApiError, login, setToken } from '@/lib/api';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      const { access } = await login(email, password);
      setToken(access);
      router.push('/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to sign in. Please try again.';
      setError(message);
    }
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm animate-fade-up">
        <Card className="p-7">
          <div className="mb-7 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-brand-on shadow-card"
            >
              S
            </span>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-content">
              Sehaty <span className="text-brand">Admin</span>
            </h1>
            <p className="mt-1 text-sm text-content-muted">
              Sign in to the staff console
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-content"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                aria-invalid={errors.email ? 'true' : undefined}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                placeholder="you@sehaty.ma"
                {...register('email', { required: 'Email is required.' })}
                className="field"
              />
              {errors.email && (
                <span
                  id="login-email-error"
                  className="text-xs font-medium text-danger"
                >
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-content"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : undefined}
                aria-describedby={
                  errors.password ? 'login-password-error' : undefined
                }
                {...register('password', { required: 'Password is required.' })}
                className="field"
              />
              {errors.password && (
                <span
                  id="login-password-error"
                  className="text-xs font-medium text-danger"
                >
                  {errors.password.message}
                </span>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
              >
                <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? <Spinner label="Signing in" /> : 'Sign in'}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-content-muted">
          Internal staff console — authorised personnel only.
        </p>
      </div>
    </div>
  );
}
