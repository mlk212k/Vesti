-- Vesti — la TVA ne peut pas se glisser dans une commission
--
-- Le registre des commissions est la seule table dont une erreur se traduit
-- directement par un virement faux. Ces tests vérifient que la base refuse
-- elle-même les lignes incohérentes, plutôt que de compter sur l'application
-- pour ne jamais se tromper.
do $$
declare
  v_parrain  uuid := gen_random_uuid();
  v_filleul  uuid := gen_random_uuid();
  v_ok       boolean;
begin
  insert into auth.users (id, email) values
    (v_parrain, 'parrain-tva@test.local'),
    (v_filleul, 'filleul-tva@test.local');

  -- ---------------------------------------------------------------------
  -- Sous franchise : net = brut, TVA = 0. C'est la situation d'aujourd'hui.
  -- ---------------------------------------------------------------------
  insert into public.referral_earnings
    (referrer_id, referred_id, stripe_id, kind,
     gross_cents, net_cents, vat_cents, commission_cents, rate, currency, occurred_at)
  values
    (v_parrain, v_filleul, 'in_franchise', 'invoice',
     1799, 1799, 0, 540, 0.3, 'eur', now());
  raise notice 'PASS  franchise : une ligne sans TVA est acceptée';

  -- ---------------------------------------------------------------------
  -- Après le seuil : 17,99 € TTC = 14,99 € HT + 3,00 € de TVA, et la
  -- commission porte sur les 14,99 € — 450 centimes, pas 540.
  -- ---------------------------------------------------------------------
  insert into public.referral_earnings
    (referrer_id, referred_id, stripe_id, kind,
     gross_cents, net_cents, vat_cents, commission_cents, rate, currency, occurred_at)
  values
    (v_parrain, v_filleul, 'in_assujetti', 'invoice',
     1799, 1499, 300, 450, 0.3, 'eur', now());
  raise notice 'PASS  assujetti : la commission porte sur le HT (4,50 € et non 5,40 €)';

  -- ---------------------------------------------------------------------
  -- Le cas qu'il faut rendre IMPOSSIBLE : des parts qui ne recomposent pas
  -- l'encaissement. Ici on prétend encaisser 17,99 € dont 14,99 € pour nous
  -- et 0 € de TVA — les 3 € manquants n'existent nulle part.
  -- ---------------------------------------------------------------------
  begin
    insert into public.referral_earnings
      (referrer_id, referred_id, stripe_id, kind,
       gross_cents, net_cents, vat_cents, commission_cents, rate, currency, occurred_at)
    values
      (v_parrain, v_filleul, 'in_incoherent', 'invoice',
       1799, 1499, 0, 450, 0.3, 'eur', now());
    v_ok := false;
  exception when check_violation then
    v_ok := true;
  end;

  if not v_ok then
    raise exception 'FAIL  une ligne dont les parts ne recomposent pas le brut a été acceptée';
  end if;
  raise notice 'PASS  une ligne incohérente est refusée par la base';

  -- ---------------------------------------------------------------------
  -- Un remboursement doit rester cohérent lui aussi, en négatif.
  -- ---------------------------------------------------------------------
  insert into public.referral_earnings
    (referrer_id, referred_id, stripe_id, kind,
     gross_cents, net_cents, vat_cents, commission_cents, rate, currency, occurred_at)
  values
    (v_parrain, v_filleul, 'refund_assujetti', 'refund',
     -1799, -1499, -300, -450, 0.3, 'eur', now());
  raise notice 'PASS  un remboursement annule les trois montants dans le même sens';

  -- ---------------------------------------------------------------------
  -- Un net supérieur au brut signifierait qu'on garde plus que l'encaissé.
  -- ---------------------------------------------------------------------
  begin
    insert into public.referral_earnings
      (referrer_id, referred_id, stripe_id, kind,
       gross_cents, net_cents, vat_cents, commission_cents, rate, currency, occurred_at)
    values
      (v_parrain, v_filleul, 'in_net_trop_grand', 'invoice',
       1799, 2000, -201, 600, 0.3, 'eur', now());
    v_ok := false;
  exception when check_violation then
    v_ok := true;
  end;

  if not v_ok then
    raise exception 'FAIL  un net supérieur à l''encaissé a été accepté';
  end if;
  raise notice 'PASS  un net supérieur à l''encaissé est refusé';

  raise notice 'TOUS LES TESTS TVA SONT PASSÉS';
end $$;
