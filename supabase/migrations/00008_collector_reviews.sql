-- Add collector review and rating to waste_reports table
ALTER TABLE waste_reports
ADD COLUMN collector_rating INTEGER CHECK (collector_rating >= 1 AND collector_rating <= 5),
ADD COLUMN collector_review TEXT;

-- Create an index to quickly find rated reports or unrated completed reports
CREATE INDEX idx_reports_rating ON waste_reports(status, collector_rating) WHERE status = 'completed';
