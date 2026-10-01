-- ============================================================
--  IIPS Multimodal Student Assignment Analysis System
--  Database Schema v1.0
--  Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. PROGRAM OUTCOMES (POs)
--    Institution-level, e.g. PO1 = Engineering Knowledge
-- ============================================================
CREATE TABLE pos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        UNIQUE NOT NULL,   -- e.g. PO1, PO2
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. COURSES
-- ============================================================
CREATE TABLE courses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  code          TEXT        UNIQUE NOT NULL,  -- e.g. CS301
  description   TEXT,
  faculty_id    UUID        REFERENCES users(id),
  semester      TEXT,                          -- e.g. "Semester 5"
  academic_year TEXT,                          -- e.g. "2025-26"
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. COURSE OUTCOMES (COs)
--    Per-course, e.g. CO1 = Understand OS fundamentals
-- ============================================================
CREATE TABLE cos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL,             -- e.g. CO1, CO2
  description TEXT        NOT NULL,
  course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, code)
);

-- ============================================================
-- 5. CO → PO MAPPING
-- ============================================================
CREATE TABLE co_po_mapping (
  co_id UUID REFERENCES cos(id) ON DELETE CASCADE,
  po_id UUID REFERENCES pos(id) ON DELETE CASCADE,
  PRIMARY KEY (co_id, po_id)
);

