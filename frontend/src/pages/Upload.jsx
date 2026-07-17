import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Panel from '../components/Panel';

const API = window.location.origin.includes('5173') ? 'http://localhost:8000' : '';

const ERRORS = {
  NO_GPS: 'No valid GPS data found in log',
  CORRUPT: 'Could not parse log',
  UNSUPPORTED: 'Only .BIN DataFlash log files are supported',
};

export default function Upload({ onUploadSuccess }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'folder'
  
  // Single upload state
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);
  const [warnings, setWarnings]   = useState([]);
  const [result, setResult]       = useState(null);

  // Folder scan state
  const [folderPath, setFolderPath] = useState('D:\\SILVER Wing LOGS\\APM\\LOGS');
  const [scanning, setScanning]     = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError]   = useState(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.bin')) {
      setError(ERRORS.UNSUPPORTED);
      return;
    }

    setError(null);
    setWarnings([]);
    setResult(null);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API}/flights/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 40)); // Upload = 0–40%
        },
      });

      setProgress(100);
      setResult(res.data);
      setWarnings(res.data.warnings || []);
      onUploadSuccess?.();

      // Navigate to dashboard after short delay
      setTimeout(() => navigate(`/flights/${res.data.id}`), 1200);
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message;
      setError(detail);
    } finally {
      setUploading(false);
    }
  }, [navigate, onUploadSuccess]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const onInputChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const handleScanFolder = async () => {
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await axios.post(`${API}/flights/scan-folder`, {
        folder_path: folderPath,
        skip_existing: true
      });
      if (res.data.error) {
        setScanError(res.data.error);
      } else {
        setScanResult(res.data);
        onUploadSuccess?.();
      }
    } catch (e) {
      setScanError(e?.response?.data?.detail || e.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8"
         style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="dh-subtitle mb-2">Dark Hangar</div>
        <h1 className="dh-title text-4xl mb-2">Load Flight Logs</h1>
        <p className="text-sm" style={{ color: 'var(--text-dim)', fontFamily: '"Share Tech Mono"' }}>
          ArduPilot DataFlash .BIN format
        </p>
      </div>

      {/* Navigation Buttons for Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('single')}
          className={`dh-panel px-6 py-2 dh-subtitle transition-all ${activeTab === 'single' ? 'shadow-bat-glow-strong text-dh-accent' : 'opacity-65'}`}
          style={{ cursor: 'pointer', fontSize: '0.75rem' }}
        >
          Single Log Upload
        </button>
        <button
          onClick={() => setActiveTab('folder')}
          className={`dh-panel px-6 py-2 dh-subtitle transition-all ${activeTab === 'folder' ? 'shadow-bat-glow-strong text-dh-accent' : 'opacity-65'}`}
          style={{ cursor: 'pointer', fontSize: '0.75rem' }}
        >
          Import Local Folder
        </button>
        <button
          onClick={() => navigate('/history')}
          className="dh-panel px-6 py-2 dh-subtitle opacity-50 hover:opacity-100 transition-all"
          style={{ cursor: 'pointer', fontSize: '0.75rem' }}
        >
          ← Flight History
        </button>
      </div>

      {activeTab === 'single' ? (
        <>
          {/* Upload Zone */}
          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''} w-full max-w-2xl p-16 flex flex-col items-center gap-6 cursor-pointer`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('bin-file-input').click()}
          >
            <input
              id="bin-file-input"
              type="file"
              accept=".bin,.BIN"
              className="hidden"
              onChange={onInputChange}
            />

            {!uploading && !result && (
              <>
                {/* Icon */}
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none"
                     style={{ opacity: dragOver ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                  <path d="M32 4C19 4 8 15 8 28c0 8 4 15 10 20H20l12-12 12 12h-2c6-5 10-12 10-20 0-13-11-24-20-24z"
                        fill="#f2c30f" fillOpacity="0.3"/>
                  <path d="M32 14v20M22 24l10-10 10 10" stroke="#f2c30f" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="18" y="46" width="28" height="4" rx="2" fill="#f2c30f" fillOpacity="0.4"/>
                </svg>

                <div className="text-center">
                  <p className="dh-title text-lg mb-2">
                    {dragOver ? 'Drop to upload' : 'Drag & drop your .BIN log'}
                  </p>
                  <p className="dh-lcd label">or click to browse</p>
                </div>
              </>
            )}

            {/* VU Meter Progress */}
            {uploading && (
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="dh-title text-lg">Parsing flight data…</div>
                <VUMeter progress={progress} />
                <p className="dh-lcd label">{progress < 40 ? 'Uploading…' : 'Extracting telemetry…'}</p>
              </div>
            )}

            {/* Success */}
            {result && !uploading && (
              <div className="flex flex-col items-center gap-3">
                <div style={{ color: 'var(--healthy-green)', fontSize: '2rem' }}>✓</div>
                <div className="dh-title text-lg" style={{ color: 'var(--healthy-green)' }}>
                  Log Parsed Successfully
                </div>
                <div className="dh-lcd label">
                  {result.filename} → #{result.id}
                </div>
                <div className="dh-lcd" style={{ fontSize: '0.7rem' }}>
                  Redirecting to dashboard…
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="dh-panel mt-6 p-4 w-full max-w-2xl"
                 style={{ borderLeft: '3px solid var(--needle-red)' }}>
              <div className="dh-lcd label" style={{ color: 'var(--needle-red)', marginBottom: 4 }}>
                Parse Error
              </div>
              <div className="dh-lcd" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                {error}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="dh-panel mt-4 p-4 w-full max-w-2xl"
                 style={{ borderLeft: '3px solid var(--accent-yellow)' }}>
              <div className="dh-lcd label" style={{ color: 'var(--accent-yellow)', marginBottom: 4 }}>
                Warnings
              </div>
              {warnings.map((w, i) => (
                <div key={i} className="dh-lcd" style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 2 }}>
                  ⚠ {w}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="w-full max-w-2xl">
          <Panel title="Scan & Bulk Import Flight Logs" className="p-6">
            <div className="flex flex-col gap-4">
              <div>
                <label className="dh-lcd label block mb-1">Local Directory Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    className="flex-1 bg-[#14181c] border border-[#2a2f36] px-3 py-2 text-[#e8ecf0] font-mono text-sm rounded-md focus:outline-none focus:border-[#f2c30f]"
                    placeholder="E.g. D:\SILVER Wing LOGS\APM\LOGS"
                  />
                  <button
                    onClick={handleScanFolder}
                    disabled={scanning}
                    className="dh-panel px-6 py-2 dh-subtitle bg-[#2a2f36] hover:bg-[#3a3f46] text-[#f2c30f] disabled:opacity-50"
                    style={{ cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    {scanning ? 'Scanning...' : 'Scan & Import'}
                  </button>
                </div>
              </div>

              {scanning && (
                <div className="flex flex-col items-center justify-center p-8 gap-4">
                  <span className="dh-lcd label animate-pulse">Processing Flight Logs...</span>
                  <div className="flex gap-2 justify-center">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="vu-bar" style={{
                        height: 32, background: 'var(--accent-yellow)',
                        animationDelay: `${i * 0.15}s`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {scanError && (
                <div className="dh-panel p-4" style={{ borderLeft: '3px solid var(--needle-red)' }}>
                  <div className="dh-lcd label" style={{ color: 'var(--needle-red)', marginBottom: 4 }}>Scan Error</div>
                  <div className="dh-lcd" style={{ fontSize: '0.8rem' }}>{scanError}</div>
                </div>
              )}

              {scanResult && (
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex justify-between items-center bg-[#0b0d10] p-3 rounded border border-[#2a2f36]">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <span className="dh-lcd label block" style={{ fontSize: '0.65rem' }}>Imported</span>
                        <span className="dh-lcd text-lg text-emerald-500 font-bold">{scanResult.summary.imported}</span>
                      </div>
                      <div className="text-center border-l border-[#2a2f36] pl-4">
                        <span className="dh-lcd label block" style={{ fontSize: '0.65rem' }}>Skipped</span>
                        <span className="dh-lcd text-lg text-gray-400 font-bold">{scanResult.summary.skipped}</span>
                      </div>
                      <div className="text-center border-l border-[#2a2f36] pl-4">
                        <span className="dh-lcd label block" style={{ fontSize: '0.65rem' }}>Errors</span>
                        <span className="dh-lcd text-lg text-rose-500 font-bold">{scanResult.summary.errors}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/history')}
                      className="dh-subtitle text-[#f2c30f]"
                      style={{ fontSize: '0.65rem', cursor: 'pointer' }}
                    >
                      View in Ledger →
                    </button>
                  </div>

                  {/* File List */}
                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1 border border-[#2a2f36] rounded p-2 bg-[#0b0d10]">
                    {scanResult.results.map((res, i) => (
                      <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-[#1c1e22]/50 last:border-0 font-mono">
                        <span className="text-gray-300 truncate max-w-xs">{res.filename}</span>
                        <div className="flex gap-2 items-center">
                          {res.status === 'imported' && (
                            <span className="text-emerald-500 px-1 rounded bg-emerald-950/40 text-[10px]">IMPORTED</span>
                          )}
                          {res.status === 'skipped' && (
                            <span className="text-gray-500 px-1 rounded bg-gray-900 text-[10px]">SKIPPED</span>
                          )}
                          {res.status === 'error' && (
                            <span className="text-rose-500 px-1 rounded bg-rose-950/40 text-[10px]">ERROR</span>
                          )}
                          {res.message && <span className="text-[10px] text-gray-500 max-w-[150px] truncate" title={res.message}>{res.message}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Bottom hint */}
      <p className="mt-8 text-xs" style={{ color: 'var(--text-dim)', fontFamily: '"Share Tech Mono"' }}>
        Supports ArduPilot DataFlash logs (00000001.BIN format) · Multiple uploads build your flight history
      </p>
    </div>
  );
}

function VUMeter({ progress }) {
  const bars = 16;
  return (
    <div className="flex items-end gap-1.5" style={{ height: 48 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const barPct = (i + 1) / bars;
        const active = barPct <= progress / 100;
        const color = barPct > 0.85 ? 'var(--needle-red)'
          : barPct > 0.6 ? 'var(--accent-yellow)'
          : 'var(--healthy-green)';
        return (
          <div
            key={i}
            className="vu-bar"
            style={{
              height: `${30 + (i / bars) * 70}%`,
              background: active ? color : 'var(--grid-line)',
              animationDelay: `${i * 0.04}s`,
              animationPlayState: active ? 'running' : 'paused',
            }}
          />
        );
      })}
    </div>
  );
}
