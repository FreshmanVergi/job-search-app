"use client";
import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import JobCard from "@/components/JobCard";
import AIAgent from "@/components/AIAgent";
import { apiClient } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { X, SlidersHorizontal } from "lucide-react";

const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep"];
const COUNTRIES = ["Türkiye", "Germany", "Netherlands", "UK"];
const WORK_PREFS = [
  { value: "on-site", label: "İş Yerinde" },
  { value: "remote", label: "Uzaktan / Remote" },
  { value: "hybrid", label: "Hibrit" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [filters, setFilters] = useState({
    position: searchParams.get("position") || "",
    city: searchParams.get("city") || "",
    country: searchParams.get("country") || "",
    district: searchParams.get("district") || "",
    work_preference: searchParams.get("work_preference") || "",
    work_type: searchParams.get("work_type") || "",
  });
  const [activeFilters, setActiveFilters] = useState([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const chips = [];
    if (filters.position) chips.push({ key: "position", label: filters.position });
    if (filters.city) chips.push({ key: "city", label: filters.city });
    if (filters.country) chips.push({ key: "country", label: filters.country });
    if (filters.district) chips.push({ key: "district", label: filters.district });
    if (filters.work_preference) {
      const pref = WORK_PREFS.find((p) => p.value === filters.work_preference);
      chips.push({ key: "work_preference", label: pref?.label || filters.work_preference });
    }
    if (filters.work_type) chips.push({ key: "work_type", label: filters.work_type });
    setActiveFilters(chips);
  }, [filters]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient.searchJobs({ ...filters, page, limit: 20 }, supabase);
      setJobs(result.data || []);
      setTotal(result.pagination?.total || 0);
      setHasNext(result.pagination?.hasNext || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const removeFilter = (key) => { setFilters((prev) => ({ ...prev, [key]: "" })); setPage(1); };
  const clearAllFilters = () => { setFilters({ position: "", city: "", country: "", district: "", work_preference: "", work_type: "" }); setPage(1); };
  const updateFilter = (key, value) => { setFilters((prev) => ({ ...prev, [key]: value })); setPage(1); };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <SearchBar initialPosition={filters.position} initialCity={filters.city} />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-5 sticky top-20">
            <h2 className="font-semibold text-gray-900">Filtreler</h2>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ülke</label>
              <select value={filters.country} onChange={(e) => updateFilter("country", e.target.value)} className="input-base mt-1.5">
                <option value="">Tüm Ülkeler</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Şehir</label>
              <select value={filters.city} onChange={(e) => updateFilter("city", e.target.value)} className="input-base mt-1.5">
                <option value="">Tüm Şehirler</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">İlçe</label>
              <input type="text" value={filters.district} onChange={(e) => updateFilter("district", e.target.value)} placeholder="İlçe seçin" className="input-base mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Çalışma Tercihi</label>
              <div className="mt-2 space-y-2">
                {WORK_PREFS.map((pref) => (
                  <label key={pref.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filters.work_preference === pref.value} onChange={(e) => updateFilter("work_preference", e.target.checked ? pref.value : "")} className="accent-primary-700 w-4 h-4" />
                    <span className="text-sm text-gray-700">{pref.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={clearAllFilters} className="text-sm text-red-500 hover:underline">Filtreleri Temizle</button>
          </div>
        </aside>
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">{loading ? "Aranıyor..." : `${total} İş İlanı`}</h1>
            <button onClick={() => setMobileFiltersOpen(true)} className="lg:hidden flex items-center gap-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5">
              <SlidersHorizontal className="w-4 h-4" /> Filtrele
            </button>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-500 font-medium">Seçili Filtreler ({activeFilters.length})</span>
              <button onClick={clearAllFilters} className="text-xs text-primary-700 hover:underline">Filtreleri Temizle</button>
              {activeFilters.map((f) => (
                <span key={f.key} className="flex items-center gap-1 text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2 py-1 rounded-full">
                  {f.label}
                  <button onClick={() => removeFilter(f.key)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          {loading ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg font-medium">İlan bulunamadı</p>
              <p className="text-sm mt-1">Farklı arama kriterleri deneyin</p>
            </div>
          ) : (
            <div className="space-y-3">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
          )}
          <div className="flex items-center justify-center gap-3 mt-8">
            {page > 1 && <button onClick={() => setPage((p) => p - 1)} className="btn-secondary text-sm">← Önceki</button>}
            <span className="text-sm text-gray-500">Sayfa {page}</span>
            {hasNext && <button onClick={() => setPage((p) => p + 1)} className="btn-primary text-sm">Sonraki →</button>}
          </div>
        </main>
      </div>
      <AIAgent />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <SearchContent />
    </Suspense>
  );
}