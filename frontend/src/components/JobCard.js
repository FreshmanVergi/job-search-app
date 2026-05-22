import Link from "next/link";
import { MapPin, Clock, Building2, Users } from "lucide-react";

const WORK_PREF_LABELS = {
  "on-site": "İş Yerinde",
  remote: "Uzaktan",
  hybrid: "Hibrit",
};

const WORK_TYPE_LABELS = {
  "full-time": "Tam Zamanlı",
  "part-time": "Yarı Zamanlı",
  contract: "Sözleşmeli",
  internship: "Staj",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  return `${Math.floor(days / 30)} ay önce`;
}

export default function JobCard({ job }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-start gap-3">
          {/* Company logo */}
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-500 font-bold text-lg">
            {job.companies?.logo_url ? (
              <img
                src={job.companies.logo_url}
                alt={job.companies.name}
                className="w-10 h-10 object-contain"
              />
            ) : (
              (job.companies?.name || "?")[0].toUpperCase()
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 truncate">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
              {job.companies?.name}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5" />
                {job.city}{job.district ? ` (${job.district})` : ""}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {WORK_TYPE_LABELS[job.work_type] || job.work_type}
              </span>
              <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                {WORK_PREF_LABELS[job.work_preference] || job.work_preference}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="text-right flex-shrink-0">
            <span className="text-xs text-gray-400 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              {timeAgo(job.created_at)}
            </span>
            {job.application_count > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-1">
                <Users className="w-3 h-3" />
                {job.application_count} başvuru
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
