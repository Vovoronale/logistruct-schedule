import { XIcon } from "./Icons";

export function Toast({ message, tone = "success", onClose }: { message: string; tone?: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`toast ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Закрити повідомлення"><XIcon /></button>
    </div>
  );
}
