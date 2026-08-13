import type { Workbook, Worksheet } from "exceljs";
import type { StatsResponse } from "@/services/admin-statistics";

/**
 * Builds the Admin Statistics workbook with ExcelJS.
 *
 * The numbers come from the StatsResponse the dashboard is already rendering —
 * the same object, from the same `/api/admin/statistics` query. Nothing is
 * recalculated here, so the file cannot disagree with the screen.
 *
 * Kept separate from the download so the workbook can be built and inspected
 * without a browser.
 */

const TITLE = "Medical Secretary Platform — Statistics";

/** Matches the tile labels on the dashboard so the file reads the same. */
type Row = { label: string; value: number | string | null; note?: string };

const BRAND = "FF4F46E5"; // indigo, the app's primary
const HEADER_TEXT = "FFFFFFFF";
const SECTION_FILL = "FFEEF2FF";
const BORDER = "FFE2E8F0";

function styleHeaderRow(sheet: Worksheet, rowNumber: number, columns: number): void {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
  row.alignment = { vertical: "middle" };
  row.height = 20;

  for (let c = 1; c <= columns; c += 1) {
    const cell = row.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER } },
      left: { style: "thin", color: { argb: BORDER } },
      bottom: { style: "thin", color: { argb: BORDER } },
      right: { style: "thin", color: { argb: BORDER } },
    };
  }
}

function addSectionTitle(sheet: Worksheet, text: string, columns = 2): void {
  const row = sheet.addRow([text]);
  sheet.mergeCells(row.number, 1, row.number, columns);
  row.font = { bold: true, size: 12 };
  row.height = 18;
  row.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: SECTION_FILL },
  };
}

function addMetricRows(sheet: Worksheet, rows: Row[]): void {
  for (const { label, value, note } of rows) {
    // null is a real state (nobody has rated yet) and must not read as zero.
    const row = sheet.addRow([label, value ?? "n/a", note ?? ""]);
    row.getCell(2).alignment = { horizontal: "right" };
    if (typeof value === "number") row.getCell(2).numFmt = "#,##0";
    row.getCell(3).font = { italic: true, size: 9, color: { argb: "FF64748B" } };
  }
}

