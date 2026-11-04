import { createFileRoute } from "@tanstack/react-router";

// GET /api/files/:id — the bytes of a project document or photo, for signed-in users who
// may see that project. Photos open in the page; everything else downloads.
export const Route = createFileRoute("/api/files/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { db } = await import("@/server/db.server");
        const { currentUser } = await import("@/server/auth.server");
        const me = await currentUser();
        if (!me) return new Response("Sign in to view this file.", { status: 401 });
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Not found", { status: 404 });

        const [f] = await db()<{ kind: string; file_name: string; mime_type: string; data: Buffer; vertical_id: string }[]>`
          select f.kind, f.file_name, f.mime_type, f.data, p.vertical_id
          from project_files f join projects p on p.id = f.project_id where f.id = ${params.id}`;
        if (!f || (me.role === "vertical_head" && f.vertical_id !== me.vertical_id)) return new Response("Not found", { status: 404 });

        const inline = f.mime_type.startsWith("image/") && new URL(request.url).searchParams.get("download") === null;
        const name = encodeURIComponent(f.file_name);
        return new Response(new Uint8Array(f.data), {
          headers: {
            "Content-Type": f.mime_type,
            "Content-Length": String(f.data.length),
            "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${name}`,
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
            // Not cached: on a shared office PC the next person to sign in must not see these from cache.
            "Cache-Control": "private, no-store",
          },
        });
      },
    },
  },
});
