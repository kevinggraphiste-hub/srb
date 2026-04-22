import { useEffect, useRef, useState } from 'react';
import type { Project } from '@srb/types';

interface PreviewModalProps {
  project: Project;
  startMapId: string;
  playerUrl: string;
  onClose: () => void;
}

/**
 * Modal that embeds the player in an iframe and hands it the current project
 * via postMessage. The player boot sequence waits for this handshake before
 * Phaser starts, so timing between mount and iframe-ready is forgiving.
 */
export function PreviewModal({ project, startMapId, playerUrl, onClose }: PreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting');

  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type !== 'srb:preview-ready') return;
      const target = iframeRef.current?.contentWindow;
      if (!target || target !== event.source) return;
      target.postMessage({ type: 'srb:preview-project', project, startMapId }, '*');
      setStatus('ready');
      // Keyboard events only fire inside whichever window has focus. Focus the
      // inner window (not just the iframe element) so arrow keys reach Phaser.
      requestAnimationFrame(() => target.focus());
    };
    window.addEventListener('message', handler);
    const timeout = window.setTimeout(() => {
      setStatus((s) => (s === 'connecting' ? 'error' : s));
    }, 6000);
    return () => {
      window.removeEventListener('message', handler);
      window.clearTimeout(timeout);
    };
  }, [project, startMapId]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <header className="preview-modal-header">
          <h3>Test du jeu</h3>
          <span className="preview-status">
            {status === 'connecting' && '⏳ Connexion au player…'}
            {status === 'ready' && '● en cours'}
            {status === 'error' &&
              '⚠ Le player n\'a pas répondu. Vérifie qu\'il tourne sur 5173.'}
          </span>
          <button type="button" onClick={onClose}>
            Fermer (Esc)
          </button>
        </header>
        <iframe
          ref={iframeRef}
          src={playerUrl}
          title="Aperçu SRB"
          width={640}
          height={480}
          className="preview-iframe"
          tabIndex={0}
          onMouseEnter={() => iframeRef.current?.contentWindow?.focus()}
        />
        <footer className="preview-modal-footer">
          <span>Flèches pour bouger · Espace/A pour interagir</span>
        </footer>
      </div>
    </div>
  );
}
