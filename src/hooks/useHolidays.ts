import { useEffect, useState } from "react";
import { loadHolidays } from "../lib/holidays";

export function useHolidays(): ReadonlySet<string> {
  const [holidays, setHolidays] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    void loadHolidays().then((loaded) => {
      if (active) setHolidays(loaded);
    });
    return () => { active = false; };
  }, []);

  return holidays;
}
