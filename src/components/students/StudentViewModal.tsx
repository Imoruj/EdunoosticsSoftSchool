'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import type { Student } from './types';

interface StudentDetail extends Student {
  admissionDate?: string | null;
  userEmail?: string | null;
  userIsActive?: boolean | null;
  userCreatedAt?: string | null;
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
  const backdropRef = useRef<HTMLDivElement>(null);

  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const classLabel = student.classArm
    ? `${student.classArm.class.name} ${student.classArm.armName}`.trim()
    : 'Not assigned';

  // Fetch full student detail (includes admissionDate, user info)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/students/${student.id}`)
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

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const d = detail ?? student as StudentDetail;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{ animation: 'modalIn 0.18s ease-out' }}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.97) translateY(8px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);   }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{studentName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{student.admissionNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              student.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {student.isActive ? 'Active' : 'Inactive'}
            </span>
            <a
              href={`/dashboard/students/${student.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Open full page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 animate-pulse">
              <div className="h-64 bg-gray-100 rounded-2xl" />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="h-48 bg-gray-100 rounded-2xl" />
                <div className="h-48 bg-gray-100 rounded-2xl" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
              {/* Left: Avatar card */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
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
                  <h3 className="text-base font-semibold text-gray-900 mt-3">{studentName}</h3>
                  <p className="text-sm text-gray-500">{classLabel}</p>
                </div>

                <div className="mt-5 pt-5 border-t border-gray-200 space-y-4">
                  <InfoRow label="Gender" value={student.gender === 'FEMALE' ? 'Female' : 'Male'} />
                  <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
                  <InfoRow label="Student Account" value={d.userEmail ?? 'No login account'} />
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
      <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5 break-all">{value}</p>
    </div>
  );
}

function InfoCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      <dl className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
            <dt className="text-xs text-gray-500">{item.label}</dt>
            <dd className="text-xs font-medium text-gray-900 sm:text-right break-all">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
