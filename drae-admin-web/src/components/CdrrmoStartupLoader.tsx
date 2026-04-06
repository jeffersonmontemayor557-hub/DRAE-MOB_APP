import cdrLogo from '../assets/cdr-logo.png';
import './CdrrmoStartupLoader.css';

export const STARTUP_LOADER_MS = 1500;

export default function CdrrmoStartupLoader() {
  return (
    <div className="cdrrmo-loader-root" role="status" aria-label="Loading">
      <div className="cdrrmo-spinner-wrap">
        <div className="cdrrmo-arc cdrrmo-arc-track" />
        <div className="cdrrmo-arc cdrrmo-arc-red" />
        <div className="cdrrmo-arc cdrrmo-arc-green" />
        <div className="cdrrmo-arc cdrrmo-arc-yellow" />
        <img className="cdrrmo-loader-logo" src={cdrLogo} alt="CDRRMO" />
      </div>
    </div>
  );
}
