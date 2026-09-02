-- Vesti — préparer la TVA sans encore l'appliquer
--
-- Aujourd'hui Vesti relève de la franchise en base (art. 293 B du CGI) : aucune
-- TVA n'est facturée ni collectée. Ce sera vrai jusqu'au franchissement du
-- seuil, qui s'apprécie sur l'ENSEMBLE du chiffre d'affaires de la structure —
-- pas sur celui de Vesti seul.
--
-- ⚠️ Le registre des commissions ne gardait qu'un montant : l'encaissé. Le jour
-- de la bascule, ce montant cesserait de vouloir dire « ce qui nous revient »
-- sans que rien dans le schéma ne le signale, et les lignes d'avant et d'après
-- deviendraient incomparables sans qu'on puisse le savoir en les lisant.
--
-- On sépare donc les trois montants dès maintenant, tant que c'est gratuit :
--
--   gross_cents  ce que Stripe a encaissé  → rapprochement bancaire
--   net_cents    ce qui nous revient       → base de la commission
--   vat_cents    ce qui est dû à l'État    → déclaration
--
-- Tant que la franchise s'applique : net = brut, TVA = 0. Les lignes déjà
-- écrites restent donc exactes, et les futures le resteront après la bascule.

alter table public.referral_earnings
  add column net_cents integer,
  add column vat_cents integer not null default 0;

-- Les lignes existantes ont été encaissées sous franchise : le net EST le brut.
-- Ce n'est pas une approximation de rattrapage, c'est le montant exact.
update public.referral_earnings set net_cents = gross_cents where net_cents is null;

alter table public.referral_earnings
  alter column net_cents set not null;

-- Invariants : la TVA ne peut pas dépasser l'encaissement, et les deux parts
-- doivent le recomposer exactement. Une commission calculée sur une ligne qui
-- viole ça serait fausse — autant que la base refuse de l'écrire.
alter table public.referral_earnings
  add constraint referral_earnings_net_recompose
    check (net_cents + vat_cents = gross_cents),
  add constraint referral_earnings_net_same_sign
    check (abs(net_cents) <= abs(gross_cents));

comment on column public.referral_earnings.net_cents is
  'Encaissé hors TVA. Base de calcul de la commission. Sous franchise, égal à gross_cents.';
comment on column public.referral_earnings.vat_cents is
  'TVA collectée, due à l''État. Ne fait jamais partie de la base de commission.';
