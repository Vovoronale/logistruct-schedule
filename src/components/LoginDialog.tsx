import { useEffect, useRef, useState } from "react";
import { LockIcon, XIcon } from "./Icons";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (password: string) => Promise<void>;
}

export function LoginDialog({ open, onClose, onLogin }: LoginDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onLogin(password);
      setPassword("");
      onClose();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Не вдалося увійти");
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="login-dialog" onCancel={onClose} onClose={onClose}>
      <button type="button" className="dialog-close" onClick={onClose} aria-label="Закрити">
        <XIcon />
      </button>
      <div className="dialog-icon"><LockIcon /></div>
      <h2>Вхід адміністратора</h2>
      <p>Введіть пароль, щоб змінювати графік.</p>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          <span>Пароль</span>
          <input
            autoFocus
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button primary full" type="submit" disabled={busy}>
          {busy ? "Перевіряємо…" : "Увійти"}
        </button>
      </form>
    </dialog>
  );
}
