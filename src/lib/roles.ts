export const ADMIN_ROLES = ['super_admin', 'moderator', 'editor'];
export const MODERATOR_ROLES = ['super_admin', 'moderator'];
export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Директор',
  moderator: 'Завуч',
  editor: 'Редактор',
  student: 'Ученик',
  teacher: 'Учитель',
  parent: 'Родитель',
};
export const ROLE_DESC: Record<string, string> = {
  super_admin: 'Полный доступ: пользователи, роли, контент, изображения, галерея, расписание, обращения',
  moderator: 'Контент, учителя, расписание, галерея, обращения, изображения',
  editor: 'Новости, объявления и изображения',
  student: 'Публичный доступ без админки',
  teacher: 'Публичный доступ без админки',
  parent: 'Публичный доступ без админки',
};
export function roleLabel(role?: string | null) {
  return role ? (ROLE_LABELS[role] ?? role) : '';
}