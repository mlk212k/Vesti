-- Adds a single "Seniors" catch-all category, alongside the youth U6-U19
-- categories. Deliberately not split into Senior A/B/C sub-teams — that
-- distinction is handled by staff, not self-selected.
alter type public.member_category add value 'seniors';
