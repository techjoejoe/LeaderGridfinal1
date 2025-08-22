
export function getToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isWeekday(day: number): boolean {
  // 0 is Sunday, 6 is Saturday
  return day >= 1 && day <= 5;
}
