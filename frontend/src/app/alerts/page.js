"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { apiClient } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { Bell, Plus, Trash2, X, Loader2 } from "lucide-react";

export default function AlertsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Türkiye");
  const [workPreference, setWorkPreference] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login?redirect=/alerts"); return; }

      const res = await apiClient.getAlerts(supabase);
      setAlerts(res.data || []);
      setLoading(false);
    };
    init();
  }, []);

  const addKeyword = () => {
    if (keyword.trim() && !keywords.includes(keyword.trim())) {
      setKeywords([...keywords, keyword.trim()]);
      setKeyword("");
    }
  };

  const handleCreate = async () => {
    if (keywords.length === 0) return;
    setSaving(true);
    const res = await apiClient.createAlert(
      { keywords, city, country, workPreference },
      supabase
    );
    if (res.data) {
      setAlerts([...alerts, res.data]);
      setShowForm(false);
      setKeywords([]);
      setCity("");
      setWorkPreference("");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await apiClient.deleteAlert(id, supabase);
    setAlerts(alerts.filter((a) => a._id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-700" /> İş Alarmları
          </h1>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Alarm Oluştur
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">İş Alarmı Oluştur</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            {/* Keywords */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Anahtar Kelimeler ({keywords.length} Seçim)
              </label>
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  placeholder="Örn: React Developer"
                  className="input-base"
                />
                <button onClick={addKeyword} className="btn-secondary text-sm whitespace-nowrap">Ekle</button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1 text-sm bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
                      {kw}
                      <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ülke</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="input-base mt-1">
                  <option value="Türkiye">Türkiye</option>
                  <option value="Germany">Almanya</option>
                  <option value="Netherlands">Hollanda</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Şehir</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Şehir seçin"
                  className="input-base mt-1"
                />
              </div>
            </div>

            {/* Work preference */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Çalışma Tercihi</label>
              <select value={workPreference} onChange={(e) => setWorkPreference(e.target.value)} className="input-base mt-1">
                <option value="">Tümü</option>
                <option value="on-site">İş Yerinde</option>
                <option value="remote">Uzaktan</option>
                <option value="hybrid">Hibrit</option>
              </select>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving || keywords.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Alarmı Kaydet
            </button>
          </div>
        )}

        {/* Alert list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Henüz alarm oluşturmadınız.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert._id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {alert.keywords.map((kw) => (
                      <span key={kw} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {alert.city && <p>📍 {alert.city}, {alert.country}</p>}
                    {alert.workPreference && <p>💼 {alert.workPreference}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(alert._id)} className="text-red-400 hover:text-red-600 ml-3">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
