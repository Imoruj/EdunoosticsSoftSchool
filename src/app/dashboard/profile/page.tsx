"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface StudentProfile {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    classArm?: {
        armName: string;
        class: {
            name: string;
        };
    };
    photoUrl?: string;
    gender: string;
    address?: string;
    dateOfBirth?: string;
}

function InfoRow({ label, value, capitalize }: { label: string, value: React.ReactNode, capitalize?: boolean }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-50 last:border-0 gap-1">
            <span className="text-slate-500 text-[13px]">{label}</span>
            <span className={`text-slate-900 font-medium text-sm ${capitalize ? 'capitalize' : ''} sm:text-right`}>
                {value}
            </span>
        </div>
    );
}

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

    const loginType = (session?.user as any)?.loginType;
    const isStudent = loginType === "student";
    const isParent = loginType === "parent";
    const isAdmin = loginType === "admin"; // Covers both Admin and Teacher roles based on auth.ts

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                let endpoint = "";
                if (isStudent) endpoint = "/api/students/me";
                else if (isParent) endpoint = "/api/parents/me";
                else if (isAdmin) endpoint = "/api/users/me";

                if (!endpoint) return;

                const response = await fetch(endpoint);
                if (response.ok) {
                    const data = await response.json();
                    setProfile(data);
                    // Initialize form data
                    if (isStudent) {
                        setFormData({
                            email: data.user?.email || "",
                            address: data.address || "",
                            otherNames: data.otherNames || "",
                            photoUrl: data.photoUrl || "",
                        });
                    } else if (isParent) {
                        setFormData({
                            email: data.user?.email || "",
                            phone: data.user?.phone || "",
                            occupation: data.occupation || "",
                            avatarUrl: data.user?.avatarUrl || "",
                        });
                    } else if (isAdmin) {
                        setFormData({
                            firstName: data.firstName || "",
                            lastName: data.lastName || "",
                            phone: data.phone || "",
                            avatarUrl: data.avatarUrl || "",
                            signatureUrl: data.signatureUrl || "",
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (session?.user) {
            fetchProfile();
        }
    }, [session, isStudent, isParent, isAdmin]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const persistAdminMedia = async (updates: { avatarUrl?: string; signatureUrl?: string }) => {
        const response = await fetch("/api/users/me", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to save media");
        }

        const result = await response.json();
        const updatedUser = result?.user;
        if (!updatedUser) return;

        setProfile((prev: any) => ({ ...prev, ...updatedUser }));
        setFormData((prev: any) => ({
            ...prev,
            avatarUrl: updatedUser.avatarUrl || prev.avatarUrl || "",
            signatureUrl: updatedUser.signatureUrl || prev.signatureUrl || "",
        }));

        await update({
            ...session,
            user: {
                ...session?.user,
                name: `${updatedUser.firstName} ${updatedUser.lastName}`,
                avatarUrl: updatedUser.avatarUrl
            }
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", isStudent ? "student_photo" : "avatar");
        if (isStudent) {
            fd.append("studentId", profile.id);
        }

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: fd
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Upload failed");
            }

            const uploadData = await res.json();
            setFormData((prev: any) => ({
                ...prev,
                [isStudent ? "photoUrl" : "avatarUrl"]: uploadData.url
            }));

            if (isAdmin) {
                await persistAdminMedia({ avatarUrl: uploadData.url });
                setMessage({ type: "success", text: "Profile photo updated" });
            } else {
                await update({
                    ...session,
                    user: {
                        ...session?.user,
                        avatarUrl: uploadData.url
                    }
                });
            }
        } catch (err) {
            console.error("Upload failed", err);
            setMessage({ type: "error", text: "Failed to upload profile photo" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            let endpoint = "";
            if (isStudent) endpoint = "/api/students/me";
            else if (isParent) endpoint = "/api/parents/me";
            else if (isAdmin) endpoint = "/api/users/me";

            const response = await fetch(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const updatedData = await response.json();
                if (updatedData.user) {
                    setProfile(updatedData.user);
                    await update({
                        ...session,
                        user: {
                            ...session?.user,
                            name: `${updatedData.user.firstName} ${updatedData.user.lastName}`,
                            avatarUrl: updatedData.user.avatarUrl
                        }
                    });
                }
                else if (updatedData.firstName) {
                    setProfile(updatedData); // For user model return
                    await update({
                        ...session,
                        user: {
                            ...session?.user,
                            name: `${updatedData.firstName} ${updatedData.lastName}`,
                            avatarUrl: updatedData.avatarUrl
                        }
                    });
                }

                setIsEditing(false);
                setMessage({ type: "success", text: "Profile updated successfully!" });
                setTimeout(() => setMessage(null), 5000);
            } else {
                const error = await response.json();
                setMessage({ type: "error", text: error.error || "Failed to update profile" });
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: "error", text: "An unexpected error occurred" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-white rounded-[1.5rem] p-8 text-center shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Profile Not Found</h3>
                <p className="text-slate-500 mt-1">We couldn't load your profile data. Please try logging in again.</p>
            </div>
        );
    }

    const displayName = isStudent
        ? `${profile.firstName} ${profile.lastName}`
        : isAdmin ? `${profile.firstName} ${profile.lastName}`
            : `${profile.user.firstName} ${profile.user.lastName}`;

    const displayId = isStudent ? profile.admissionNumber : isAdmin ? profile.email : profile.user.phone;
    const email = isStudent ? profile.user?.email : isAdmin ? profile.email : profile.user.email;

    // Calculate current images (handling edit preview vs saved state)
    const sessionAvatarUrl = (session?.user as any)?.avatarUrl || session?.user?.image;
    const currentAvatarUrl = isEditing
        ? (isStudent ? formData.photoUrl : formData.avatarUrl)
        : ((isAdmin ? profile.avatarUrl : (isStudent ? profile.photoUrl : profile.user?.avatarUrl)) || sessionAvatarUrl);

    const currentSignatureUrl = (isEditing ? formData.signatureUrl : profile.signatureUrl) || formData.signatureUrl;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
                    <p className="text-slate-500 mt-2 text-sm capitalize">{loginType === 'admin' ? 'Staff Portal' : `${loginType} Portal`}</p>
                </div>
                {isAdmin && !isEditing && (
                    <button
                        onClick={() => {
                            setIsEditing(true);
                            setFormData((prev: any) => ({ ...prev, currentPassword: "", newPassword: "" }));
                        }}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Profile
                    </button>
                )}
                {isAdmin && isEditing && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setFormData((prev: any) => ({ ...prev, currentPassword: "", newPassword: "" }));
                            }}
                            className="py-2.5 px-5 text-sm font-medium text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 px-6 text-sm font-medium flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            Save Changes
                        </button>
                    </div>
                )}
            </div>

            {/* Message Bar */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                    {message.type === "success" ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Profile Summary */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80 flex flex-col items-center text-center relative overflow-hidden">
                        {/* Soft Gradient Header Background */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary-50/80 to-transparent"></div>

                        <div className="w-32 h-32 bg-white rounded-full p-2 shadow-sm ring-1 ring-slate-100 relative group z-10 mt-6 mb-5">
                            {currentAvatarUrl ? (
                                <img
                                    src={currentAvatarUrl}
                                    className="w-full h-full object-cover rounded-full"
                                    alt="Profile"
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center text-slate-400 font-bold text-4xl">
                                    {displayName[0]}
                                </div>
                            )}

                            {isEditing && isAdmin && (
                                <label className="absolute inset-2 bg-slate-900/40 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </label>
                            )}
                        </div>

                        <div className="z-10 w-full">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{displayName}</h2>
                            <p className="text-slate-500 text-sm mt-1">{displayId}</p>

                            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap justify-center gap-2 w-full">
                                {isStudent ? (
                                    <span className="px-3 py-1 bg-blue-50/50 text-blue-700 text-xs rounded-lg font-medium border border-blue-100/50">Student</span>
                                ) : isAdmin ? (
                                    profile.roles.map((role: string) => (
                                        <span key={role} className="px-3 py-1 bg-slate-50 text-slate-600 text-xs rounded-lg font-medium border border-slate-200/60">
                                            {role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                        </span>
                                    ))
                                ) : (
                                    <span className="px-3 py-1 bg-purple-50/50 text-purple-700 text-xs rounded-lg font-medium border border-purple-100/50">Parent</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Digital Signature Card */}
                    {isAdmin && (
                        <div className="bg-white rounded-[1.5rem] p-6 shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80">
                            <div className="flex flex-col mb-4">
                                <h3 className="text-sm font-semibold text-slate-900">Digital Signature</h3>
                                <p className="text-[12px] text-slate-500 mt-1 pb-4 border-b border-slate-50">Authorized seal for issuing reports</p>
                            </div>

                            <div className="w-full h-28 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center relative group overflow-hidden transition-colors hover:border-primary-300 hover:bg-primary-50/30">
                                {currentSignatureUrl ? (
                                    <img
                                        src={currentSignatureUrl}
                                        alt="Signature"
                                        className="w-full h-full object-contain p-3"
                                    />
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        <span className="text-[11px] font-medium text-slate-400">No signature found</span>
                                    </>
                                )}

                                {isEditing && (
                                    <label className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/png,image/jpeg"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                const fd = new FormData();
                                                fd.append("file", file);
                                                fd.append("type", "signature");

                                                try {
                                                    const res = await fetch("/api/upload", { method: "POST", body: fd });

                                                    if (!res.ok) {
                                                        const errorData = await res.json().catch(() => ({}));
                                                        throw new Error(errorData.error || "Signature upload failed");
                                                    }

                                                    const data = await res.json();
                                                    setFormData((prev: any) => ({ ...prev, signatureUrl: data.url }));
                                                    await persistAdminMedia({ signatureUrl: data.url });
                                                    setMessage({ type: "success", text: "Signature updated" });
                                                } catch (err) {
                                                    console.error("Signature upload failed", err);
                                                    setMessage({ type: "error", text: "Failed to upload signature" });
                                                }
                                            }}
                                        />
                                        <svg className="w-5 h-5 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <span className="text-white text-xs font-semibold tracking-wide">Change Signature</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Details/Forms */}
                <div className="lg:col-span-8 space-y-6">
                    {!isEditing ? (
                        <>
                            <div className="bg-white rounded-[1.5rem] p-6 lg:p-8 shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80">
                                <h3 className="text-[15px] font-bold text-slate-900 mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Personal Details
                                </h3>
                                <div className="space-y-1">
                                    <InfoRow label="Full Name" value={displayName} />
                                    <InfoRow label="Email Address" value={email || 'N/A'} />
                                    <InfoRow label="Phone Number" value={isAdmin ? (profile.phone || 'N/A') : (profile.user?.phone || profile.parentPhone || 'N/A')} />

                                    {isStudent && (
                                        <>
                                            <InfoRow label="Gender" value={profile.gender} capitalize />
                                            <InfoRow label="Address" value={profile.address || 'N/A'} />
                                        </>
                                    )}
                                    {isParent && profile.occupation && (
                                        <InfoRow label="Occupation" value={profile.occupation} />
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-[1.5rem] p-6 lg:p-8 shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80">
                                <h3 className="text-[15px] font-bold text-slate-900 mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {isStudent ? 'Academic Info' : 'Account Info'}
                                </h3>

                                <div className="space-y-1">
                                    {isStudent ? (
                                        <>
                                            <InfoRow label="Class" value={profile.classArm ? `${profile.classArm.class.name} (${profile.classArm.armName})` : 'Not Assigned'} />
                                            <InfoRow label="Admission No" value={profile.admissionNumber} />
                                        </>
                                    ) : (
                                        <>
                                            {isParent && (
                                                <>
                                                    <InfoRow label="Relationship" value={profile.relationship} capitalize />
                                                    <InfoRow label="Wards Linked" value={profile.students?.length?.toString() || "0"} />
                                                </>
                                            )}
                                        </>
                                    )}
                                    <InfoRow label="School" value={isStudent ? profile.user?.school?.name || 'Not assigned' : isAdmin ? profile.school?.name || 'Not assigned' : profile.user?.school?.name || 'Not assigned'} />
                                </div>
                            </div>

                            {/* Additional Section for Parents: Linked Wards */}
                            {isParent && profile.students?.length > 0 && (
                                <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80">
                                    <h3 className="text-[15px] font-bold text-slate-900 mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        Linked Wards
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {profile.students.map((ward: any) => (
                                            <Link key={ward.id} href={`/dashboard/wards/${ward.id}`} className="bg-white rounded-[1.25rem] border border-slate-100 p-4 hover:border-primary-300 transition-all hover:shadow-[0px_4px_16px_-8px_rgba(0,0,0,0.06)] flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                        {ward.firstName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{ward.firstName} {ward.lastName}</p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{ward.classArm ? `${ward.classArm.class.name} (${ward.classArm.armName})` : 'No Class'}</p>
                                                    </div>
                                                </div>
                                                <svg className="w-4 h-4 text-slate-300 group-hover:text-primary-400 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-white rounded-[1.5rem] p-6 lg:p-8 shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80">
                                <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Details
                                </h3>

                                <div className="grid sm:grid-cols-2 gap-6">
                                    {isAdmin && (
                                        <>
                                            <div>
                                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">First Name</label>
                                                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Last Name</label>
                                                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Phone Number</label>
                                                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm" />
                                            </div>
                                        </>
                                    )}

                                    {!isAdmin && (
                                        <div>
                                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Email Address</label>
                                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-100/50 border border-slate-200/50 rounded-xl outline-none cursor-not-allowed text-slate-400 text-sm" disabled />
                                        </div>
                                    )}

                                    {isParent && (
                                        <>
                                            <div>
                                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Phone Number</label>
                                                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Occupation</label>
                                                <input type="text" name="occupation" value={formData.occupation} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm" />
                                            </div>
                                        </>
                                    )}
                                    {isStudent && (
                                        <>
                                            <div>
                                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Other Names</label>
                                                <input type="text" name="otherNames" value={formData.otherNames} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-100/50 border border-slate-200/50 rounded-xl outline-none cursor-not-allowed text-slate-400 text-sm" disabled />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Home Address</label>
                                                <textarea name="address" rows={3} value={formData.address} onChange={handleInputChange} disabled className="w-full px-4 py-2 bg-slate-100/50 border border-slate-200/50 rounded-xl outline-none cursor-not-allowed text-slate-400 resize-none text-sm" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="bg-white rounded-[1.5rem] p-6 lg:p-8 shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80">
                                    <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Change Password
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Current Password</label>
                                            <input type="password" name="currentPassword" value={formData.currentPassword || ""} onChange={handleInputChange} placeholder="Enter current password" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">New Password</label>
                                            <input type="password" name="newPassword" value={formData.newPassword || ""} onChange={handleInputChange} placeholder="Enter new password" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-slate-900 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isAdmin && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-[1.5rem] p-6">
                                    <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Quick Note
                                    </h3>
                                    <p className="text-[13px] text-blue-700/80 leading-relaxed font-medium">
                                        Updating your email or phone number will change how you login and receive communications from the school. Please ensure your contact details are accurate.
                                    </p>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
