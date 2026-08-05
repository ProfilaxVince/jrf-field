export const seedUsers = [
  { id: 'u-gerardo', full_name: 'Petrosino Gérardo', nickname: 'Gerardo', color_hex: '#FFFF00', is_admin: true },
  { id: 'u-guilio', full_name: 'Martella Giulio', nickname: 'Guilio', color_hex: '#92D050', is_admin: false },
  { id: 'u-page', full_name: 'Carion Page', nickname: 'Page', color_hex: '#00B0F0', is_admin: false },
  { id: 'u-michou', full_name: 'Claessens Michel', nickname: 'Michou', color_hex: '#FF0000', is_admin: false },
  { id: 'u-tony', full_name: 'Vanderskippen Tony', nickname: 'Tony', color_hex: '#FFC000', is_admin: false },
  { id: 'u-laura', full_name: 'Martella Laura', nickname: 'Laura', color_hex: '#7030A0', is_admin: false },
];

export type SeedUser = typeof seedUsers[number];
