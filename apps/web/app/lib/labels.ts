export function toDisplayLabel(key: string) {
  // "study_sessions" -> "Study Sessions", "userId" -> "User Id"
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // userId -> user Id
    .split(' ')
    .map(w => w.length ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}





