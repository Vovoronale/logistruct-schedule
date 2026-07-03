import { EditIcon, LogoutIcon, RefreshIcon } from "./Icons";

interface AppHeaderProps {
  updatedAt?: string;
  authenticated: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

function updatedLabel(value?: string): string {
  if (!value) return "Дані завантажуються";
  return `Оновлено ${new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

export function AppHeader({
  updatedAt,
  authenticated,
  isEditing,
  onEdit,
  onRefresh,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">L</div>
        <div>
          <h1>Графік випуску креслень</h1>
          <p>Конструктивні рішення · актуальний план</p>
        </div>
      </div>
      <div className="header-actions">
        <span className="updated-label">{updatedLabel(updatedAt)}</span>
        {!isEditing ? (
          <button className="button primary" type="button" onClick={onEdit}>
            <EditIcon />
            Редагувати
          </button>
        ) : null}
        <button className="button secondary" type="button" onClick={onRefresh}>
          <RefreshIcon />
          Оновити
        </button>
        {authenticated && !isEditing ? (
          <button className="icon-button" type="button" onClick={onLogout} aria-label="Вийти">
            <LogoutIcon />
          </button>
        ) : null}
      </div>
    </header>
  );
}
