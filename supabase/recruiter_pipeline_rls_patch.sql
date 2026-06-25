-- JUKE Beta blocker patch: recruiter_pipeline must be private to each recruiter.
-- Apply in Supabase SQL editor or through the project migration pipeline.

ALTER TABLE public.recruiter_pipeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS juke_recruiter_pipeline_select_own ON public.recruiter_pipeline;
DROP POLICY IF EXISTS juke_recruiter_pipeline_insert_own ON public.recruiter_pipeline;
DROP POLICY IF EXISTS juke_recruiter_pipeline_update_own ON public.recruiter_pipeline;
DROP POLICY IF EXISTS juke_recruiter_pipeline_delete_own ON public.recruiter_pipeline;
DROP POLICY IF EXISTS juke_recruiter_pipeline_anon_no_select ON public.recruiter_pipeline;
DROP POLICY IF EXISTS juke_recruiter_pipeline_auth_select_own_guard ON public.recruiter_pipeline;
DROP POLICY IF EXISTS juke_recruiter_pipeline_auth_write_own_guard ON public.recruiter_pipeline;

CREATE POLICY juke_recruiter_pipeline_select_own
ON public.recruiter_pipeline
FOR SELECT
TO authenticated
USING (recruiter_id = auth.uid());

CREATE POLICY juke_recruiter_pipeline_insert_own
ON public.recruiter_pipeline
FOR INSERT
TO authenticated
WITH CHECK (recruiter_id = auth.uid());

CREATE POLICY juke_recruiter_pipeline_update_own
ON public.recruiter_pipeline
FOR UPDATE
TO authenticated
USING (recruiter_id = auth.uid())
WITH CHECK (recruiter_id = auth.uid());

CREATE POLICY juke_recruiter_pipeline_delete_own
ON public.recruiter_pipeline
FOR DELETE
TO authenticated
USING (recruiter_id = auth.uid());

-- These restrictive guards neutralize any older broad SELECT/WRITE policies that
-- may still exist from alpha. They are ANDed with permissive policies.
CREATE POLICY juke_recruiter_pipeline_anon_no_select
ON public.recruiter_pipeline
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

CREATE POLICY juke_recruiter_pipeline_auth_select_own_guard
ON public.recruiter_pipeline
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (recruiter_id = auth.uid());

CREATE POLICY juke_recruiter_pipeline_auth_write_own_guard
ON public.recruiter_pipeline
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (recruiter_id = auth.uid())
WITH CHECK (recruiter_id = auth.uid());
