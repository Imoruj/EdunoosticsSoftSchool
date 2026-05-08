'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink, KeyRound, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Student } from './types';

interface StudentLoginCredentials {
  portalUrl: string;
  allowStudentEmailLogin: boolean;
  allowStudentAdmissionNumberLogin: boolean;
  email: string | null;
  admissionNumber: string | null;
  defaultPassword: string | null;
  defaultPasswordActive: boolean;
  loginInstructions: string;
  isProvisioned: boolean;
}

interface StudentDetail extends Student {
  admissionDate?: string | null;
  userEmail?: string | null;
  userIsActive?: boolean | null;
  userCreatedAt?: string | null;
  loginCredentials?: StudentLoginCredentials | null;
}

interface StudentViewModalProps {
  student: Student;
  onClose: () => void;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function StudentViewModal({ student, onClose }: StudentViewModalProps) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const classLabel = student.classArm
    ? `${student.classArm.class.name} ${student.classArm.armName}`.trim()
    : 'Not assigned';

  // Fetch full student detail (includes admissionDate, user info)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCopiedKey(null);
    fetch(`/api/students/${student.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const s = data.student;
        setDetail({
          ...student,
          admissionDate: s?.admissionDate ?? null,
          userEmail: s?.user?.email ?? null,
          userIsActive: s?.user?.isActive ?? null,
          userCreatedAt: s?.user?.createdAt ?? null,
          loginCredentials: data?.loginCredentials ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setDetail({ ...student });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [student.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleLoginModeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        allowStudentEmailLogin?: boolean;
        allowStudentAdmissionNumberLogin?: boolean;
      }>;
      const detailPayload = customEvent.detail;

      if (!detailPayload) {
        return;
      }

      setDetail((current) => {
        if (!current?.loginCredentials) {
          return current;
        }

        const nextAllowStudentEmailLogin =
          detailPayload.allowStudentEmailLogin ?? current.loginCredentials.allowStudentEmailLogin;
        const nextAllowStudentAdmissionNumberLogin =
          detailPayload.allowStudentAdmissionNumberLogin ?? current.loginCredentials.allowStudentAdmissionNumberLogin;

        return {
          ...current,
          loginCredentials: {
            ...current.loginCredentials,
            allowStudentEmailLogin: nextAllowStudentEmailLogin,
            allowStudentAdmissionNumberLogin: nextAllowStudentAdmissionNumberLogin,
            email: nextAllowStudentEmailLogin ? current.loginCredentials.email : null,
            admissionNumber: nextAllowStudentAdmissionNumberLogin ? current.loginCredentials.admissionNumber : null,
          },
        };
      });
    };

    window.addEventListener('student-login-modes-updated', handleLoginModeUpdate as EventListener);
    return () => {
      window.removeEventListener('student-login-modes-updated', handleLoginModeUpdate as EventListener);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const d = detail ?? student as StudentDetail;
  const credentials = d.loginCredentials ?? null;
  const studentAccountValue = credentials
    ? credentials.email ??
      credentials.admissionNumber ??
      'No login account'
    : d.userEmail ?? 'No login account';

  const copyToClipboard = async (key: string, value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(successMessage);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const buildParentMessage = () => {
    if (!credentials) return '';

    const lines = [`Student: ${studentName}`];

    if (credentials.allowStudentEmailLogin && credentials.email) {
      lines.push(`Student Email: ${credentials.email}`);
    }

    if (credentials.allowStudentAdmissionNumberLogin && credentials.admissionNumber) {
      lines.push(`Admission Number: ${credentials.admissionNumber}`);
    }

    if (credentials.defaultPassword && credentials.defaultPasswordActive) {
      lines.push(`Default Password: ${credentials.defaultPassword}`);
    }

    lines.push(credentials.loginInstructions);

    return lines.join('\n');
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        style={{ animation: 'modalIn 0.18s ease-out' }}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.97) translateY(8px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);   }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{studentName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{student.admissionNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              student.isActive ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {student.isActive ? 'Active' : 'Inactive'}
            </span>
            <a
              href={`/dashboard/students/${student.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Open full page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 animate-pulse">
              <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-2xl" />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl" />
                <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              {/* Left: Avatar card */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center text-center">
                  <div className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-semibold ${
                    student.gender === 'FEMALE' ? 'bg-pink-500' : 'bg-blue-500'
                  }`}>
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={studentName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{student.firstName[0]}{student.lastName[0]}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-3">{studentName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{classLabel}</p>
                </div>

                <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-600 space-y-4">
                  <InfoRow label="Gender" value={student.gender === 'FEMALE' ? 'Female' : 'Male'} />
                  <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
                  <InfoRow
                    label="Student Account"
                    value={studentAccountValue}
                  />
                  <InfoRow label="Admission Date" value={formatDate(d.admissionDate)} />
                </div>
              </div>

              {/* Right: Info cards */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <InfoCard
                  title="Student Information"
                  items={[
                    { label: 'Admission Number', value: student.admissionNumber },
                    { label: 'Class', value: classLabel },
                    { label: 'Other Names', value: student.otherNames || 'N/A' },
                    { label: 'State of Origin', value: student.stateOfOrigin || 'N/A' },
                    { label: 'Address', value: student.address || 'N/A' },
                  ]}
                />
                <InfoCard
                  title="Parent / Guardian"
                  items={[
                    { label: 'Parent Name', value: student.parentName || 'N/A' },
                    { label: 'Phone Number', value: student.parentPhone || 'N/A' },
                    { label: 'Email Address', value: student.parentEmail || 'N/A' },
                    { label: 'Account Status', value: d.userIsActive != null ? (d.userIsActive ? 'Active' : 'Inactive') : 'N/A' },
                    { label: 'Account Created', value: formatDate(d.userCreatedAt) },
                  ]}
                />
                <LoginCredentialsCard
                  className="xl:col-span-2"
                  credentials={credentials}
                  copiedKey={copiedKey}
                  onCopy={copyToClipboard}
                  parentMessage={buildParentMessage()}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5 break-all">{value}</p>
    </div>
  );
}

function InfoCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      <dl className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
            <dt className="text-xs text-gray-500 dark:text-gray-400">{item.label}</dt>
            <dd className="text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-right break-all">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function LoginCredentialsCard({
  className,
  credentials,
  copiedKey,
  onCopy,
  parentMessage,
}: {
  className?: string;
  credentials: StudentLoginCredentials | null;
  copiedKey: string | null;
  onCopy: (key: string, value: string, successMessage: string) => Promise<void>;
  parentMessage: string;
}) {
  const credentialItems = credentials
    ? [
        credentials.allowStudentEmailLogin && credentials.email
          ? {
              key: 'email',
              label: 'Student Email',
              value: credentials.email,
              successMessage: 'Student email copied.',
            }
          : null,
        credentials.allowStudentAdmissionNumberLogin && credentials.admissionNumber
          ? {
              key: 'admission-number',
              label: 'Admission Number',
              value: credentials.admissionNumber,
              successMessage: 'Admission number copied.',
            }
          : null,
        credentials.defaultPassword && credentials.defaultPasswordActive
          ? {
              key: 'default-password',
              label: 'Default Password',
              value: credentials.defaultPassword,
              successMessage: 'Default password copied.',
              icon: <KeyRound className="h-3.5 w-3.5 text-gray-400" />,
            }
          : null,
      ].filter(Boolean) as Array<{
        key: string;
        label: string;
        value: string;
        successMessage: string;
        icon?: ReactNode;
      }>
    : [];

  const activeModes = credentials
    ? [
        credentials.allowStudentEmailLogin ? 'Email login' : null,
        credentials.allowStudentAdmissionNumberLogin ? 'Admission number login' : null,
      ].filter(Boolean)
    : [];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 ${className || ''}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Login Credentials</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Copy the details below and send them to the parent or guardian.
          </p>
          {activeModes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeModes.map((mode) => (
                <span
                  key={mode}
                  className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/40 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
                >
                  {mode}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => onCopy('parent-message', parentMessage, 'Login details copied.')}
            disabled={!credentials || !parentMessage}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copiedKey === 'parent-message' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy details
          </button>
        </div>
      </div>

      {credentials ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {credentialItems.map((item) => (
              <CredentialRow
                key={item.key}
                label={item.label}
                value={item.value}
                isCopied={copiedKey === item.key}
                onCopy={() => onCopy(item.key, item.value, item.successMessage)}
                icon={item.icon}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">Important</p>
            <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-300">{credentials.loginInstructions}</p>
            {credentials.defaultPasswordActive ? (
              <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-300">
                The default password works because this account is still on its temporary password.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-300">
                The student password has already been changed. Use the admin reset-password action before sharing a new temporary password.
              </p>
            )}
            {!credentials.isProvisioned ? (
              <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-300">
                This student account has not been provisioned yet. Ask the admin to generate student login
                accounts before sharing these credentials.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
          Login credentials are not available for this student yet.
        </div>
      )}
    </div>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
  isCopied,
  icon,
}: {
  label: string;
  value: string;
  onCopy: () => Promise<void>;
  isCopied: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
          <div className="mt-2 flex items-start gap-2">
            {icon ? <span className="mt-0.5">{icon}</span> : null}
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 break-all">{value}</p>
          </div>
        </div>
        <CopyButton isCopied={isCopied} onClick={onCopy} />
      </div>
    </div>
  );
}

function CopyButton({
  isCopied,
  onClick,
}: {
  isCopied: boolean;
  onClick: () => Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
      title={isCopied ? 'Copied' : 'Copy'}
    >
      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
