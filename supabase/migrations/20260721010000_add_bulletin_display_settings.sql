alter table public.pedagogical_settings
  add column bulletin_title text not null default 'Bulletin scolaire',
  add column bulletin_orientation text not null default 'portrait' check (bulletin_orientation in ('portrait','landscape')),
  add column bulletin_show_rank boolean not null default true,
  add column bulletin_show_appreciations boolean not null default true,
  add column bulletin_teacher_signature_label text not null default 'Enseignant principal',
  add column bulletin_direction_signature_label text not null default 'Direction',
  add column bulletin_footer text not null default '';
