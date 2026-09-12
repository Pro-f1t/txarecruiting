import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { getAllApplications } from "@/lib/firebase/applications";
import { ApplicationStatus } from "@/lib/models/Application";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 8;
const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "image/png": ".png", "image/jpeg": ".jpg",
};

/** "First Last" → safe file stem; strips path separators and control chars. */
function safeStem(name: string): string {
  const s = name.normalize("NFKD").replace(/[\\/:*?"<>|\x00-\x1f]/g, "").replace(/\s+/g, " ").trim();
  return s || "Unnamed";
}

/** Extension from the storage object path inside a Firebase download URL, else from content-type. */
function extFor(url: string, contentType: string | null): string {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/o\/([^?]+)/);
    const objectPath = m ? decodeURIComponent(m[1]) : u.pathname;
    const ext = objectPath.match(/\.[a-z0-9]{2,5}$/i)?.[0];
    if (ext) return ext.toLowerCase();
  } catch { /* fall through */ }
  return EXT_BY_TYPE[(contentType ?? "").split(";")[0].trim()] ?? ".pdf";
}

export async function GET() {
  try {
    await requireStaff();
    const apps = (await getAllApplications()).filter((a) => a.formData?.resumeUrl);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    const stamp = new Date().toISOString().slice(0, 10);
    const errors: string[] = [];
    const indexLines = ["File,Name,Email,Status,Resume URL"];
    const usedNames = new Map<string, number>();
    const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;

    // Fetch in small parallel batches; append each to the archive as it lands.
    const work = async (a: (typeof apps)[number]) => {
      const url = a.formData!.resumeUrl!;
      const label = `${a.userName ?? a.id} <${a.userEmail ?? ""}>`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const stem = safeStem(a.userName ?? a.id);
        const n = (usedNames.get(stem) ?? 0) + 1;
        usedNames.set(stem, n);
        const file = `${stem}${n > 1 ? ` (${n})` : ""}${extFor(url, res.headers.get("content-type"))}`;
        archive.append(buf, { name: file });
        const status = a.status === ApplicationStatus.IN_PROGRESS ? "Draft" : "Submitted";
        indexLines.push([file, a.userName ?? "", a.userEmail ?? "", status, url].map(csv).join(","));
      } catch (e) {
        errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    const run = (async () => {
      const queue = [...apps];
      await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (queue.length) await work(queue.shift()!); }));
      archive.append("﻿" + indexLines.join("\r\n"), { name: "_index.csv" });
      if (errors.length) archive.append(`Resumes that could not be downloaded (${errors.length}):\n\n${errors.join("\n")}\n`, { name: "_errors.txt" });
      await archive.finalize();
    })();
    run.catch((e) => archive.destroy(e instanceof Error ? e : new Error(String(e))));

    return new NextResponse(Readable.toWeb(archive) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="txa-resumes-${stamp}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export resumes." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
