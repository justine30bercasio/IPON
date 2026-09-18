import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const challengeId = (await params).id;
  const format = request.nextUrl.searchParams.get("format") ?? "csv";

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return new Response("Not found", { status: 404 });
  if (user.role !== "SUPER_ADMIN" && challenge.orgId !== user.orgId) {
    return new Response("Forbidden", { status: 403 });
  }
  const isAdmin = await isAdminOf(user, challengeId);
  if (!isAdmin) return new Response("Forbidden", { status: 403 });

  const txs = await prisma.hulogTransaction.findMany({
    where: { challengeId, status: { not: "VOIDED" } },
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { transactionDate: "asc" },
  });

  const rows = txs.map((t) => ({
    name: t.member.user.name,
    email: t.member.user.email,
    date: t.transactionDate.toISOString().slice(0, 10),
    period: t.collectionPeriod,
    amount: t.amount,
    method: t.paymentMethod.replace("_", " "),
    status: t.status,
    note: t.note ?? "",
  }));

  const fileName = `${challenge.name.replace(/\s+/g, "-").toLowerCase()}-report`;

  if (format === "csv") {
    const esc = (v: string | number) => {
      const s = String(v);
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const lines = [
      ["Member", "Email", "Date", "Period", "Amount (PHP)", "Payment Method", "Status", "Note"].map(esc).join(","),
      ...rows.map((r) =>
        [r.name, r.email, r.date, r.period, r.amount.toFixed(2), r.method, r.status, r.note].map(esc).join(",")
      ),
    ];
    return new Response("\uFEFF" + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "IPON";
    const sheet = workbook.addWorksheet("Hulog History", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Member", key: "name", width: 24 },
      { header: "Email", key: "email", width: 28 },
      { header: "Date", key: "date", width: 14 },
      { header: "Period", key: "period", width: 20 },
      { header: "Amount (PHP)", key: "amount", width: 16 },
      { header: "Payment Method", key: "method", width: 16 },
      { header: "Status", key: "status", width: 14 },
      { header: "Note", key: "note", width: 32 },
    ];
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" },
    };
    header.alignment = { vertical: "middle" };

    for (const r of rows) {
      sheet.addRow({
        name: r.name,
        email: r.email,
        date: r.date,
        period: r.period,
        amount: r.amount,
        method: r.method,
        status: r.status,
        note: r.note,
      });
    }
    const lastCol = sheet.getColumn(5);
    lastCol.numFmt = '"₱"#,##0.00';
    lastCol.alignment = { horizontal: "right" };
    sheet.autoFilter = { from: "A1", to: `H${rows.length + 1}` };

    const total = txs.reduce((s, t) => s + t.amount, 0);
    const totalRow = sheet.addRow({
      name: "TOTAL COLLECTED",
      amount: total,
    });
    totalRow.font = { bold: true };
    totalRow.getCell(5).numFmt = '"₱"#,##0.00';

    const buf = await workbook.xlsx.writeBuffer();
    return new Response(buf as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const months = new Map<string, { count: number; total: number }>();
    for (const t of txs) {
      const b = months.get(t.collectionPeriod) ?? { count: 0, total: 0 };
      b.count++;
      b.total += t.amount;
      months.set(t.collectionPeriod, b);
    }
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const members = new Set(txs.map((t) => t.member.user.name)).size;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(challenge.name)} — Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", sans-serif; color: #15241f; padding: 40px; background: #fff; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #059669; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; color: #059669; }
  h1 { font-size: 20px; margin-top: 6px; }
  .stats { display: flex; gap: 12px; margin: 24px 0; }
  .stat { flex: 1; background: #f1faf6; border-radius: 12px; padding: 14px; }
  .stat .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #3f4d47; font-weight: 700; }
  .stat .v { font-size: 20px; font-weight: 800; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
  th { background: #059669; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e6ebe9; }
  tr:nth-child(even) td { background: #f9fbfa; }
  .r { text-align: right; }
  .mon { font-weight: 800; }
  .foot { margin-top: 28px; font-size: 11px; color: #3f4d47; border-top: 1px solid #e6ebe9; padding-top: 12px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">IPON</div>
      <h1>${escapeHtml(challenge.name)} — Collection Report</h1>
      <div style="margin-top:4px;font-size:12px;color:#3f4d47;">Generated ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="k">Total Collected</div><div class="v">${money(total)}</div></div>
    <div class="stat"><div class="k">Transactions</div><div class="v">${txs.length}</div></div>
    <div class="stat"><div class="k">Contributing Members</div><div class="v">${members}</div></div>
    <div class="stat"><div class="k">Average Hulog</div><div class="v">${txs.length ? money(total / txs.length) : "₱0"}</div></div>
  </div>
  <h2 style="font-size:15px;margin-top:24px;">Monthly Summary</h2>
  <table>
    <tr><th>Period</th><th class="r">Transactions</th><th class="r">Total Collected</th></tr>
    ${Array.from(months.entries())
      .sort((a, b) => (a[0] > b[0] ? -1 : 1))
      .map(
        ([period, b]) =>
          `<tr><td class="mon">${escapeHtml(period)}</td><td class="r">${b.count}</td><td class="r">${money(b.total)}</td></tr>`
      )
      .join("")}
    <tr><td class="mon">TOTAL</td><td class="r">${txs.length}</td><td class="r">${money(total)}</td></tr>
  </table>
  <h2 style="font-size:15px;margin-top:24px;">All Transactions</h2>
  <table>
    <tr><th>Member</th><th>Date</th><th>Period</th><th class="r">Amount</th><th>Method</th><th>Status</th></tr>
    ${rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.name)}</td><td>${r.date}</td><td>${escapeHtml(r.period)}</td><td class="r">${money(r.amount)}</td><td>${r.method}</td><td>${r.status}</td></tr>`
      )
      .join("")}
  </table>
  <div class="foot">Generated by IPON — Small hulog, big progress.</div>
  <script>window.addEventListener('load', () => window.print());</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${fileName}.html"`,
      },
    });
  }

  return new Response("Bad request", { status: 400 });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

async function isAdminOf(user: { id: string; role: string }, challengeId: string): Promise<boolean> {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  const c = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { members: { where: { userId: user.id, isAdmin: true } } },
  });
  if (!c) return false;
  if (c.createdById === user.id) return true;
  return c.members.length > 0;
}