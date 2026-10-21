-- This migration targets Supabase PostgreSQL (auth.uid(), anon/authenticated roles).
-- REST writes go through the authorized Express backend using a privileged DB role.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_identity FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.clan_memberships ADD CONSTRAINT valid_clan_role CHECK (role IN ('OWNER','ADMIN','MEMBER'));
CREATE UNIQUE INDEX one_owner_per_clan ON public.clan_memberships ("clanId") WHERE role = 'OWNER';
ALTER TABLE public.coding_activities ADD CONSTRAINT valid_difficulty CHECK (difficulty IN ('EASY','MEDIUM','HARD'));
ALTER TABLE public.xp_transactions ADD CONSTRAINT valid_xp_amount CHECK (amount IN (10,25,50));
ALTER TABLE public.follows ADD CONSTRAINT no_self_follow CHECK ("followerId" <> "followingId");
ALTER TABLE public.challenges ADD CONSTRAINT valid_challenge_window CHECK ("endsAt" > "startsAt" AND target > 0);
ALTER TABLE public.activity_claims ADD CONSTRAINT valid_claim_status CHECK (status IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE public.activity_claims ADD CONSTRAINT independent_review CHECK ("reviewerId" IS NULL OR "reviewerId" <> "userId");
ALTER TABLE public.posts ADD CONSTRAINT valid_post_kind CHECK ((kind = 'MANUAL' AND "activityId" IS NULL) OR (kind = 'ACHIEVEMENT' AND "activityId" IS NOT NULL));

CREATE FUNCTION public.slush_is_member(clan uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.clan_memberships m WHERE m."clanId" = clan AND m."userId" = (SELECT auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.slush_is_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slush_is_member(uuid) TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_claims ENABLE ROW LEVEL SECURITY;

-- Restrict API roles, including projects with permissive default table grants.
REVOKE ALL ON TABLE public.profiles, public.connected_accounts, public.coding_activities,
  public.daily_summaries, public.streaks, public.clans, public.clan_memberships,
  public.join_requests, public.follows, public.posts, public.likes, public.comments,
  public.challenges, public.challenge_participations, public.xp_transactions,
  public.achievements, public.user_achievements, public.notifications,
  public.chat_messages, public.activity_claims FROM anon, authenticated;
GRANT SELECT ON public.chat_messages, public.posts, public.notifications TO authenticated;
CREATE POLICY clan_chat_select ON public.chat_messages FOR SELECT TO authenticated USING (public.slush_is_member("clanId"));
CREATE POLICY post_select ON public.posts FOR SELECT TO authenticated USING ("clanId" IS NULL OR public.slush_is_member("clanId"));
CREATE POLICY own_notifications ON public.notifications FOR SELECT TO authenticated USING ("userId" = (SELECT auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages, public.posts, public.notifications;
  END IF;
END $$;
