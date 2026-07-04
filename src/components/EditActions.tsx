import { PlusIcon, SaveIcon, XIcon } from "./Icons";

interface EditActionsProps {
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  error?: string;
  onAdd: () => void;
  onManageAssignees: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EditActions({ dirty, canSave, saving, error, onAdd, onManageAssignees, onSave, onCancel }: EditActionsProps) {
  return (
    <div className="edit-actions">
      <div>
        <strong>Режим редагування</strong>
        <span>{error ?? (dirty ? "Є незбережені зміни" : "Зміни відсутні")}</span>
      </div>
      <button className="button secondary" type="button" onClick={onAdd}>
        <PlusIcon /> Додати рядок
      </button>
      <button className="button secondary" type="button" onClick={onManageAssignees}>
        Виконавці
      </button>
      <button className="button ghost" type="button" onClick={onCancel}>
        <XIcon /> Скасувати
      </button>
      <button className="button primary" type="button" onClick={onSave} disabled={!canSave || saving}>
        <SaveIcon /> {saving ? "Зберігаємо…" : "Зберегти зміни"}
      </button>
    </div>
  );
}
