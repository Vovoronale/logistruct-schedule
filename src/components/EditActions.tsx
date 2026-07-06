import { PlusIcon, SaveIcon, UndoIcon, XIcon } from "./Icons";

interface EditActionsProps {
  dirty: boolean;
  canSave: boolean;
  canUndo: boolean;
  saving: boolean;
  error?: string;
  onAdd: () => void;
  onManageAssignees: () => void;
  onUndo: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EditActions({ dirty, canSave, canUndo, saving, error, onAdd, onManageAssignees, onUndo, onSave, onCancel }: EditActionsProps) {
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
      <button className="button secondary" type="button" onClick={onUndo} disabled={!canUndo}>
        <UndoIcon /> Відмінити операцію
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
