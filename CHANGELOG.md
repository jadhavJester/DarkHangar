# Changelog

All notable changes to DarkHangar are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [2.0.0]

### Added

- FastAPI backend that parses ArduPilot DataFlash `.BIN` logs
  (pymavlink) into timeseries data, with derived flight metrics:
  distance, duration, energy, airspeed/altitude/battery stats, glide
  ratio, and vibration health.
- React + Vite frontend: instrument-panel dashboard, track maps,
  data inspection, multi-flight analysis, and MATLAB `.mat` / PDF
  exports.
- Backend test suite (pytest): parser value conversion, derived
  metrics including edge cases, `.mat` export round-trip, and API
  smoke tests.
- Developer documentation: backend and frontend READMEs and a
  Testing section in the main README.
