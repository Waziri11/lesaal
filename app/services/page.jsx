import Link from "next/link";
import PageState from "../../components/shared/PageState";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { getFullServicesFromConfig, getLandingConfig } from "../../lib/landing-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lesaal | Services",
  description: "Explore Lesaal's full service catalog.",
};

export default async function ServicesPage() {
  let services = [];
  let heading = "Services";
  let subheading = "Explore all services offered by Lesaal.";
  let errorMessage = "";

  try {
    const config = await getLandingConfig();
    const servicesSection = config.sections.find((section) => section.type === "SERVICES_GRID");
    services = getFullServicesFromConfig(config);
    heading = servicesSection?.settings?.heading || heading;
    subheading = servicesSection?.settings?.subheading || subheading;
  } catch (error) {
    errorMessage = error?.message || "Unable to load services.";
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <PageState status="error" errorMessage={errorMessage} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>{heading}</CardTitle>
            <CardDescription>{subheading}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/">Back to Homepage</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/login">Admin Log in</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <PageState status={services.length ? "loaded" : "empty"} resourceLabel="services">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="space-y-3 p-5">
                <div className="overflow-hidden rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)]">
                  {service.imageUrl ? (
                    <img src={service.imageUrl} alt={service.title || "Service"} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-[color:var(--ui-muted-foreground)]">No image</div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{service.title || "Service"}</h3>
                  <p className="text-sm text-[color:var(--ui-muted-foreground)]">{service.description || "Description coming soon."}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </PageState>
    </div>
  );
}
