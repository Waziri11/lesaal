import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import { getCampaignResponsesForAdmin, isCampaignTableMissingError, toCsvString } from "../../../../../../lib/campaigns";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

function toExportRows(questions, responses) {
  const columns = [
    { key: "submittedAt", label: "Submitted At" },
    ...questions.map((question) => ({
      key: question.key,
      label: question.label,
    })),
  ];

  const rows = responses.map((response) => {
    const row = {
      submittedAt: new Date(response.submittedAt).toISOString(),
    };

    for (const question of questions) {
      row[question.key] = response.data?.[question.key] ?? "";
    }

    return row;
  });

  return { columns, rows };
}

function parsePaginationParams(searchParams) {
  const parsedLimit = Number.parseInt(String(searchParams.get("limit") || DEFAULT_PAGE_LIMIT), 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT;
  const cursor = String(searchParams.get("cursor") || "").trim() || null;
  return { limit, cursor };
}

export async function GET(request, { params }) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const campaignId = String(resolvedParams?.campaignId || "");
    const format = request.nextUrl.searchParams.get("format");

    if (format === "csv") {
      const data = await getCampaignResponsesForAdmin(campaignId, { includeAllResponses: true });

      if (!data) {
        return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      }

      const { columns, rows } = toExportRows(data.questions, data.responses);
      const csv = toCsvString(columns, rows);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${data.campaign.slug}-responses.csv"`,
        },
      });
    }

    const pagination = parsePaginationParams(request.nextUrl.searchParams);
    const data = await getCampaignResponsesForAdmin(campaignId, pagination);

    if (!data) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    return NextResponse.json({
      campaign: data.campaign,
      questions: data.questions,
      responses: data.responses,
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
    });
  } catch (error) {
    console.error("Failed to load campaign responses", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json(
        { error: "Campaign tables are not initialized. Run database migrations and retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Unable to load campaign responses." }, { status: 500 });
  }
}
