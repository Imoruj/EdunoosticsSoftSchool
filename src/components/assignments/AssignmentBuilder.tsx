"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAssignments } from "@/lib/db/hooks";
import type { Assignment, AssignmentAttachment } from "@/lib/db/types";
import { ArrowLeft, Save, Paperclip, X, Calendar, FileText } from "lucide-react";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { TargetAudienceSelector } from "@/components/shared/TargetAudienceSelector";
import { showAppAlert } from "@/lib/appMessageBox";

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface AssignmentBuilderProps {
  assignment?: Assignment;
  userId: string;
}

export function AssignmentBuilder({ assignment, userId }: AssignmentBuilderProps) {
  const router = useRouter();
  const { saveAssignment } = useAssignments();

  const [title, setTitle] = useState(assignment?.title ?? "");
  const [description, setDescription] = useState(assignment?.description ?? "");
  const [instructions, setInstructions] = useState(assignment?.instructions ?? "");

  // Target Audience state
  const [subjectId, setSubjectId] = useState(assignment?.subjectId ?? "");
  const [classArmIds, setClassArmIds] = useState<string[]>(assignment?.classArmIds ?? []);
  const [assignedTo, setAssignedTo] = useState<string[]>(assignment?.assignedTo ?? []);

  // Due date formatting for input type="datetime-local"
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7); // Default 1 week out
  const [dueDateString, setDueDateString] = useState(
    assignment?.dueDate
      ? new Date(assignment.dueDate).toISOString().slice(0, 16)
      : defaultDate.toISOString().slice(0, 16)
  );

  const [maxScore, setMaxScore] = useState(assignment?.maxScore ?? 100);
  const [allowLateSubmission, setAllowLateSubmission] = useState(assignment?.allowLateSubmission ?? false);
  const [lateSubmissionPenalty, setLateSubmissionPenalty] = useState(assignment?.lateSubmissionPenalty ?? 0);
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>(assignment?.attachments ?? []);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'assignment_attachment');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => null) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Upload failed');
      }
      const { url } = data;

      setAttachments(prev => [...prev, {
        id: uid("att"),
        fileName: file.name,
        fileUrl: url,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File upload failed. Please try again.';
      await showAppAlert(errorMessage, { variant: "error" });
      console.error(error);
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const save = async (publish: boolean) => {
    if (!title.trim() || !instructions.trim()) {
      await showAppAlert("Title and Instructions are required.", { title: "Missing Information", variant: "warning" });
      return;
    }

    if (!subjectId || classArmIds.length === 0) {
      await showAppAlert("Please select a subject and at least one class arm.", { title: "Missing Information", variant: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload: Assignment = {
        id: assignment?.id ?? uid("assign"),
        title: title.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim(),
        subjectId,
        classArmIds,
        lessonId: assignment?.lessonId,
        createdById: assignment?.createdById ?? userId,
        createdAt: assignment?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        // Parse datetime-local correctly
        dueDate: new Date(dueDateString).getTime(),
        maxScore: Math.max(1, Number(maxScore) || 100),
        isPublished: publish,
        publishedAt: publish ? Date.now() : assignment?.publishedAt,
        assignedTo,
        attachments,
        allowLateSubmission,
        lateSubmissionPenalty: allowLateSubmission ? Math.max(0, Number(lateSubmissionPenalty) || 0) : undefined,
      };

      await saveAssignment(payload);
      router.push("/dashboard/assignments");
    } catch (error) {
      console.error("Assignment save failed:", error);
      await showAppAlert("Failed to save assignment. Check the console.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">{assignment ? "Edit Assignment" : "New Assignment"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus />
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Main Editor Column */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Assignment Details</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Title <span className="text-red-500">*</span></label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Chapter 4 Reading Reflection"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description (optional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short summary visible in lists..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions & Guidelines <span className="text-red-500">*</span></label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={10}
                  placeholder="Describe what the students need to do..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all resize-y"
                />
              </div>

              {/* Attachments Section */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">Resource Attachments</label>

                <div className="space-y-3">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-gray-900 truncate">{att.fileName}</p>
                          <p className="text-xs text-gray-500">{(att.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Paperclip className="w-4 h-4" />
                      {uploading ? "Uploading..." : "Attach File (PDF, DOCX, Images)"}
                    </label>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-5">Target Audience</h2>
            <TargetAudienceSelector
              subjectId={subjectId}
              classArmIds={classArmIds}
              assignedTo={assignedTo}
              onSubjectChange={setSubjectId}
              onClassArmsChange={setClassArmIds}
              onAssignedToChange={setAssignedTo}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-5">Settings</h2>

            <div className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 text-gray-400" /> Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={dueDateString}
                  onChange={(e) => setDueDateString(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Score / Points Possible</label>
                <input
                  type="number"
                  min="1"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value) || 100)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={allowLateSubmission}
                      onChange={(e) => setAllowLateSubmission(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">Allow Late Submissions</span>
                    <span className="text-xs text-gray-500">Students can submit after the due date.</span>
                  </div>
                </label>
              </div>

              {allowLateSubmission && (
                <div className="pl-7 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Late Penalty (%) (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={lateSubmissionPenalty}
                    onChange={(e) => setLateSubmissionPenalty(Number(e.target.value) || 0)}
                    placeholder="e.g. 10 for 10% deduction"
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Deducted automatically from max score.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Did you know?</h3>
            <p className="text-xs text-blue-800 leading-relaxed">
              When published, this assignment will sync to students' devices. They can complete it offline and it will automatically sync back when their connection is restored.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