export async function buildStatisticsWorkbook(data: StatsResponse): Promise<Workbook> {
  // Loaded on demand: ExcelJS is large, and nobody pays for it until they
  // actually export.
  //
  // ExcelJS is CommonJS, so a dynamic import yields a namespace whose real
  // export sits on `.default`. Reading `.Workbook` off the namespace directly
  // gives undefined and fails with "not a constructor" — hence the fallback,
  // which also keeps working if the package ever ships a true ESM build.
  const imported = await import("exceljs");
  const ExcelJS = (imported as unknown as { default?: typeof imported }).default ?? imported;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Medical Secretary Platform";
  workbook.created = new Date();

  const k = data.kpis;

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  const summary = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  summary.columns = [
    { key: "label", width: 34 },
    { key: "value", width: 16 },
    { key: "note", width: 30 },
  ];

  const titleRow = summary.addRow([TITLE]);
  summary.mergeCells(titleRow.number, 1, titleRow.number, 3);
  titleRow.font = { bold: true, size: 15, color: { argb: BRAND } };
  titleRow.height = 24;

  summary.addRow([
    "Period",
    `${data.range.from} to ${data.range.to}`,
    `Range: ${data.range.key}`,
  ]);
  summary.addRow(["Exported", new Date().toLocaleString("en-GB")]);
  summary.addRow([]);

  const headerRow = summary.addRow(["Metric", "Value", "Notes"]);
  styleHeaderRow(summary, headerRow.number, 3);

  addSectionTitle(summary, "Appointments", 3);
  addMetricRows(summary, [
    { label: "Total Appointments", value: k.totalAppointments },
    { label: "Completed Appointments", value: k.completedAppointments },
    { label: "Accepted Appointments", value: k.acceptedAppointments, note: "Confirmed" },
    { label: "Pending Appointments", value: k.pendingAppointments, note: "Awaiting a decision" },
    { label: "Cancelled Appointments", value: k.cancelledAppointments },
    { label: "Rejected Appointments", value: k.rejectedAppointments },
  ]);

  addSectionTitle(summary, "Activity", 3);
  addMetricRows(summary, [
    { label: "Total AI Conversations", value: k.aiConversations },
    { label: "Active Live Chats", value: k.activeLiveChats, note: "Right now, not range-scoped" },
    { label: "Document Requests", value: k.documentRequests },
    { label: "Document Requests Pending", value: k.documentsPending },
  ]);

  addSectionTitle(summary, "Ratings", 3);
  addMetricRows(summary, [
    { label: "Average Doctor Rating", value: k.averageRating, note: "Out of 5" },
    { label: "Total Ratings", value: k.totalRatings },
    {
      label: "Patient Satisfaction",
      value: k.patientSatisfaction === null ? null : `${k.patientSatisfaction}%`,
      note: "Share of ratings of 4★ or 5★",
    },
  ]);

  addSectionTitle(summary, "People", 3);
  addMetricRows(summary, [
    { label: "Active Patients", value: k.activePatients, note: "Current total" },
    { label: "Total Doctors", value: k.totalDoctors, note: "Current total" },
    { label: "Total Secretaries", value: k.totalSecretaries, note: "Current total" },
    { label: "Total Administrators", value: k.totalAdmins, note: "Current total" },
  ]);

  // ── Sheet 2: Appointments over time ───────────────────────────────────────
  const overTime = workbook.addWorksheet("Appointments Over Time", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  overTime.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Total", key: "total", width: 12 },
    { header: "Completed", key: "completed", width: 12 },
    { header: "Cancelled", key: "cancelled", width: 12 },
  ];
  styleHeaderRow(overTime, 1, 4);

  for (const day of data.charts.appointmentsOverTime) {
    overTime.addRow({
      date: day.date,
      total: day.total,
      completed: day.completed,
      cancelled: day.cancelled,
    });
  }
  overTime.autoFilter = { from: "A1", to: "D1" };

  // ── Sheet 3: Status breakdown ─────────────────────────────────────────────
  const status = workbook.addWorksheet("Appointment Status");
  status.columns = [
    { header: "Status", key: "status", width: 20 },
    { header: "Count", key: "count", width: 12 },
  ];
  styleHeaderRow(status, 1, 2);
  for (const row of data.charts.appointmentStatus) {
    status.addRow({ status: row.status, count: row.count });
  }

  // ── Sheet 4: Rating distribution ──────────────────────────────────────────
  const ratings = workbook.addWorksheet("Rating Distribution");
  ratings.columns = [
    { header: "Rating", key: "stars", width: 14 },
    { header: "Count", key: "count", width: 12 },
  ];
  styleHeaderRow(ratings, 1, 2);
  for (const row of data.charts.ratingDistribution) {
    ratings.addRow({ stars: `${row.stars} star${row.stars === 1 ? "" : "s"}`, count: row.count });
  }

  // ── Sheet 5: AI conversations & documents over time ───────────────────────
  const activity = workbook.addWorksheet("Activity Over Time", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  activity.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "AI Conversations", key: "conversations", width: 18 },
    { header: "Document Requests", key: "requests", width: 18 },
  ];
  styleHeaderRow(activity, 1, 3);

  // Both series cover the same range, so they line up row for row.
  const requestsByDate = new Map(
    data.charts.documentRequestsOverTime.map((d) => [d.date, d.requests]),
  );
  for (const day of data.charts.aiConversationsOverTime) {
    activity.addRow({
      date: day.date,
      conversations: day.conversations,
      requests: requestsByDate.get(day.date) ?? 0,
    });
  }
  activity.autoFilter = { from: "A1", to: "C1" };

  return workbook;
}

/** Builds the workbook and saves it as .xlsx. */
export async function downloadStatisticsWorkbook(data: StatsResponse): Promise<void> {
  const workbook = await buildStatisticsWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `statistics-${data.range.from}-to-${data.range.to}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
