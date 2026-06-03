export default function UnderDevelopmentCard({ title, description }) {
  return (
    <section className="admin-page-card">
      <h1>{title}</h1>
      <p className="status-pill">Under Development</p>
      <p>{description}</p>
      <ul>
        <li>Core functionality will be connected in the next release.</li>
        <li>Design and navigation are already in place.</li>
        <li>This page is intentionally marked as work in progress.</li>
      </ul>
    </section>
  );
}
