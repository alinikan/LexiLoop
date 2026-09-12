'use client';
import { useState } from 'react';
import { demoMode } from '@/lib/config';
import { cambridgeLink, type DictionaryResult } from '@/lib/dictionary/types';
export function CambridgeSection({ word }: { word: string }) {
  const [result, setResult] = useState<DictionaryResult | null>(null),
    [busy, setBusy] = useState(false);
  async function lookup() {
    setBusy(true);
    try {
      const response = await fetch('/api/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error();
      setResult(await response.json());
    } catch {
      setResult({
        status: 'unavailable',
        message:
          'Cambridge lookup is unavailable. Open its website below; your lesson is still here.',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="cambridge-section">
      <h3>Cambridge Dictionary</h3>
      <p>Check an independent dictionary reference alongside your lesson.</p>
      {!demoMode && (
        <button className="button secondary" disabled={busy} onClick={lookup}>
          {busy ? 'Looking up…' : 'Look up in Cambridge'}
        </button>
      )}
      {result?.status === 'available' ? (
        <>
          <p>Cambridge Dictionary · {result.entry.entryLabel}</p>
          <iframe
            className="cambridge-frame"
            title={`Cambridge Dictionary: ${word}`}
            sandbox=""
            referrerPolicy="no-referrer"
            srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://dictionary.cambridge.org; media-src https://dictionary.cambridge.org; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{font:16px/1.6 system-ui;padding:12px;overflow-wrap:anywhere;color:#20243d}img{max-width:100%}</style></head><body>${result.entry.entryContent}</body></html>`}
          />
          {result.pronunciations?.map((audio) => (
            <label key={audio.pronunciationUrl}>
              {audio.lang === 'uk' ? 'British pronunciation' : 'American pronunciation'}
              <audio
                controls
                preload="none"
                src={audio.pronunciationUrl}
                style={{ width: '100%' }}
              />
            </label>
          ))}
          {!result.pronunciations?.length && (
            <p className="tiny">
              Cambridge audio is not available here. The separate lesson pronunciation button uses
              your device’s voice.
            </p>
          )}
          <p className="tiny">
            Cambridge’s first matching entry is shown in full. Pronunciation and senses appear as
            supplied; some entries omit them. For alternative entries, use the dictionary website.
            Content © Cambridge University Press & Assessment; additional notices in the entry
            apply.
          </p>
          <a
            className="text-link"
            href={result.entry.entryUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View this entry on Cambridge ↗
          </a>
        </>
      ) : (
        <>
          {result && <p role="status">{result.message}</p>}
          <a
            className="text-link"
            href={cambridgeLink(word)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Cambridge Dictionary ↗
          </a>
        </>
      )}
    </section>
  );
}
