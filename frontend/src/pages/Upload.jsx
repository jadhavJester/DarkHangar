import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Panel from '../components/Panel';

const API = window.location.origin.includes('5173') ? 'http://localhost:8000' : '';

const IS_DEMO_MODE = !window.location.origin.includes('localhost') && 
                     !window.location.origin.includes('127.0.0.1') && 
                     !window.location.origin.includes('8765');

export default function Upload({ onUploadSuccess }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single');
  
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);
  const [warnings, setWarnings]   = useState([]);
  const [result, setResult]       = useState(null);

  const [folderPath, setFolderPath] = useState('D:\\SILVER Wing LOGS\\APM\\LOGS');
  const [scanning, setScanning]     = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError]   = useState(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (IS_DEMO_MODE) {
      setError("Uploads disabled in demo mode. Download the desktop app to analyze your own logs.");
      return;
    }
    if (!file.name.toLowerCase().endsWith('.bin')) {
      setError("Only .BIN DataFlash log files are supported.");
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
          setProgress(Math.round((e.loaded / e.total) * 40));
        },
      });

      setProgress(100);
      setResult(res.data);
      setWarnings(res.data.warnings || []);
      onUploadSuccess?.();
      setTimeout(() => navigate(`/flights/${res.data.id}`), 1200);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setUploading(false);
    }
  }, [navigate, onUploadSuccess]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const onInputChange = (e) => handleFile(e.target.files[0]);

  const handleScanFolder = async () => {
    if (IS_DEMO_MODE) {
      setScanError("Directory scanning requires the desktop app.");
      return;
    }
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await axios.post(`${API}/flights/scan-folder`, {
        folder_path: folderPath, skip_existing: true
      });
      if (res.data.error) setScanError(res.data.error);
      else { setScanResult(res.data); onUploadSuccess?.(); }
    } catch (e) {
      setScanError(e?.response?.data?.detail || e.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
         style={{ background: 'var(--bg-primary)' }}>

      <div className="mb-6 text-center">
        <h1 className="dh-title text-3xl mb-1">Load Flight Logs</h1>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>ArduPilot DataFlash .BIN format</p>
      </div>

      {IS_DEMO_MODE && (
        <div className="mb-4 px-4 py-2 text-center" style={{
          background: 'rgba(242,195,15,0.05)', border: '1px solid rgba(242,195,15,0.2)', borderRadius: 4,
        }}>
          <span className="dh-lcd label" style={{ fontSize: '0.55rem', color: 'var(--accent)' }}>
            Demo Mode — Download the desktop app to analyze your own logs
          </span>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <button onClick={() => setActiveTab('single')}
          className={`dh-btn-flat px-4 py-1.5 ${activeTab === 'single' ? 'active' : ''}`}>
          Upload File
        </button>
        <button onClick={() => setActiveTab('folder')}
          className={`dh-btn-flat px-4 py-1.5 ${activeTab === 'folder' ? 'active' : ''}`}>
          Import Folder
        </button>
        <button onClick={() => navigate('/history')}
          className="dh-btn-flat px-4 py-1.5">← History</button>
      </div>

      {activeTab === 'single' ? (
        <>
          <div className="w-full max-w-lg p-12 flex flex-col items-center gap-4 cursor-pointer"
            style={{
              border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--grid-line)'}`,
              borderRadius: 4,
              background: dragOver ? 'rgba(242,195,15,0.04)' : 'transparent',
              transition: 'all 0.2s',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('bin-file-input').click()}
          >
            <input id="bin-file-input" type="file" accept=".bin,.BIN" className="hidden" onChange={onInputChange} />

            {!uploading && !result && (
              <>
                <div style={{ fontSize: '2rem', opacity: dragOver ? 1 : 0.4, color: 'var(--accent)' }}>⤴</div>
                <div className="text-center">
                  <p className="dh-title" style={{ fontSize: '1rem', marginBottom: 4 }}>
                    {dragOver ? 'Drop to upload' : 'Drag & drop a .BIN log'}
                  </p>
                  <p className="dh-lcd label">or click to browse</p>
                </div>
              </>
            )}

            {uploading && (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="dh-title" style={{ fontSize: '0.9rem' }}>Parsing flight data...</div>
                <VUMeter progress={progress} />
                <p className="dh-lcd label">{progress < 40 ? 'Uploading...' : 'Extracting telemetry...'}</p>
              </div>
            )}

            {result && !uploading && (
              <div className="flex flex-col items-center gap-2">
                <div style={{ color: 'var(--healthy-green)', fontSize: '1.5rem' }}>✓</div>
                <div className="dh-title" style={{ fontSize: '0.9rem', color: 'var(--healthy-green)' }}>
                  Log Parsed — #{result.id}
                </div>
                <div className="dh-lcd label">Redirecting to dashboard...</div>
              </div>
            )}
          </div>

          {error && (
            <div className="w-full max-w-lg mt-4 p-3" style={{
              borderLeft: '3px solid var(--needle-red)', background: 'var(--bg-panel)', borderRadius: 4,
            }}>
              <div className="dh-lcd label" style={{ color: 'var(--needle-red)', marginBottom: 2 }}>Error</div>
              <div className="dh-lcd" style={{ fontSize: '0.75rem' }}>{error}</div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="w-full max-w-lg mt-3 p-3" style={{
              borderLeft: '3px solid var(--accent)', background: 'var(--bg-panel)', borderRadius: 4,
            }}>
              <div className="dh-lcd label" style={{ color: 'var(--accent)', marginBottom: 4 }}>Warnings</div>
              {warnings.map((w, i) => (
                <div key={i} className="dh-lcd" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{w}</div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="w-full max-w-lg">
          <Panel className="p-4">
            <label className="dh-lcd label block mb-2">Local Directory Path</label>
            <div className="flex gap-2 mb-3">
              <input type="text" value={folderPath} onChange={(e) => setFolderPath(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm font-mono"
                style={{
                  background: 'var(--bg-panel)', border: '1px solid var(--grid-line)', borderRadius: 2,
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              <button onClick={handleScanFolder} disabled={scanning}
                className="dh-btn-flat px-4 py-1.5 active font-bold disabled:opacity-50">
                {scanning ? 'Scanning...' : 'Scan'}
              </button>
            </div>

            {scanning && (
              <div className="flex flex-col items-center py-6 gap-3">
                <span className="dh-lcd label animate-pulse">Scanning folder...</span>
                <div className="flex gap-2 justify-center">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="vu-bar" style={{
                      height: 24, background: 'var(--accent)', animationDelay: `${i * 0.15}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {scanError && (
              <div className="p-3" style={{ borderLeft: '3px solid var(--needle-red)', background: 'var(--bg-primary)', borderRadius: 2, marginTop: 8 }}>
                <div className="dh-lcd label" style={{ color: 'var(--needle-red)', marginBottom: 2 }}>Error</div>
                <div className="dh-lcd" style={{ fontSize: '0.75rem' }}>{scanError}</div>
              </div>
            )}

            {scanResult && (
              <>
                <div className="flex justify-between items-center p-2 mb-2" style={{
                  background: 'var(--bg-primary)', border: '1px solid var(--grid-line)', borderRadius: 2,
                }}>
                  <div className="flex gap-3">
                    <div className="text-center">
                      <span className="dh-lcd label block">Imported</span>
                      <span className="dh-lcd" style={{ fontSize: '1rem', color: 'var(--healthy-green)' }}>{scanResult.summary.imported}</span>
                    </div>
                    <div className="text-center px-3" style={{ borderLeft: '1px solid var(--grid-line)' }}>
                      <span className="dh-lcd label block">Skipped</span>
                      <span className="dh-lcd" style={{ fontSize: '1rem', opacity: 0.6 }}>{scanResult.summary.skipped}</span>
                    </div>
                    <div className="text-center" style={{ borderLeft: '1px solid var(--grid-line)', paddingLeft: 12 }}>
                      <span className="dh-lcd label block">Errors</span>
                      <span className="dh-lcd" style={{ fontSize: '1rem', color: 'var(--needle-red)' }}>{scanResult.summary.errors}</span>
                    </div>
                  </div>
                  <button onClick={() => navigate('/history')}
                    className="dh-subtitle" style={{ fontSize: '0.55rem', cursor: 'pointer' }}>
                    View →
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto" style={{ border: '1px solid var(--grid-line)', borderRadius: 2 }}>
                  {scanResult.results.map((res, i) => (
                    <div key={i} className="flex justify-between items-center text-xs px-2 py-1"
                      style={{ borderBottom: i < scanResult.results.length - 1 ? '1px solid var(--grid-line)' : 'none' }}>
                      <span className="truncate" style={{ color: 'var(--text-dim)', maxWidth: 280 }}>{res.filename}</span>
                      <span style={{
                        color: res.status === 'imported' ? 'var(--healthy-green)' :
                               res.status === 'error' ? 'var(--needle-red)' : 'var(--text-dim)',
                        fontSize: '0.5rem', fontFamily: 'var(--font-ui)', letterSpacing: '0.08em',
                      }}>
                        {res.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </div>
      )}

      <p className="mt-6 text-xs" style={{ color: 'var(--text-dim)' }}>
        ArduPilot DataFlash logs (.BIN) · Build your flight history
      </p>
    </div>
  );
}

function VUMeter({ progress }) {
  const bars = 16;
  return (
    <div className="flex items-end gap-1" style={{ height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const barPct = (i + 1) / bars;
        const active = barPct <= progress / 100;
        const color = barPct > 0.85 ? 'var(--needle-red)'
          : barPct > 0.6 ? 'var(--accent)'
          : 'var(--healthy-green)';
        return (
          <div key={i} className="vu-bar" style={{
            height: `${24 + (i / bars) * 60}%`,
            background: active ? color : 'var(--grid-line)',
            animationDelay: `${i * 0.04}s`,
            animationPlayState: active ? 'running' : 'paused',
          }} />
        );
      })}
    </div>
  );
}
