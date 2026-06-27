import { RESOURCE_SECTIONS, PM_BOOKS, type ResourceBadge, type BadgeVariant } from '@job-search-tracker/shared';
import { Badge } from '../../components/Badge';

const BADGE_LABELS: Record<NonNullable<ResourceBadge>, string> = {
  free: 'бесплатно',
  paid: 'платно',
  international: 'международные',
};

const BADGE_VARIANTS: Record<NonNullable<ResourceBadge>, BadgeVariant> = {
  free: 'teal',
  paid: 'amber',
  international: 'blue',
};

export default function ResourcesPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold text-text">Ресурсы и ссылки</h1>

      {RESOURCE_SECTIONS.map((section) => (
        <section key={section.heading}>
          <h2 className="mb-3 text-sm font-medium text-text-dim">{section.heading}</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {section.cards.map((card) => (
              <div key={card.title} className="rounded-lg border border-border-soft bg-panel p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-text">{card.title}</h3>
                  {card.badge && (
                    <Badge label={BADGE_LABELS[card.badge]} variant={BADGE_VARIANTS[card.badge]} />
                  )}
                </div>
                <ul className="mb-2 flex flex-col gap-1">
                  {card.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent-blue underline-offset-2 hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-text-faint">{card.note}</p>
              </div>
            ))}
          </div>

          {section.footnote && (
            <p className="mt-3 rounded-lg border border-border-soft bg-panel-2 p-3 text-xs text-text-dim">
              {section.footnote}
            </p>
          )}
        </section>
      ))}

      <section>
        <h2 className="mb-3 text-sm font-medium text-text-dim">Книги</h2>
        <div className="rounded-lg border border-border-soft bg-panel p-4">
          <ul className="flex flex-col gap-1 text-sm text-text">
            {PM_BOOKS.map((book) => (
              <li key={book}>{book}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
