import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '@srb/types';

interface PreviewModalProps {
  project: Project;
  startMapId: string;
  playerUrl: string;
  onClose: () => void;
}

type PreviewStatus = 'probing' | 'connecting' | 'ready' | 'offline' | 'timeout';

const HANDSHAKE_TIMEOUT_MS = 6000;
const PLAYER_COMMAND = 'pnpm --filter @srb/player dev';

/**
 * Modal that embeds the player in an iframe and hands it the current project
 * via postMessage. The player boot sequence waits for this handshake before
 * Phaser starts, so timing between mount and iframe-ready is forgiving.
 *
 * A probe fetch runs before mounting the iframe: if the player dev server is
 * not reachable, we show an actionable help panel instead of a broken iframe.
 */
export function PreviewModal({ project, startMapId, playerUrl, onClose }: PreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<PreviewStatus>('probing');
  const [probeTick, setProbeTick] = useState(0);

  const probePlayer = useCallback(async () => {
    // no-cors fetch: a reachable dev server resolves (opaque response), a
    // down server rejects with TypeError. We only care which branch fires.
    try {
      await fetch(playerUrl, { mode: 'no-cors', cache: 'no-store' });
      return true;
    } catch {
      return false;
    }
  }, [playerUrl]);

  useEffect(() => {
    let cancelled = false;
    setStatus('probing');
    probePlayer().then((ok) => {
      if (cancelled) return;
      setStatus(ok ? 'connecting' : 'offline');
    });
    return () => {
      cancelled = true;
    };
  }, [probePlayer, probeTick]);

  useEffect(() => {
    if (status !== 'connecting') return;
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
      setStatus((s) => (s === 'connecting' ? 'timeout' : s));
    }, HANDSHAKE_TIMEOUT_MS);
    return () => {
      window.removeEventListener('message', handler);
      window.clearTimeout(timeout);
    };
  }, [status, project, startMapId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const retry = useCallback(() => {
    setProbeTick((t) => t + 1);
  }, []);

  const copyCommand = useCallback(() => {
    void navigator.clipboard?.writeText(PLAYER_COMMAND);
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <header className="preview-modal-header">
          <h3>Test du jeu</h3>
          <span className="preview-status">
            {status === 'probing' && '⏳ Vérification du player…'}
            {status === 'connecting' && '⏳ Connexion au player…'}
            {status === 'ready' && '● en cours'}
            {status === 'offline' && '⚠ Player hors ligne'}
            {status === 'timeout' && '⚠ Le player ne répond pas'}
          </span>
          <button type="button" onClick={onClose}>
            Fermer (Esc)
          </button>
        </header>

        {status === 'offline' ? (
          <OfflineHelp playerUrl={playerUrl} onRetry={retry} onCopy={copyCommand} />
        ) : (
          <iframe
            ref={iframeRef}
            src={status === 'probing' ? 'about:blank' : playerUrl}
            title="Aperçu SRB"
            width={640}
            height={480}
            className="preview-iframe"
            tabIndex={0}
            onMouseEnter={() => iframeRef.current?.contentWindow?.focus()}
          />
        )}

        {status === 'timeout' && (
          <div className="preview-timeout-hint">
            Le player est atteignable mais n&apos;a pas terminé le handshake.
            <button type="button" onClick={retry}>
              Réessayer
            </button>
          </div>
        )}

        <footer className="preview-modal-footer">
          <span>Flèches pour bouger · Espace/A pour interagir · ↑↓ pour naviguer les choix</span>
        </footer>
      </div>
    </div>
  );
}

interface OfflineHelpProps {
  playerUrl: string;
  onRetry: () => void;
  onCopy: () => void;
}

function OfflineHelp({ playerUrl, onRetry, onCopy }: OfflineHelpProps) {
  return (
    <div className="preview-offline">
      <div className="preview-offline-icon" aria-hidden="true">
        🔌
      </div>
      <h4>Le player dev server n&apos;est pas lancé</h4>
      <p>
        L&apos;aperçu charge le runtime du jeu depuis <code>{playerUrl}</code>. Il faut démarrer ce
        serveur dans un autre terminal.
      </p>
      <div className="preview-offline-command">
        <code>{PLAYER_COMMAND}</code>
        <button type="button" onClick={onCopy} title="Copier la commande">
          Copier
        </button>
      </div>
      <p className="preview-offline-alt">
        Tu peux aussi lancer <code>pnpm dev</code> à la racine du repo pour démarrer tous les
        serveurs (editor + player + api + gameserver + web) en un seul coup.
      </p>
      <div className="preview-offline-actions">
        <button type="button" onClick={onRetry} className="primary">
          Réessayer
        </button>
        <a
          href={playerUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="preview-offline-link"
        >
          Ouvrir dans un onglet ↗
        </a>
      </div>
    </div>
  );
}
