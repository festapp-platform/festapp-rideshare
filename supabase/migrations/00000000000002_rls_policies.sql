-- RLS Policies for profiles table.
-- Authenticated users can view any profile but only update their own.
-- No INSERT policy needed: the on_auth_user_created trigger handles profile creation.
-- No DELETE policy needed: CASCADE from auth.users handles profile deletion.

-- Any authenticated user can view any profile (needed for driver/passenger info)
CREATE POLICY "Users can view any profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
