export default function PublicSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className = '',
}) {
  return (
    <section className={`public-section ${className}`.trim()}>
      <div className="public-section-heading">
        <div>
          {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
          <h2 className="section-title">{title}</h2>
          {description && <p className="section-description">{description}</p>}
        </div>
        {action && <div className="section-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}
