interface ScheduleModesProps {
  analysisActive: boolean;
  onClearAnalysis: () => void;
}

export function ScheduleModes({
  analysisActive,
  onClearAnalysis,
}: ScheduleModesProps) {
  return analysisActive ? (
    <div className="schedule-modes dependency-analysis-legend" role="status">
      <strong>Ланцюжок залежностей</strong>
      <span className="analysis-key predecessor-key">Попередники</span>
      <span className="analysis-key selected-key">Вибрана робота</span>
      <span className="analysis-key successor-key">Наступники</span>
      <button className="button ghost" type="button" onClick={onClearAnalysis}>
        Очистити підсвічування
      </button>
    </div>
  ) : null;
}
