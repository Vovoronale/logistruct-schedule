import { useEffect, useState } from "react";

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useToday(): string {
  const [today, setToday] = useState(() => localIsoDate());

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 20);
    const timeout = window.setTimeout(
      () => setToday(localIsoDate()),
      nextMidnight.getTime() - now.getTime(),
    );
    return () => window.clearTimeout(timeout);
  }, [today]);

  return today;
}