-- ============================================================
-- 6. ENROLLMENTS  (student ↔ course)
-- ============================================================
CREATE TABLE enrollments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id  UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- ============================================================
-- 7. ASSIGNMENTS
-- ============================================================
CREATE TABLE assignments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT,
  deadline         TIMESTAMPTZ,
  total_marks      INTEGER     NOT NULL DEFAULT 100,
  -- allowed submission types: text | pdf | docx | image | audio | video
  submission_modes TEXT[]      NOT NULL DEFAULT ARRAY['text'],
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. QUESTIONS  (per assignment, mapped to a CO)
-- ============================================================
CREATE TABLE questions (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID    NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  text          TEXT    NOT NULL,
  max_marks     INTEGER NOT NULL,
  order_index   INTEGER DEFAULT 0,
  co_id         UUID    REFERENCES cos(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. RUBRICS  (evaluation criteria per assignment)
-- ============================================================
CREATE TABLE rubrics (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID           NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  criterion     TEXT           NOT NULL,     -- e.g. "Concept Understanding"
  description   TEXT,
  weight        NUMERIC(5,2)   NOT NULL CHECK (weight > 0 AND weight <= 100),
  created_at    TIMESTAMPTZ    DEFAULT NOW()
);

-- ============================================================
-- 10. SKILLS  (competency definitions, institution-level)
-- ============================================================
CREATE TABLE skills (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. SUBMISSIONS
--     One submission per student per assignment.
--     File stored in Supabase Storage; metadata stored here.
-- ============================================================
CREATE TABLE submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES users(id),
  assignment_id   UUID        NOT NULL REFERENCES assignments(id),
  submission_type TEXT        NOT NULL CHECK (
                    submission_type IN ('text', 'pdf', 'docx', 'image', 'audio', 'video')
                  ),
  text_content    TEXT,           -- for direct text submissions
  file_url        TEXT,           -- Supabase Storage path
  file_name       TEXT,
  file_size_bytes BIGINT,
  extracted_text  TEXT,           -- populated after processing
  status          TEXT        NOT NULL DEFAULT 'submitted' CHECK (
                    status IN ('submitted', 'processing', 'processed', 'evaluated', 'finalized')
                  ),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, assignment_id)
);

-- ============================================================
-- 12. EVALUATIONS
--     AI-generated + faculty-reviewed scores/feedback per submission.
-- ============================================================
CREATE TABLE evaluations (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       UUID         UNIQUE NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  -- AI result
  ai_score            NUMERIC(5,2),
  criterion_scores    JSONB        DEFAULT '{}',  -- {"Concept Understanding": 35, ...}
  strengths           TEXT[],
  weaknesses          TEXT[],
  feedback            TEXT,
  recommended_topics  TEXT[],
  -- Similarity / plagiarism
  similarity_score    NUMERIC(5,2),
  similarity_flagged  BOOLEAN      DEFAULT FALSE,
  -- Faculty review
  faculty_score       NUMERIC(5,2),
  faculty_notes       TEXT,
  faculty_reviewed_at TIMESTAMPTZ,
  -- Final
  final_score         NUMERIC(5,2),
  status              TEXT         NOT NULL DEFAULT 'pending' CHECK (
                        status IN ('pending', 'ai_evaluated', 'faculty_reviewed', 'finalized')
                      ),
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- 13. QUESTION SCORES  (per-question marks for CO attainment)
-- ============================================================
CREATE TABLE question_scores (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID         NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  question_id   UUID         NOT NULL REFERENCES questions(id),
  ai_score      NUMERIC(5,2),
  final_score   NUMERIC(5,2),
  UNIQUE(evaluation_id, question_id)
);

-- ============================================================
-- 14. STUDENT SKILLS  (skill progression tracking)
-- ============================================================
CREATE TABLE student_skills (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  skill_id   UUID         NOT NULL REFERENCES skills(id)  ON DELETE CASCADE,
  score      NUMERIC(5,2) DEFAULT 0,
  evidence   TEXT,
  updated_at TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(student_id, skill_id)
);

-- ============================================================
-- INDEXES  (for query performance)
-- ============================================================
CREATE INDEX idx_courses_faculty        ON courses(faculty_id);
CREATE INDEX idx_enrollments_student    ON enrollments(student_id);
CREATE INDEX idx_enrollments_course     ON enrollments(course_id);
CREATE INDEX idx_assignments_course     ON assignments(course_id);
CREATE INDEX idx_questions_assignment   ON questions(assignment_id);
CREATE INDEX idx_questions_co           ON questions(co_id);
CREATE INDEX idx_rubrics_assignment     ON rubrics(assignment_id);
CREATE INDEX idx_submissions_student    ON submissions(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_status     ON submissions(status);
CREATE INDEX idx_evaluations_submission ON evaluations(submission_id);
CREATE INDEX idx_evaluations_status     ON evaluations(status);
CREATE INDEX idx_question_scores_eval   ON question_scores(evaluation_id);
CREATE INDEX idx_cos_course             ON cos(course_id);
CREATE INDEX idx_co_po_co               ON co_po_mapping(co_id);
CREATE INDEX idx_co_po_po               ON co_po_mapping(po_id);
CREATE INDEX idx_student_skills_student ON student_skills(student_id);

-- ============================================================
-- TRIGGER: auto-update evaluations.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evaluations_updated_at
  BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: Default Program Outcomes (standard PO1-PO12)
-- ============================================================
INSERT INTO pos (code, description) VALUES
  ('PO1',  'Engineering Knowledge'),
  ('PO2',  'Problem Analysis'),
  ('PO3',  'Design/Development of Solutions'),
  ('PO4',  'Conduct Investigations of Complex Problems'),
  ('PO5',  'Modern Tool Usage'),
  ('PO6',  'The Engineer and Society'),
  ('PO7',  'Environment and Sustainability'),
  ('PO8',  'Ethics'),
  ('PO9',  'Individual and Team Work'),
  ('PO10', 'Communication'),
  ('PO11', 'Project Management and Finance'),
  ('PO12', 'Life-long Learning');

-- ============================================================
-- SEED: Default Skills
-- ============================================================
INSERT INTO skills (name, description) VALUES
  ('Problem Solving',      'Ability to analyse and solve complex problems'),
  ('Technical Writing',    'Clear and structured written communication'),
  ('Critical Thinking',    'Evaluating information and forming judgements'),
  ('Concept Application',  'Applying theoretical knowledge to practical scenarios'),
  ('Communication',        'Verbal and written communication skills');
