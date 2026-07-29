'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConsoleShell } from '@/components/ConsoleShell';
import { DoctorFinder } from '@/components/DoctorFinder';
import { DoctorProfilePanel } from '@/components/DoctorProfilePanel';
import { PageHeader, StatusPill } from '@/components/ui';
import { getToken, type DoctorMatch } from '@/lib/api';

/**
 * The whole visit on one screen, in the order it actually happens.
 *
 * Find them → fill in what they tell you → pin the door → hand over the login.
 * Those were four places before, and the two that were missing entirely are the
 * two that decide whether the sale is worth anything: an exact pin, and a
 * password the doctor can sign in with.
 *
 * Search leads because most doctors are already here from the directory import.
 * The alternative — a blank create form — quietly produces a second page for a
 * doctor who already has one, splitting their reviews and orphaning the QR code
 * on their wall.
 */

export default function OnboardingPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorMatch | null>(null);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  return (
    <ConsoleShell>
      <PageHeader
        title="Onboard a doctor"
        description="Everything one visit needs, in the order it happens."
      />

      {!doctor && <DoctorFinder onPick={setDoctor} />}

      {doctor && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
            <div>
              <h2 className="font-semibold text-content">{doctor.full_name}</h2>
              <p className="text-xs text-muted">
                {doctor.specialty ?? '—'} · {doctor.district ?? doctor.city ?? '—'} ·{' '}
                <span dir="ltr">/dr/{doctor.slug}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill tone={doctor.is_unclaimed ? 'neutral' : 'success'}>
                {doctor.is_unclaimed ? 'To onboard' : 'Onboarded'}
              </StatusPill>
              <button
                type="button"
                onClick={() => setDoctor(null)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-content"
              >
                Someone else
              </button>
            </div>
          </div>

          {/* Contact, hours, insurance, tariff, presentation, pin, login. Saving
              the hours also fills the bookable agenda — they are separate tables
              that look like one field to whoever is filling this in. */}
          <DoctorProfilePanel doctorId={doctor.doctor_id} />
        </div>
      )}
    </ConsoleShell>
  );
}
