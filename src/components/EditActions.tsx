import { PlusIcon, SaveIcon, XIcon } from "./Icons";

interface EditActionsProps {
  dirty: boolean;
  saving: boolean;
  onAdd: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EditActions({ dirty, saving, onAdd, onSave, onCancel }: EditActionsProps) {
  return (
    <div className="edit-actions">
      <div>
        <strong>Режим редагування</strong>
        <span>{dirty ? "Є незбережені зміни" : "Зміни відсутні"}</span>
      </div>
      <button className="button secondary" type="button" onClick={onAdd}>
        <PlusIcon /> Додати рядок
      </button>
      <button className="button ghost" type="button" onClick={onCancel}>
        <XIcon /> Скасувати
      </button>
      <button className="button primary" type="button" onClick={onSave} disabled={!dirty || saving}>
        <SaveIcon /> {saving ? "Зберігаємо…" : "Зберегти зміни"}
      </button>
    </div>
  );
}
