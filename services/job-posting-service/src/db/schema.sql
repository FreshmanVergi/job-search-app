-- Run this in Supabase SQL editor

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  department VARCHAR(100),
  position_level VARCHAR(100), -- junior, mid, senior, expert, manager
  work_type VARCHAR(50) NOT NULL, -- full-time, part-time, contract, internship
  work_preference VARCHAR(50) NOT NULL, -- on-site, remote, hybrid
  country VARCHAR(100) DEFAULT 'Türkiye',
  city VARCHAR(100),
  district VARCHAR(100),
  application_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  posted_by UUID, -- admin/company user id
  military_status VARCHAR(100), -- For Turkish job boards
  education_level VARCHAR(100),
  min_experience_years INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  cover_letter TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, accepted, rejected
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_work_type ON jobs(work_type);
CREATE INDEX IF NOT EXISTS idx_jobs_work_preference ON jobs(work_preference);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_jobs_title_search ON jobs USING gin(to_tsvector('turkish', title));
CREATE INDEX IF NOT EXISTS idx_jobs_description_search ON jobs USING gin(to_tsvector('turkish', description));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Increment application count function
CREATE OR REPLACE FUNCTION increment_application_count(job_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE jobs SET application_count = application_count + 1 WHERE id = job_id;
END;
$$ LANGUAGE plpgsql;

-- Seed data for testing
INSERT INTO companies (id, name, logo_url, website) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Alfemo', NULL, 'https://alfemo.com'),
  ('22222222-2222-2222-2222-222222222222', 'Trendyol', NULL, 'https://trendyol.com'),
  ('33333333-3333-3333-3333-333333333333', 'Hepsiburada', NULL, 'https://hepsiburada.com')
ON CONFLICT DO NOTHING;

INSERT INTO jobs (company_id, title, description, requirements, department, position_level, work_type, work_preference, country, city, district, education_level, min_experience_years) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Yazılım Uzmanı', 'Üniversitelerin ilgili bölümlerinden mezun (Bilgisayar Mühendisliği, Yazılım Mühendisliği veya Bilgisayar Programcılığı). Html5, Css3, Bootstrap, Javascript, Jquery, Ajax, Json, Xml bilgisine sahip.', 'React, Node.js, SQL', 'Bilgi Teknolojileri / IT', 'expert', 'full-time', 'on-site', 'Türkiye', 'İzmir', 'Torbalı', 'university', 2),
  ('22222222-2222-2222-2222-222222222222', 'Frontend Developer', 'React ve TypeScript deneyimli frontend developer aranıyor.', 'React, TypeScript, CSS', 'Mühendislik', 'mid', 'full-time', 'hybrid', 'Türkiye', 'İstanbul', 'Kadıköy', 'university', 3),
  ('33333333-3333-3333-3333-333333333333', 'Full Stack Developer', 'Node.js ve React deneyimli full stack developer aranıyor.', 'Node.js, React, PostgreSQL', 'Mühendislik', 'senior', 'full-time', 'remote', 'Türkiye', 'İstanbul', 'Şişli', 'university', 4),
  ('22222222-2222-2222-2222-222222222222', 'Backend Developer', 'Java Spring Boot ile mikroservis geliştirme.', 'Java, Spring Boot, Docker', 'Mühendislik', 'mid', 'full-time', 'hybrid', 'Türkiye', 'İzmir', 'Bornova', 'university', 2),
  ('11111111-1111-1111-1111-111111111111', 'Mobile Developer', 'React Native ile mobil uygulama geliştirme.', 'React Native, JavaScript', 'Mühendislik', 'junior', 'full-time', 'on-site', 'Türkiye', 'Ankara', 'Çankaya', 'university', 1)
ON CONFLICT DO NOTHING;
