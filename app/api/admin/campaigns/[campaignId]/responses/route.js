import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import {
  getCampaignResponsesForAdmin,
  isCampaignTableMissingError,
  stringifyCampaignResponseValue,
  toCsvHeaderString,
  toCsvRowString,
} from "../../../../../../lib/campaigns";
import { getEnvInteger } from "../../../../../../lib/env";
import { prisma } from "../../../../../../lib/prisma";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;
const DEFAULT_CSV_EXPORT_MAX_ROWS = 10000;
const CSV_EXPORT_BATCH_SIZE = 200;

function buildExportColumns(questions) {
  return [
    { key: "submittedAt", label: "Submitted At" },
    ...questions.map((question) => ({
      key: question.key,
      label: question.label,
    })),
  ];
}

function toExportRow(questions, response) {
  const row = {
    submittedAt: new Date(response.submittedAt).toISOString(),
  };

  for (const question of questions) {
    row[question.key] = stringifyCampaignResponseValue(response.data?.[question.key]);
  }

  return row;
}

function parseCsvExportRowLimit(searchParams) {
  const configuredMaxRows = Math.max(1, getEnvInteger("CSV_EXPORT_MAX_ROWS", DEFAULT_CSV_EXPORT_MAX_ROWS));
  const requestedMaxRows = Number.parseInt(String(searchParams.get("maxRows") || ""), 10);

  if (!Number.isFinite(requestedMaxRows) || requestedMaxRows <= 0) {
    return configuredMaxRows;
  }

  return Math.min(requestedMaxRows, configuredMaxRows);
}

function parsePaginationParams(searchParams) {
  const parsedLimit = Number.parseInt(String(searchParams.get("limit") || DEFAULT_PAGE_LIMIT), 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT;
  const cursor = String(searchParams.get("cursor") || "").trim() || null;
  return { limit, cursor };
}

async function loadCampaignExportMetadata(campaignId) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      slug: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          key: true,
          label: true,
        },
      },
    },
  });
}

function createCsvStream({ campaignId, columns, questions }) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let cursor = null;

      try {
        controller.enqueue(encoder.encode(`${toCsvHeaderString(columns)}\n`));

        while (true) {
          const responses = await prisma.campaignResponse.findMany({
            where: { campaignId },
            orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
            take: CSV_EXPORT_BATCH_SIZE,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            select: {
              id: true,
              submittedAt: true,
              data: true,
            },
          });

          if (!responses.length) {
            break;
          }

          for (const response of responses) {
            const row = toExportRow(questions, response);
            controller.enqueue(encoder.encode(`${toCsvRowString(columns, row)}\n`));
          }

          if (responses.length < CSV_EXPORT_BATCH_SIZE) {
            break;
          }

          cursor = responses[responses.length - 1]?.id || null;
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
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
      const campaign = await loadCampaignExportMetadata(campaignId);

      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      }

      const maxRows = parseCsvExportRowLimit(request.nextUrl.searchParams);
      const totalResponses = await prisma.campaignResponse.count({
        where: { campaignId: campaign.id },
      });

      if (totalResponses > maxRows) {
        return NextResponse.json(
          {
            error: `Export exceeds the maximum allowed rows (${maxRows}). Narrow your range or increase CSV_EXPORT_MAX_ROWS.`,
            maxRows,
            totalResponses,
          },
          { status: 413 }
        );
      }

      const columns = buildExportColumns(campaign.questions || []);
      const stream = createCsvStream({
        campaignId: campaign.id,
        columns,
        questions: campaign.questions || [],
      });

      return new NextResponse(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${campaign.slug}-responses.csv"`,
          "Cache-Control": "no-store",
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
