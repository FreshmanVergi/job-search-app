const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const getAuthHeader = async (supabase) => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
};

export const apiClient = {
  // Jobs
  getJobs: async (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v)
    ).toString();
    const res = await fetch(`${API_URL}/api/v1/jobs${qs ? `?${qs}` : ""}`);
    return res.json();
  },

  getJob: async (id) => {
    const res = await fetch(`${API_URL}/api/v1/jobs/${id}`);
    return res.json();
  },

  searchJobs: async (params = {}, supabase = null) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v)
    ).toString();
    const headers = supabase ? await getAuthHeader(supabase) : {};
    const res = await fetch(`${API_URL}/api/v1/search?${qs}`, { headers });
    return res.json();
  },

  autocomplete: async (q, type) => {
    const res = await fetch(
      `${API_URL}/api/v1/jobs/autocomplete?q=${encodeURIComponent(q)}&type=${type}`
    );
    return res.json();
  },

  // Applications
  applyToJob: async (jobId, coverLetter, supabase) => {
    const headers = await getAuthHeader(supabase);
    const res = await fetch(`${API_URL}/api/v1/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ job_id: jobId, cover_letter: coverLetter }),
    });
    return res.json();
  },

  // Recent searches
  getRecentSearches: async (supabase) => {
    const headers = await getAuthHeader(supabase);
    const res = await fetch(`${API_URL}/api/v1/recent-searches`, { headers });
    return res.json();
  },

  // Job alerts
  getAlerts: async (supabase) => {
    const headers = await getAuthHeader(supabase);
    const res = await fetch(`${API_URL}/api/v1/alerts`, { headers });
    return res.json();
  },

  createAlert: async (alertData, supabase) => {
    const headers = await getAuthHeader(supabase);
    const res = await fetch(`${API_URL}/api/v1/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(alertData),
    });
    return res.json();
  },

  deleteAlert: async (id, supabase) => {
    const headers = await getAuthHeader(supabase);
    const res = await fetch(`${API_URL}/api/v1/alerts/${id}`, {
      method: "DELETE",
      headers,
    });
    return res.json();
  },

  // Admin
  createJob: async (jobData, supabase) => {
    const headers = await getAuthHeader(supabase);
    const res = await fetch(`${API_URL}/api/v1/admin/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(jobData),
    });
    return res.json();
  },

  updateJob: async (id, jobData, supabase) => {
    const headers = await getAuthHeader(supabase);
    const res = await fetch(`${API_URL}/api/v1/admin/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(jobData),
    });
    return res.json();
  },

  // AI Agent
  chatWithAI: async (messages, supabase) => {
    const headers = await getAuthHeader(supabase);
    const res = await fetch(`${API_URL}/api/v1/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ messages }),
    });
    return res.json();
  },
};
