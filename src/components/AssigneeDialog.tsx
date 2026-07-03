import { useEffect, useRef, useState } from "react";
import type { Assignee, ScheduleItem } from "../types";
import { assigneeUsageCount } from "../lib/assignees";
import { PlusIcon, SaveIcon, TrashIcon, XIcon } from "./Icons";

interface AssigneeDialogProps {
  open: boolean;
  assignees: Assignee[];
  items: ScheduleItem[];
  onClose: () => void;
  onApply: (assignees: Assignee[]) => void;
}

const HEX_COLOR = /^#[0-9A-F]{6}$/iu;

export function AssigneeDialog({ open, assignees, items, onClose, onApply }: AssigneeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Assignee[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDraft(assignees.map((person) => ({ ...person })));
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [assignees, open]);

  const add = () => {
    const now = new Date().toISOString();
    setDraft((current) => [...current, {
      id: crypto.randomUUID(),
      name: "",
      color: "#4472C4",
      position: current.length + 1,
      createdAt: now,
      updatedAt: now,
    }]);
    setError(null);
  };

  const update = (id: string, patch: Partial<Assignee>) => {
    setDraft((current) => current.map((person) => (
      person.id === id ? { ...person, ...patch } : person
    )));
    setError(null);
  };

  const usageFor = (person: Assignee) => {
    const originalName = assignees.find((saved) => saved.id === person.id)?.name ?? person.name;
    return assigneeUsageCount(items, originalName);
  };

  const remove = (person: Assignee) => {
    if (usageFor(person) > 0) return;
    setDraft((current) => current.filter((candidate) => candidate.id !== person.id));
    setError(null);
  };

  const apply = () => {
    const normalized = draft.map((person, index) => ({
      ...person,
      name: person.name.trim(),
      color: person.color.toUpperCase(),
      position: index + 1,
    }));
    if (normalized.some((person) => !person.name || person.name.length > 24)) {
      setError("Ім’я виконавця має містити від 1 до 24 символів");
      return;
    }
    if (normalized.some((person) => !HEX_COLOR.test(person.color))) {
      setError("Колір має бути у форматі #RRGGBB");
      return;
    }
    const names = normalized.map((person) => person.name.toLocaleLowerCase("uk-UA"));
    if (new Set(names).size !== names.length) {
      setError("Назви виконавців не можуть повторюватися");
      return;
    }
    try {
      onApply(normalized);
      onClose();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Не вдалося застосувати зміни");
    }
  };

  return (
    <dialog ref={dialogRef} className="assignee-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="assignee-dialog-title">
      <button type="button" className="dialog-close" onClick={onClose} aria-label="Закрити"><XIcon /></button>
      <div className="assignee-dialog-heading">
        <div>
          <h2 id="assignee-dialog-title">Виконавці та кольори</h2>
          <p>Кольори одразу відображатимуться в легенді та графіку.</p>
        </div>
        <button className="button secondary" type="button" onClick={add}><PlusIcon /> Додати виконавця</button>
      </div>

      <div className="assignee-editor-list">
        {draft.length === 0 ? <div className="assignee-empty">Додайте першого виконавця.</div> : draft.map((person, index) => {
          const usage = usageFor(person);
          return (
            <div className="assignee-editor-row" key={person.id}>
              <span className="assignee-order">{index + 1}</span>
              <label className="assignee-name-control">
                <span>Ім’я</span>
                <input value={person.name} maxLength={24} onChange={(event) => update(person.id, { name: event.target.value })} aria-label={`Ім’я виконавця ${index + 1}`} />
              </label>
              <label className="color-control">
                <span>Колір</span>
                <span className="color-input-wrap">
                  <input type="color" value={person.color} onChange={(event) => update(person.id, { color: event.target.value })} aria-label={`Колір виконавця ${index + 1}`} />
                  <code>{person.color.toUpperCase()}</code>
                </span>
              </label>
              <div className={`usage-note ${usage > 0 ? "used" : ""}`}>
                {usage > 0 ? `Використано у ${usage} кресленні${usage === 1 ? "" : "ях"}` : "Не призначено"}
              </div>
              <button className="icon-button assignee-delete" type="button" onClick={() => remove(person)} disabled={usage > 0} aria-label={`Видалити ${person.name || `виконавця ${index + 1}`}`} title={usage > 0 ? "Спочатку замініть виконавця у кресленнях" : "Видалити"}>
                <TrashIcon />
              </button>
            </div>
          );
        })}
      </div>

      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="assignee-dialog-actions">
        <button className="button ghost" type="button" onClick={onClose}>Скасувати</button>
        <button className="button primary" type="button" onClick={apply}><SaveIcon /> Застосувати</button>
      </div>
    </dialog>
  );
}
