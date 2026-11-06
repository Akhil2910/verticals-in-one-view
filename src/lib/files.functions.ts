// Project documents and photos. Same access rules as the project itself: anyone who can
// read the project sees its files; admins and that vertical's head can add or remove them.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProjectFile } from "./types";

const server = async () => ({ ...(await import("@/server/db.server")), ...(await import("@/server/auth.server")) });

export const MAX_FILE_MB = 50;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

// Only formats that are safe to hand back to a browser. No SVG or HTML: those can carry scripts.
export const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/zip": "zip",
  ...PHOTO_TYPES, // a scanned letter saved as a JPG is still a document
};

/** The browser's claimed type is just a label, so images are also checked by their first bytes. */
export function looksLikeImage(b: Uint8Array) {
  const at = (i: number, ...xs: number[]) => xs.every((x, j) => b[i + j] === x);
  return (
    at(0, 0xff, 0xd8, 0xff) || // JPEG
    at(0, 0x89, 0x50, 0x4e, 0x47) || // PNG
    at(0, 0x47, 0x49, 0x46, 0x38) || // GIF
    (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) // WebP (RIFF....WEBP)
  );
}

/** Loads the project and checks the caller may read it (and, if `write`, change it). */
async function accessProject(projectId: string, write: boolean) {
  const { db, requireUser } = await server();
  const me = await requireUser(write ? ["admin", "vertical_head"] : undefined);
  const [p] = await db()<{ vertical_id: string }[]>`select vertical_id from projects where id = ${projectId}`;
  if (!p || (me.role === "vertical_head" && p.vertical_id !== me.vertical_id)) throw new Error("Project not found.");
  return me;
}

export const listProjectFiles = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await accessProject(data.projectId, false);
    const { db } = await server();
    return db()<ProjectFile[]>`
      select id, project_id, kind, title, file_name, mime_type, size_bytes, uploaded_by_name, created_at
      from project_files where project_id = ${data.projectId} order by kind, created_at`;
  });

export const uploadProjectFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Expected a file upload.");
    const file = d.get("file");
    const fields = z
      .object({ projectId: z.string().uuid(), kind: z.enum(["document", "photo"]), title: z.string().trim().min(1, "Give the file a name.").max(200) })
      .parse({ projectId: d.get("projectId"), kind: d.get("kind"), title: d.get("title") });
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");
    return { ...fields, file };
  })
  .handler(async ({ data }) => {
    const me = await accessProject(data.projectId, true);
    const allowed = data.kind === "photo" ? PHOTO_TYPES : DOCUMENT_TYPES;
    if (!allowed[data.file.type]) {
      throw new Error(data.kind === "photo" ? "Photos must be JPG, PNG, WebP or GIF." : "That file type isn't allowed. Use PDF, Word, Excel, PowerPoint, CSV, text, ZIP or an image.");
    }
    if (data.file.size > MAX_FILE_BYTES) throw new Error(`Files can be at most ${MAX_FILE_MB} MB.`);
    const bytes = Buffer.from(await data.file.arrayBuffer());
    if (PHOTO_TYPES[data.file.type] && !looksLikeImage(bytes)) throw new Error("That file isn't a valid image.");
    const { db } = await server();
    const [row] = await db()<{ id: string }[]>`
      insert into project_files (project_id, kind, title, file_name, mime_type, size_bytes, data, uploaded_by, uploaded_by_name)
      values (${data.projectId}, ${data.kind}, ${data.title}, ${data.file.name.slice(0, 255)}, ${data.file.type}, ${bytes.length}, ${bytes},
              ${me.id}, ${me.full_name ?? me.email})
      returning id`;
    return row;
  });

export const renameProjectFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await server();
    const [f] = await db()<{ project_id: string }[]>`select project_id from project_files where id = ${data.id}`;
    if (!f) throw new Error("File not found.");
    await accessProject(f.project_id, true);
    await db()`update project_files set title = ${data.title} where id = ${data.id}`;
    return { ok: true };
  });

export const deleteProjectFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await server();
    const [f] = await db()<{ project_id: string }[]>`select project_id from project_files where id = ${data.id}`;
    if (!f) throw new Error("File not found.");
    await accessProject(f.project_id, true);
    await db()`delete from project_files where id = ${data.id}`;
    return { ok: true };
  });
