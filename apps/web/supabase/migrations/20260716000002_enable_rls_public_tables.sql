-- Enable RLS on all public BASE tables
-- Applies consistent read access policy for authenticated users

-- Core content tables
ALTER TABLE public.passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.passages FOR SELECT TO authenticated USING (true);

ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.explanations FOR SELECT TO authenticated USING (true);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.answers FOR SELECT TO authenticated USING (true);

ALTER TABLE public.choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.choices FOR SELECT TO authenticated USING (true);

ALTER TABLE public.answer_key ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.answer_key FOR SELECT TO authenticated USING (true);

-- Listening
ALTER TABLE public.listening_passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.listening_passages FOR SELECT TO authenticated USING (true);

ALTER TABLE public.listening_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.listening_questions FOR SELECT TO authenticated USING (true);

ALTER TABLE public.listening_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.listening_choices FOR SELECT TO authenticated USING (true);

ALTER TABLE public.listening_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.listening_answers FOR SELECT TO authenticated USING (true);

-- Naesin Reading
ALTER TABLE public.naesin_reading_passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.naesin_reading_passages FOR SELECT TO authenticated USING (true);

ALTER TABLE public.naesin_reading_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.naesin_reading_questions FOR SELECT TO authenticated USING (true);

ALTER TABLE public.naesin_reading_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.naesin_reading_choices FOR SELECT TO authenticated USING (true);

ALTER TABLE public.naesin_reading_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.naesin_reading_answers FOR SELECT TO authenticated USING (true);

-- Hi-Naesin
ALTER TABLE public.hi_naesin_passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.hi_naesin_passages FOR SELECT TO authenticated USING (true);

ALTER TABLE public.hi_naesin_variant_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.hi_naesin_variant_questions FOR SELECT TO authenticated USING (true);

ALTER TABLE public.hi_naesin_variant_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.hi_naesin_variant_choices FOR SELECT TO authenticated USING (true);

ALTER TABLE public.hi_naesin_variant_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.hi_naesin_variant_answers FOR SELECT TO authenticated USING (true);

-- Grammar
ALTER TABLE public.grammar_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.grammar_units FOR SELECT TO authenticated USING (true);

ALTER TABLE public.grammar_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.grammar_chapters FOR SELECT TO authenticated USING (true);

ALTER TABLE public.grammar_2026_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.grammar_2026_units FOR SELECT TO authenticated USING (true);

-- Lectures
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.lectures FOR SELECT TO authenticated USING (true);

ALTER TABLE public.lecture_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.lecture_questions FOR SELECT TO authenticated USING (true);

ALTER TABLE public.lecture_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.lecture_quiz_questions FOR SELECT TO authenticated USING (true);

-- Writing
ALTER TABLE public.digital_writing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.digital_writing_items FOR SELECT TO authenticated USING (true);
