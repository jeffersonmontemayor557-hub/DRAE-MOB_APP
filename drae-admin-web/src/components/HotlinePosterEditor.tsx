import type { HotlinePosterBlock, HotlinePosterConfig, HotlinePosterFooterRow } from '../lib/hotlinePosterConfig';

type Props = {
  value: HotlinePosterConfig;
  onChange: (next: HotlinePosterConfig) => void;
  disabled?: boolean;
};

function updateBlockLinesFromText(block: HotlinePosterBlock, text: string): HotlinePosterBlock {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { ...block, lines: lines.length ? lines : [''] };
}

function ColumnBlocksEditor({
  title,
  blocks,
  onChange,
  disabled,
}: {
  title: string;
  blocks: HotlinePosterBlock[];
  onChange: (next: HotlinePosterBlock[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="hotline-poster-column">
      <h4 className="hotline-poster-column-title">{title}</h4>
      {blocks.map((block, bi) => (
        <div key={bi} className="hotline-poster-block card-ish">
          <label className="crud-field">
            <span>Section title</span>
            <input
              className="form-input"
              value={block.title}
              disabled={disabled}
              onChange={(e) => {
                const next = [...blocks];
                next[bi] = { ...block, title: e.target.value };
                onChange(next);
              }}
            />
          </label>
          <label className="crud-field">
            <span>Lines (one phone or note per line)</span>
            <textarea
              className="form-input hotline-poster-lines"
              rows={Math.min(12, Math.max(4, block.lines.length + 2))}
              value={block.lines.join('\n')}
              disabled={disabled}
              onChange={(e) => {
                const next = [...blocks];
                next[bi] = updateBlockLinesFromText(block, e.target.value);
                onChange(next);
              }}
            />
          </label>
          <button
            type="button"
            className="action-button secondary"
            disabled={disabled || blocks.length <= 1}
            onClick={() => onChange(blocks.filter((_, i) => i !== bi))}
          >
            Remove section
          </button>
        </div>
      ))}
      <button
        type="button"
        className="action-button secondary"
        disabled={disabled}
        onClick={() => onChange([...blocks, { title: 'NEW SECTION', lines: [''] }])}
      >
        Add section
      </button>
    </div>
  );
}

export function HotlinePosterEditor({ value, onChange, disabled }: Props) {
  const setFooter = (rows: HotlinePosterFooterRow[]) => onChange({ ...value, footer: rows });

  return (
    <div className="hotline-poster-editor">
      <label className="crud-field">
        <span>Header — office line</span>
        <input
          className="form-input"
          value={value.headerSubtitle}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, headerSubtitle: e.target.value })}
        />
      </label>
      <label className="crud-field">
        <span>Header — location</span>
        <input
          className="form-input"
          value={value.headerLocation}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, headerLocation: e.target.value })}
        />
      </label>
      <label className="crud-field">
        <span>Main title</span>
        <input
          className="form-input"
          value={value.mainTitle}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, mainTitle: e.target.value })}
        />
      </label>
      <label className="crud-field">
        <span>Tagalog reminder</span>
        <textarea
          className="form-input"
          rows={3}
          value={value.tagalogReminder}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, tagalogReminder: e.target.value })}
        />
      </label>

      <div className="hotline-poster-two-col">
        <ColumnBlocksEditor
          title="Left column"
          blocks={value.leftColumn}
          disabled={disabled}
          onChange={(leftColumn) => onChange({ ...value, leftColumn })}
        />
        <ColumnBlocksEditor
          title="Right column"
          blocks={value.rightColumn}
          disabled={disabled}
          onChange={(rightColumn) => onChange({ ...value, rightColumn })}
        />
      </div>

      <h4 className="hotline-poster-column-title">Footer</h4>
      {value.footer.map((row, i) => (
        <div key={i} className="form-row hotline-grid hotline-footer-row">
          <input
            className="form-input"
            placeholder="Label"
            value={row.label}
            disabled={disabled}
            onChange={(e) => {
              const next = [...value.footer];
              next[i] = { ...row, label: e.target.value };
              setFooter(next);
            }}
          />
          <input
            className="form-input"
            placeholder="Value"
            value={row.value}
            disabled={disabled}
            onChange={(e) => {
              const next = [...value.footer];
              next[i] = { ...row, value: e.target.value };
              setFooter(next);
            }}
          />
          <button
            type="button"
            className="action-button secondary"
            disabled={disabled || value.footer.length <= 1}
            onClick={() => setFooter(value.footer.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="action-button secondary"
        disabled={disabled}
        onClick={() => setFooter([...value.footer, { label: '', value: '' }])}
      >
        Add footer row
      </button>
    </div>
  );
}
