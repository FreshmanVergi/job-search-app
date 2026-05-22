"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import JobCard from "@/components/JobCard";
import AIAgent from "@/components/AIAgent";
import { apiClient } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import {
  MapPin, Clock, Users, Briefcase, Building2,
  BookmarkPlus, Share2, CheckCircle2, Loader2
} from "lucide-react";

const WORK_PREF_LABELS = { "on-site": "İş Yerinde", remote: "Uzaktan", hybrid: "Hibrit" };
const WORK_TYPE_LABELS = { "full-time": "Tam Zamanlı", "part-time": "Yarı Zamanlı", contract: "Sözleşmeli", internship: "Staj" };

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [job, setJob] = useState(null);
  const [related, setRelated] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    const init = async () => {
      const [{ data: { user } }, result] = await Promise.all([
        supabase.auth.getUser(),
        apiClient.getJob(id),
      ]);
      setUser(user);
      setJob(result.data);
      setRelated(result.related || []);
      setLoading(false);
    };
    init();
  }, [id]);

  const handleApply = async () => {
    if (!user) {
      router.push("/login?redirect=/jobs/" + id);
      return;
    }
    setApplying(true);
    setApplyError("");
    try {
      const result = await apiClient.applyToJob(id, "", supabase);
      if (result.error) {
        setApplyError(result.error === "Already applied to this job"
          ? "Bu ilana zaten başvurdunuz."
          : result.error);
      } else {
        setApplied(true);
      }
    } catch {
      setApplyError("Başvuru sırasında hata oluştu.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">İlan bulunamadı.</p>
          <Link href="/search" className="btn-primary mt-4 inline-block">İlanlara Geri Dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* ─── Main Content ─── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold text-gray-500 flex-shrink-0">
                    {job.companies?.logo_url ? (
                      <img src={job.companies.logo_url} alt={job.companies.name} className="w-12 h-12 object-contain" />
                    ) : (
                      (job.companies?.name || "?")[0]
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                    <p className="text-gray-600 font-medium">{job.companies?.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.city}{job.district ? ` (${job.district})` : ""} •{" "}
                      {WORK_PREF_LABELS[job.work_preference] || job.work_preference}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Bugün güncellendi
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Çalışma Şekli", value: WORK_TYPE_LABELS[job.work_type] || job.work_type },
                  { label: "Pozisyon Seviyesi", value: job.position_level || "—" },
                  { label: "Departman", value: job.department || "—" },
                  { label: "Başvuru Sayısı", value: `${job.application_count} başvuru` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{value}</p>
                  </div>
                ))}
              </div>

              {/* Apply buttons */}
              <div className="flex items-center gap-3 mb-6">
                {applied ? (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    Başvurunuz alındı!
                  </div>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="btn-primary flex items-center gap-2"
                  >
                    {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
                    Başvur
                  </button>
                )}
                <button className="btn-secondary flex items-center gap-2">
                  <BookmarkPlus className="w-4 h-4" /> Kaydet
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Paylaş
                </button>
              </div>
              {applyError && <p className="text-red-500 text-sm mb-4">{applyError}</p>}

              {/* Description */}
              <div className="prose prose-sm max-w-none">
                <h2 className="text-base font-semibold text-gray-900 mb-2">{job.title}</h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>

                {job.requirements && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">Gereksinimler</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
                  </>
                )}
              </div>

              {/* Candidate criteria */}
              {(job.min_experience_years || job.education_level || job.military_status) && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Aday Kriterleri</h3>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {job.min_experience_years > 0 && (
                      <p>Tecrübe: En az {job.min_experience_years} yıl tecrübeli</p>
                    )}
                    {job.education_level && <p>Eğitim Seviyesi: {job.education_level}</p>}
                    {job.military_status && <p>Askerlik Durumu: {job.military_status}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Sidebar: Related Jobs ─── */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">İlgini Çekebilecek İlanlar</h2>
              {related.length > 0 ? (
                <div className="space-y-3">
                  {related.map((r) => (
                    <Link key={r.id} href={`/jobs/${r.id}`}>
                      <div className="p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors cursor-pointer">
                        <p className="font-medium text-sm text-gray-900 line-clamp-1">{r.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.companies?.name}</p>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {r.city}
                          </span>
                          <span className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                            {WORK_PREF_LABELS[r.work_preference] || r.work_preference}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">İlgili ilan bulunamadı.</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <AIAgent />
    </div>
  );
}
