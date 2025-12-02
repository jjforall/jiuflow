-- Add proficiency level and repetition count to practice records
ALTER TABLE practice_records
ADD COLUMN proficiency_level integer CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
ADD COLUMN repetition_count integer DEFAULT 1 CHECK (repetition_count > 0);

COMMENT ON COLUMN practice_records.proficiency_level IS 'Skill proficiency level from 1 (beginner) to 5 (expert)';
COMMENT ON COLUMN practice_records.repetition_count IS 'Number of repetitions practiced in this session';