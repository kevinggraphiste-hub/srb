import { EVENT_TEMPLATES, type EventTemplateId } from '../data/event-templates';

interface EventTemplatePickerProps {
  open: boolean;
  tileX: number;
  tileY: number;
  onClose: () => void;
  onPick: (templateId: EventTemplateId) => void;
}

export function EventTemplatePicker({
  open,
  tileX,
  tileY,
  onClose,
  onPick,
}: EventTemplatePickerProps) {
  if (!open) return null;
  return (
    <div className="tpl-backdrop" onClick={onClose} role="presentation">
      <div className="tpl-dialog" onClick={(e) => e.stopPropagation()} role="dialog">
        <header className="tpl-header">
          <h2>Nouvel event</h2>
          <span className="muted">
            Tile ({tileX}, {tileY}) · choisis un modèle de départ
          </span>
        </header>
        <div className="tpl-grid">
          {EVENT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="tpl-card"
              onClick={() => onPick(tpl.id)}
            >
              <span className="tpl-icon" aria-hidden="true">
                {tpl.icon}
              </span>
              <span className="tpl-label">{tpl.label}</span>
              <span className="tpl-desc">{tpl.description}</span>
            </button>
          ))}
        </div>
        <footer className="tpl-footer">
          <button type="button" onClick={onClose}>
            Annuler
          </button>
        </footer>
      </div>
    </div>
  );
}
