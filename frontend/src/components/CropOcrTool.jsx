import React, { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { Check, Crop, Languages, ScanLine, Sparkles, X } from 'lucide-react';
import { uid, stripTrailingTime } from '../lib/chatParser.js';
import { sha256 } from '../lib/fileIntegrity.js';
import { detectBubbleCandidates } from '../lib/bubbleDetection.js';

const LANGUAGES = [
  { value: 'eng', label: 'English' },
  { value: 'hin', label: 'Hindi' },
  { value: 'tel', label: 'Telugu' },
  { value: 'eng+hin', label: 'English + Hindi' },
  { value: 'eng+tel', label: 'English + Telugu' },
];

export default function CropOcrTool({ item, onMessage, onClose, preferredOcrLanguage = 'eng' }) {
  const imageRef = useRef(null);
  const displayRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: item.imageWidth || 0, height: item.imageHeight || 0 });
  const [selection, setSelection] = useState(null);
  const [pointerStart, setPointerStart] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [side, setSide] = useState('them');
  const [language, setLanguage] = useState(preferredOcrLanguage);
  const [screenshotDate, setScreenshotDate] = useState('');
  const [mode, setMode] = useState('manual');
  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState('Draw a box around one message, then run OCR on that crop.');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setLanguage(preferredOcrLanguage); }, [preferredOcrLanguage]);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth) setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
  }, [item.url]);

  function getNaturalPoint(event) {
    const image = imageRef.current;
    const rect = image.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(image.naturalWidth, (event.clientX - rect.left) / rect.width * image.naturalWidth)),
      y: Math.max(0, Math.min(image.naturalHeight, (event.clientY - rect.top) / rect.height * image.naturalHeight)),
    };
  }

  function onPointerDown(event) {
    if (mode !== 'manual') return;
    event.preventDefault();
    const point = getNaturalPoint(event);
    setPointerStart(point);
    setSelection({ x0: point.x, y0: point.y, x1: point.x, y1: point.y });
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event) {
    if (!dragging || !pointerStart) return;
    const point = getNaturalPoint(event);
    setSelection({ x0: Math.min(pointerStart.x, point.x), y0: Math.min(pointerStart.y, point.y), x1: Math.max(pointerStart.x, point.x), y1: Math.max(pointerStart.y, point.y) });
  }
  function onPointerUp() {
    setDragging(false);
    setPointerStart(null);
    setSelection((current) => current && (current.x1-current.x0 < 8 || current.y1-current.y0 < 8) ? null : current);
  }

  async function detectAutoBubbles() {
    setError(''); setStatus('Looking for message-bubble candidates…');
    try {
      const img = imageRef.current;
      if (!img?.naturalWidth) throw new Error('Wait for the screenshot to finish loading.');
      const scale = Math.min(1, 1000 / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const found = detectBubbleCandidates(context.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height)
        .map((candidate) => ({ ...candidate, x0: candidate.x0 / scale, x1: candidate.x1 / scale, y0: candidate.y0 / scale, y1: candidate.y1 / scale }));
      setCandidates(found);
      setMode('auto');
      if (!found.length) setStatus('No likely bubbles found. Draw a box manually; auto-detection is only a helper.');
      else setStatus(`${found.length} bubble candidate(s) found. Select and verify each box before OCR.`);
    } catch (e) { setError(e.message || 'Could not analyse this image.'); setStatus('Auto-detection failed. Use manual box selection.'); }
  }

  function chooseCandidate(candidate) {
    setSelection({ x0: candidate.x0, y0: candidate.y0, x1: candidate.x1, y1: candidate.y1 });
    setSide(candidate.side);
  }

  async function ocrSelection() {
    setError('');
    if (!selection || selection.x1 - selection.x0 < 8 || selection.y1 - selection.y0 < 8) {
      setError('Draw or select a message box first.'); return;
    }
    setBusy(true); setStatus('Loading local OCR engine…');
    let worker;
    try {
      const img = imageRef.current;
      const x = Math.round(selection.x0), y = Math.round(selection.y0);
      const width = Math.max(1, Math.round(selection.x1 - selection.x0));
      const height = Math.max(1, Math.round(selection.y1 - selection.y0));
      const crop = document.createElement('canvas');
      crop.width = width; crop.height = height;
      const ctx = crop.getContext('2d');
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      worker = await createWorker(language, 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
        workerBlobURL: false,
        gzip: true,
        logger: (message) => { if (message.status === 'recognizing text') setStatus(`Reading crop… ${Math.round((message.progress || 0) * 100)}%`); },
      });
      const result = await worker.recognize(crop);
      const cleaned = stripTrailingTime(result?.data?.text || '');
      const text = cleaned.text;
      if (!text) throw new Error('No readable text in this crop. Make the box tighter or try a sharper image.');
      const exactBox = { x0: x, y0: y, x1: x + width, y1: y + height };
      const cropBlob = await new Promise((resolve, reject) => crop.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the exhibit crop.')), 'image/png'));
      const cropHash = await sha256(cropBlob);
      onMessage({
        id: uid('msg'), time: cleaned.time, screenshotDate, sender: side === 'me' ? 'Me' : 'Other person', text,
        verified: false, sourceType: 'ocr_crop', evidenceStrength: 'screenshot_crop', captureMethod: 'manual_crop', evidenceId: item.id, sourceBox: exactBox,
        sourceImageName: item.name, sourceFileHash: item.hash, cropHash, cropDataUrl: crop.toDataURL('image/png'), side,
      });
      setStatus('Crop added to the transcript. Draw another box to add the next message.');
      setSelection(null);
      setCandidates((prev) => prev.filter((candidate) => !sameBox(candidate, selection)));
    } catch (e) {
      setError(e.message || 'OCR failed. Use a smaller crop or review the image manually.');
      setStatus('OCR did not finish. Your existing transcript was not changed.');
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      setBusy(false);
    }
  }

  async function ocrAllCandidates() {
    setError('');
    if (!candidates.length) {
      setError('No bubble candidates are waiting. Run auto-detect or draw a box manually.');
      return;
    }
    // Keep batch size bounded so a noisy screenshot cannot freeze the tab or run for too long.
    const pending = candidates.slice(0, 25);
    setBusy(true);
    setStatus(`Starting local OCR for ${pending.length} detected bubble(s)…`);
    let worker;
    let added = 0;
    let failed = 0;
    const processedBoxes = [];
    try {
      const img = imageRef.current;
      worker = await createWorker(language, 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
        workerBlobURL: false,
        gzip: true,
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setStatus(`Reading detected bubble ${added + failed + 1}/${pending.length}… ${Math.round((message.progress || 0) * 100)}%`);
          }
        },
      });
      for (let index = 0; index < pending.length; index += 1) {
        const candidate = pending[index];
        const x = Math.max(0, Math.round(candidate.x0));
        const y = Math.max(0, Math.round(candidate.y0));
        const width = Math.max(1, Math.min(img.naturalWidth - x, Math.round(candidate.x1 - candidate.x0)));
        const height = Math.max(1, Math.min(img.naturalHeight - y, Math.round(candidate.y1 - candidate.y0)));
        try {
          const crop = document.createElement('canvas');
          crop.width = width;
          crop.height = height;
          const context = crop.getContext('2d');
          context.drawImage(img, x, y, width, height, 0, 0, width, height);
          const result = await worker.recognize(crop);
          const cleaned = stripTrailingTime(result?.data?.text || '');
          const text = cleaned.text;
          if (!text) {
            failed += 1;
            continue;
          }
          const sourceBox = { x0: x, y0: y, x1: x + width, y1: y + height };
          const cropBlob = await new Promise((resolve, reject) => crop.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create exhibit crop.')), 'image/png'));
          const cropHash = await sha256(cropBlob);
          onMessage({
            id: uid('msg'), time: cleaned.time, screenshotDate, sender: candidate.side === 'me' ? 'Me' : 'Other person', text,
            verified: false, sourceType: 'ocr_crop', evidenceStrength: 'screenshot_crop', captureMethod: 'auto_crop', evidenceId: item.id, sourceBox,
            sourceImageName: item.name, sourceFileHash: item.hash, cropHash, cropDataUrl: crop.toDataURL('image/png'), side: candidate.side,
          });
          processedBoxes.push(candidate);
          added += 1;
        } catch {
          failed += 1;
        }
      }
      setCandidates((previous) => previous.filter((candidate) => !processedBoxes.some((box) => sameBox(box, candidate))));
      setSelection(null);
      const capped = candidates.length > 25 ? ` First 25 of ${candidates.length} candidates were processed; run the remainder separately.` : '';
      setStatus(`${added} message(s) appended to the transcript.${failed ? ` ${failed} crop(s) had no readable text and remain for manual review.` : ''}${capped}`);
      if (!added) setError('No readable text was found in the selected candidates. Draw tighter boxes or use manual selection.');
    } catch (e) {
      setError(e.message || 'Local OCR could not start. Use manual box selection or check the local OCR assets.');
      setStatus('OCR stopped. Already-added messages remain in the transcript.');
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      setBusy(false);
    }
  }

  const displayBox = selection && dimensions.width && dimensions.height ? {
    left: `${selection.x0 / dimensions.width * 100}%`, top: `${selection.y0 / dimensions.height * 100}%`,
    width: `${(selection.x1 - selection.x0) / dimensions.width * 100}%`, height: `${(selection.y1 - selection.y0) / dimensions.height * 100}%`,
  } : null;

  return <div className="crop-modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <header className="crop-modal-head"><div><span className="eyebrow">SCREENSHOT OCR</span><h2 id="crop-title">Select one message</h2><p>OCR only reads the box you choose. The screenshot remains in this browser.</p></div><button className="icon-button" onClick={onClose} aria-label="Close crop tool" disabled={busy}><X size={16}/></button></header>
      <div className="crop-toolbar"><div className="crop-mode-switch"><button className={mode === 'manual' ? 'active' : ''} onClick={() => { setMode('manual'); setSelection(null); }}>Draw box</button><button className={mode === 'auto' ? 'active' : ''} onClick={detectAutoBubbles} disabled={busy}><Sparkles size={13}/> Auto-detect · beta</button></div><label className="crop-language"><Languages size={14}/><span>OCR language</span><select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={busy}>{LANGUAGES.map((lang) => <option value={lang.value} key={lang.value}>{lang.label}</option>)}</select></label></div>
      <div className="crop-date-row"><label>Screenshot date (if known)<input type="date" value={screenshotDate} onChange={(e) => setScreenshotDate(e.target.value)} disabled={busy}/></label><small>Used with the extracted clock time to order the timeline. Leave today only if that is correct.</small></div>
      <div className="crop-role-row"><span>Whose message is this?</span><div className="segmented-control"><button className={side === 'them' ? 'active' : ''} onClick={() => setSide('them')} disabled={busy}>Other person · left</button><button className={side === 'me' ? 'active' : ''} onClick={() => setSide('me')} disabled={busy}>Me · right</button></div></div>
      <div className="crop-image-scroll"><div className="crop-image-wrap" ref={displayRef}>
        <img ref={imageRef} src={item.url} alt={`Select message area from ${item.name}`} onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} draggable="false" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} className={mode === 'manual' ? 'crop-draw-active' : ''}/>
        {displayBox && <div className="crop-selection-box" style={displayBox}><span>{side === 'me' ? 'ME' : 'THEM'}</span></div>}
        {mode === 'auto' && candidates.map((candidate) => <button key={candidate.id} className={`auto-candidate-box ${sameBox(candidate, selection) ? 'active' : ''}`} style={{ left: `${candidate.x0 / dimensions.width * 100}%`, top: `${candidate.y0 / dimensions.height * 100}%`, width: `${(candidate.x1-candidate.x0) / dimensions.width * 100}%`, height: `${(candidate.y1-candidate.y0) / dimensions.height * 100}%` }} onClick={() => chooseCandidate(candidate)} aria-label={`Select bubble candidate ${candidate.id}, ${candidate.side === 'me' ? 'Me' : 'other person'}`}><span>{candidate.side === 'me' ? 'ME' : 'THEM'}</span></button>)}
      </div></div>
      <p className="crop-status" role="status">{status}</p>{error && <p className="crop-error" role="alert">{error}</p>}
      <footer className="crop-modal-foot"><small>Box: {selection ? `${Math.round(selection.x1-selection.x0)} × ${Math.round(selection.y1-selection.y0)} px · exact source coordinates retained` : 'No box selected'}{mode === 'auto' ? ` · ${candidates.length} candidate(s) remain; auto-detection is experimental.` : ''}</small><div className="crop-footer-actions">{mode === 'auto' && <button className="button button-outline" onClick={ocrAllCandidates} disabled={busy || candidates.length === 0}><ScanLine size={14}/> OCR detected bubbles ({Math.min(candidates.length, 25)})</button>}<button className="button button-primary" onClick={ocrSelection} disabled={busy || !selection}>{busy ? 'Reading…' : <><ScanLine size={14}/> OCR this message</>}<Check size={14}/></button></div></footer>
    </section>
  </div>;
}

function sameBox(a, b) {
  return Boolean(a && b && Math.abs(a.x0 - b.x0) < 5 && Math.abs(a.y0 - b.y0) < 5 && Math.abs(a.x1 - b.x1) < 5 && Math.abs(a.y1 - b.y1) < 5);
}
