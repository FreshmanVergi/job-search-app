"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { apiClient } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { Plus, Edit2, Trash2, Loader2, Save, X } from "lucide-react";

const WORK_TYPES = ["full-time", "part-time", "contract", "internship"];
const WORK_PREFS = ["on-site", "remote", "hybrid"];
const LEVELS = ["junior", "mid", "senior", "expert", "manager", "director"];

const EMPTY_FORM = {
  title: "", description: "", requirements: "",
  department: "", position_level: "mid",
  work_type: "full-time", work_preference: "on-site",
  city: "", district: "", country: "Türkiye",
  company_id: "", education_level: "", military_status: "",
  min_experience_years: 0,
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || (user.user_metadata?.role !== "admin" && user.user_metadata?.role !== "company")) {
        router.push("/login");
        return;
      }
      setUser(user);

      const [jobsRes, companiesRes] = await Promise.all([
        apiClient.getJobs({ limit: 50 }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/companies`).then((r) => r.json()),
      ]);
      setJobs(jobsRes.data || []);
      setCompanies(companiesRes.data || []);
      setLoading(false);
    };
    init();
  }, []);

  const handleSave = async () => {
    setError("");
    if (!form.title || !form.description || !form.company_id || !form.city) {
      setError("Zorunlu alanları doldurun: başlık, açıklama, şirket, şehir");
      return;
    }
    setSaving(true);
    try {
      const result = editingId
        ? await apiClient.updateJob(editingId, form, supabase)
        : await apiClient.createJob(form, supabase);

      if (result.error) throw new Error(result.error);

      // Refresh
      const jobsRes = await apiClient.getJobs({ limit: 50 });
      setJobs(jobsRes.data || []);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (job) => {
    setForm({
      title: job.title || "",
      description: job.description || "",
      requirements: job.requirements || "",
      department: job.department || "",
      position_level: job.position_level || "mid",
      work_type: job.work_type || "full-time",
      work_preference: job.work_preference || "on-site",
      city: job.city || "",
      district: job.district || "",
      country: job.country || "Türkiye",
      company_id: job.company_id || "",
      education_level: job.education_level || "",
      military_status: job.military_status || "",
      min_experience_years: job.min_experience_years || 0,
    });
    setEditingId(job.id);
    setShowForm(true);
  };

  const field = (key, label, type = "text", options = null) => (
    <div key={key}>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {options ? (
        <select
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="input-base mt-1"
        >
          {key === "company_id" && <option value="">Şirket Seçin</option>}
          {options.map((o) =>
            typeof o === "string"
              ? <option key={o} value={o}>{o}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>
          )}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          rows={4}
          className="input-base mt-1 resize-none"
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? parseInt(e.target.value) : e.target.value }))}
          className="input-base mt-1"
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Paneli</h1>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Yeni İlan
          </button>
        </div>

        {/* Job form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                {editingId ? "İlanı Düzenle" : "Yeni İlan Ekle"}
              </h2>
              <button onClick={() => { setShowForm(false); setError(""); }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("title", "İlan Başlığı *")}
              {field("company_id", "Şirket *", "select",
                companies.map((c) => ({ value: c.id, label: c.name }))
              )}
              {field("work_type", "Çalışma Şekli", "select", WORK_TYPES)}
              {field("work_preference", "Çalışma Tercihi", "select", WORK_PREFS)}
              {field("position_level", "Pozisyon Seviyesi", "select", LEVELS)}
              {field("department", "Departman")}
              {field("city", "Şehir *")}
              {field("district", "İlçe")}
              {field("country", "Ülke")}
              {field("min_experience_years", "Min. Tecrübe (yıl)", "number")}
              {field("education_level", "Eğitim Seviyesi")}
              {field("military_status", "Askerlik Durumu")}
            </div>

            <div className="mt-4 space-y-4">
              {field("description", "İlan Açıklaması *", "textarea")}
              {field("requirements", "Gereksinimler", "textarea")}
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Kaydet
              </button>
              <button onClick={() => { setShowForm(false); setError(""); }} className="btn-secondary">
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Jobs table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">İş İlanları ({jobs.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  {["İlan", "Şirket", "Şehir", "Çalışma", "Başvuru", "İşlemler"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{job.title}</td>
                    <td className="px-4 py-3 text-gray-600">{job.companies?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{job.city}</td>
                    <td className="px-4 py-3">
                      <span className="bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full">
                        {job.work_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{job.application_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(job)} className="text-blue-600 hover:text-blue-800">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
