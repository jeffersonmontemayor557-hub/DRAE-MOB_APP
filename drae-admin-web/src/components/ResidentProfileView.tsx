import { formatPhilippineMobileDisplay } from '../lib/phoneFormat';
import { formatDate } from '../lib/formatDate';
import type { ResidentWithReadiness } from '../types';

type Props = {
  resident: ResidentWithReadiness;
  onClose: () => void;
  onEdit: () => void;
};

function dash(s: string | null | undefined) {
  const t = (s ?? '').trim();
  return t ? t : '—';
}

export function ResidentProfileView({ resident: row, onClose, onEdit }: Props) {
  return (
    <div className="resident-profile-view">
      <div className="resident-profile-view-hero">
        {row.avatar_url ? (
          <img
            className="resident-profile-view-avatar"
            src={row.avatar_url}
            alt={row.full_name ? `Photo of ${row.full_name}` : ''}
          />
        ) : (
          <div className="resident-profile-view-avatar resident-profile-view-avatar--placeholder" aria-hidden />
        )}
        <div className="resident-profile-view-hero-text">
          <h4 className="resident-profile-view-name">{dash(row.full_name)}</h4>
          <div className="resident-profile-view-badges">
            <span className="resident-profile-view-kpi">
              Readiness{' '}
              <strong>{row.readiness_score != null ? `${row.readiness_score}%` : '—'}</strong>
            </span>
            <span className={row.go_bag_ready ? 'pill-yes' : 'pill-no'}>
              Go-bag: {row.go_bag_ready ? 'Yes' : 'No'}
            </span>
            <span className={row.user_id ? 'pill-yes' : 'pill-no'}>
              App login: {row.user_id ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      <div className="resident-detail-grid resident-profile-view-grid">
        <div className="resident-detail-item resident-detail-item--wide">
          <span className="resident-detail-label">Address</span>
          <span className="resident-detail-value">{dash(row.address)}</span>
        </div>
        <div className="resident-detail-item">
          <span className="resident-detail-label">Email</span>
          <span className="resident-detail-value">{dash(row.email)}</span>
        </div>
        <div className="resident-detail-item">
          <span className="resident-detail-label">Phone</span>
          <span className="resident-detail-value">
            {row.contact_number ? formatPhilippineMobileDisplay(row.contact_number) : '—'}
          </span>
        </div>
        <div className="resident-detail-item">
          <span className="resident-detail-label">Sex</span>
          <span className="resident-detail-value">{dash(row.gender)}</span>
        </div>
        <div className="resident-detail-item">
          <span className="resident-detail-label">Age</span>
          <span className="resident-detail-value">{row.age != null ? String(row.age) : '—'}</span>
        </div>
        <div className="resident-detail-item">
          <span className="resident-detail-label">Emergency contact</span>
          <span className="resident-detail-value">{dash(row.contact_person)}</span>
        </div>
        <div className="resident-detail-item">
          <span className="resident-detail-label">Emergency phone</span>
          <span className="resident-detail-value">
            {row.contact_person_number
              ? formatPhilippineMobileDisplay(row.contact_person_number)
              : '—'}
          </span>
        </div>
        <div className="resident-detail-item resident-detail-item--wide">
          <span className="resident-detail-label">Readiness last updated</span>
          <span className="resident-detail-value">
            {row.readiness_updated_at ? formatDate(row.readiness_updated_at) : '—'}
          </span>
        </div>
      </div>

      <div className="crud-actions resident-profile-view-actions">
        <button type="button" className="action-button secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="action-button" onClick={onEdit}>
          Edit resident
        </button>
      </div>
    </div>
  );
}
