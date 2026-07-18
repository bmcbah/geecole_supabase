-- Garantit que tout frais financier créé après l'ajout des avantages possède
-- immédiatement un montant net cohérent avec son montant initial.

create or replace function public.initialize_student_financial_item_amounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.adjustment_amount := coalesce(new.adjustment_amount, 0);

  if new.net_amount is null then
    new.net_amount := new.amount - new.adjustment_amount;
  end if;

  if new.net_amount <> new.amount - new.adjustment_amount then
    raise exception 'invalid_financial_item_net_amount'
      using detail = format(
        'amount=%s adjustment_amount=%s net_amount=%s',
        new.amount,
        new.adjustment_amount,
        new.net_amount
      );
  end if;

  return new;
end;
$$;

drop trigger if exists initialize_student_financial_item_amounts_trigger
  on public.student_financial_items;

create trigger initialize_student_financial_item_amounts_trigger
before insert on public.student_financial_items
for each row
execute function public.initialize_student_financial_item_amounts();

comment on function public.initialize_student_financial_item_amounts()
is 'Initialise adjustment_amount et net_amount lors de la création d’un frais financier et vérifie la cohérence amount - adjustment_amount = net_amount.';
