"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import JobCard from "@/components/JobCard";
import AIAgent from "@/components/AIAgent";
import { apiClient } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { Clock, Bell } from "lucide-react";

export default function HomePage() {
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Get city from geolocation then fetch local jobs
      let city = "";
      try {
        await new Promise((resolve) => {
          navigator.geolocation?.getCurrentPosition(async (pos) => {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=tr`
            );
            const data = await res.json();
            city = data.address?.city || data.address?.town || "";
            resolve();
          }, resolve, { timeout: 3000 });
        });
      } catch {}

      // Fetch local jobs (or all if no city)
      const result = await apiClient.getJobs({ city, limit: 10 });
      let jobs = result.data || [];
      if (jobs.length < 5) {
        // Fallback to all jobs
        const fallback = await apiClient.getJobs({ limit: 10 });
        jobs = fallback.data || [];
      }
      setNearbyJobs(jobs);

      // Fetch recent searches if logged in
      if (user) {
        try {
          const searches = await apiClient.getRecentSearches(supabase);
          setRecentSearches(searches.data || []);
        } catch {}
      }

      setLoading(false);
    };

    init();
  }, []);

  const formatSearch = (search) => {
    const parts = [];
    if (search.query?.city) parts.push(search.query.city);
    if (search.query?.position) parts.push(search.query.position);
    if (search.query?.workType) parts.push(search.query.workType);
    return parts.join(" – ") || "Arama";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Kariyer Fırsatlarını Keşfet
          </h1>
          <p className="text-gray-500 mb-8">Binlerce şirkette iş fırsatları</p>
          <SearchBar />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Son Aramalarım
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 5).map((s) => (
                <Link
                  key={s._id}
                  href={`/search?position=${s.query?.position || ""}&city=${s.query?.city || ""}`}
                  className="text-sm bg-white border border-gray-200 rounded-full px-4 py-1.5 hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  {formatSearch(s)}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Nearby / Featured Jobs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Yakınındaki İş İlanları
            </h2>
            <Link href="/search" className="text-sm text-primary-700 hover:underline">
              Tümünü Gör →
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {nearbyJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        {/* Job alert CTA */}
        {user && (
          <section className="bg-primary-50 border border-primary-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-primary-900">İş Alarmı Oluştur</h3>
              <p className="text-sm text-primary-700 mt-1">
                Yeni ilanlar eklenince anında haberdar ol
              </p>
            </div>
            <Link href="/alerts" className="btn-primary flex items-center gap-2">
              <Bell className="w-4 h-4" /> Alarm Kur
            </Link>
          </section>
        )}
      </div>

      <AIAgent />
    </div>
  );
}
