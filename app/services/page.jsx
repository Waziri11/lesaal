import Link from "next/link";
import { getFullServicesFromConfig, getLandingConfig } from "../../lib/landing-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lesaal | Services",
  description: "Explore Lesaal's full service catalog.",
};

export default async function ServicesPage() {
  const config = await getLandingConfig();
  const servicesSection = config.sections.find((section) => section.type === "SERVICES_GRID");
  const services = getFullServicesFromConfig(config);

  return (
    <div className="services-page-shell">
      <header className="services-page-head">
        <h1>{servicesSection?.settings?.heading || "Services"}</h1>
        <p>{servicesSection?.settings?.subheading || "Explore all services offered by Lesaal."}</p>
        <div className="services-page-actions">
          <Link href="/" className="lp-btn lp-btn-primary">
            Back to Homepage
          </Link>
          <Link href="/admin/login" className="lp-btn lp-btn-ghost">
            Admin Log in
          </Link>
        </div>
      </header>

      <section className="services-page-grid">
        {services.map((service) => (
          <article key={service.id} className="lp-service-card">
            <div className="lp-service-image-wrap">
              {service.imageUrl ? (
                <img src={service.imageUrl} alt={service.title || "Service"} />
              ) : (
                <div className="lp-image-placeholder">No image</div>
              )}
            </div>
            <div className="lp-service-content">
              <h3>{service.title || "Service"}</h3>
              <p>{service.description || "Description coming soon."}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
