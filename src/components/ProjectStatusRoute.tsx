import { useHolidays } from "../hooks/useHolidays";
import { useSchedule } from "../hooks/useSchedule";
import { useToday } from "../hooks/useToday";
import { ProjectStatusPage } from "./ProjectStatusPage";

export function ProjectStatusRoute() {
  const holidays = useHolidays();
  const schedule = useSchedule(undefined, holidays);
  const today = useToday();

  if (schedule.loading) {
    return <main className="project-status-page status-route-message" role="status">Завантажуємо стан проєкту…</main>;
  }

  if (schedule.error && !schedule.saved) {
    return <main className="project-status-page status-route-message" role="alert">Не вдалося завантажити стан проєкту.</main>;
  }

  return (
    <ProjectStatusPage
      items={schedule.items}
      today={today}
      holidays={holidays}
      updatedAt={schedule.saved?.updatedAt}
    />
  );
}
