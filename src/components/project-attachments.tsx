import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Check,
  Download,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Presentation,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteProjectFile, DOCUMENT_TYPES, listProjectFiles, MAX_FILE_BYTES, PHOTO_TYPES, renameProjectFile, uploadProjectFile } from "@/lib/files.functions";
import { fmtDate } from "@/lib/data";
import type { ProjectFile } from "@/lib/types";

const fileUrl = (f: ProjectFile, download = false) => `/api/files/${f.id}${download ? "?download" : ""}`;
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Icon and tint for a document, by file type. */
function docIcon(f: ProjectFile) {
  const e = ext(f.file_name);
  if (e === "pdf") return { Icon: FileText, cls: "bg-destructive/10 text-destructive" };
  if (["xls", "xlsx", "csv"].includes(e)) return { Icon: FileSpreadsheet, cls: "bg-received/10 text-received" };
  if (["ppt", "pptx"].includes(e)) return { Icon: Presentation, cls: "bg-onhold/10 text-[#b5481c]" };
  if (["doc", "docx", "txt"].includes(e)) return { Icon: FileText, cls: "bg-ongoing/10 text-brand" };
  if (e === "zip") return { Icon: FileArchive, cls: "bg-muted text-muted-foreground" };
  if (f.mime_type.startsWith("image/")) return { Icon: FileImage, cls: "bg-primary/10 text-primary" };
  return { Icon: FileIcon, cls: "bg-muted text-muted-foreground" };
}

/** Documents and photos of one project. Uploading, renaming and deleting appear only when `canEdit`. */
export function ProjectAttachments({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const key = ["project-files", projectId];
  const files = useQuery({ queryKey: key, queryFn: () => listProjectFiles({ data: { projectId } }) });
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const photos = files.data?.filter((f) => f.kind === "photo") ?? [];
  const docs = files.data?.filter((f) => f.kind === "document") ?? [];
  const [viewing, setViewing] = useState<ProjectFile | null>(null);

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-5 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Paperclip className="h-4 w-4" /></span>
        <div className="flex-1">
          <h2 className="font-serif text-base font-semibold">Documents &amp; photos</h2>
          <p className="text-xs text-muted-foreground">
            {files.isLoading ? "Loading…" : `${docs.length} document${docs.length === 1 ? "" : "s"} · ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </header>

      {canEdit && <UploadBox projectId={projectId} onDone={refresh} />}

      <div className="space-y-6 p-5">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand"><Camera className="h-3.5 w-3.5" />Photos</h3>
          {photos.length === 0 ? (
            <Empty text={canEdit ? "No photos yet. Add site, event or inauguration photos above." : "No photos uploaded."} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((f) => (
                <li key={f.id} className="group overflow-hidden rounded-lg border bg-muted/20">
                  <button type="button" onClick={() => setViewing(f)} className="block aspect-[4/3] w-full overflow-hidden bg-muted" aria-label={`View ${f.title}`}>
                    <img src={fileUrl(f)} alt={f.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  </button>
                  <FileMeta f={f} canEdit={canEdit} onChange={refresh} compact />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand"><FileText className="h-3.5 w-3.5" />Documents</h3>
          {docs.length === 0 ? (
            <Empty text={canEdit ? "No documents yet. Add work orders, sanction letters, reports or certificates above." : "No documents uploaded."} />
          ) : (
            <ul className="divide-y rounded-lg border">
              {docs.map((f) => {
                const { Icon, cls } = docIcon(f);
                return (
                  <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cls}`}><Icon className="h-4.5 w-4.5" /></span>
                    <div className="min-w-0 flex-1"><FileMeta f={f} canEdit={canEdit} onChange={refresh} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-4xl">
          {viewing && (
            <>
              <DialogTitle className="font-serif">{viewing.title}</DialogTitle>
              <img src={fileUrl(viewing)} alt={viewing.title} className="max-h-[70vh] w-full rounded-md bg-muted object-contain" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{viewing.file_name} · {size(viewing.size_bytes)} · {viewing.uploaded_by_name ?? "—"} · {fmtDate(viewing.created_at)}</span>
                <a href={fileUrl(viewing, true)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><Download className="h-3.5 w-3.5" />Download</a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">{text}</p>;
}

/** Name (editable in place), file details and actions for one uploaded file. */
function FileMeta({ f, canEdit, onChange, compact }: { f: ProjectFile; canEdit: boolean; onChange: () => void; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(f.title);

  async function save() {
    try {
      await renameProjectFile({ data: { id: f.id, title } });
      setEditing(false);
      onChange();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function remove() {
    if (!confirm(`Delete "${f.title}"?`)) return;
    try {
      await deleteProjectFile({ data: { id: f.id } });
      toast.success("Deleted");
      onChange();
    } catch (e) { toast.error((e as Error).message); }
  }

  const actions = (
    <div className="flex shrink-0 items-center">
      <a href={fileUrl(f, true)} title="Download" aria-label={`Download ${f.title}`} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Download className="h-3.5 w-3.5" /></a>
      {canEdit && !editing && <button type="button" onClick={() => setEditing(true)} title="Rename" aria-label={`Rename ${f.title}`} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>}
      {canEdit && <button type="button" onClick={remove} title="Delete" aria-label={`Delete ${f.title}`} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
    </div>
  );

  return (
    <div className={`flex items-start gap-1 ${compact ? "px-2.5 py-2" : ""}`}>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex items-center gap-1">
            <Input autoFocus required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-sm" />
            <button className="rounded p-1 text-success hover:bg-muted" aria-label="Save name"><Check className="h-4 w-4" /></button>
            <button type="button" onClick={() => { setTitle(f.title); setEditing(false); }} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Cancel"><X className="h-4 w-4" /></button>
          </form>
        ) : (
          <div className={`font-medium ${compact ? "line-clamp-2 text-xs" : "truncate text-sm"}`} title={f.title}>{f.title}</div>
        )}
        <div className="truncate text-[11px] text-muted-foreground">
          {compact ? `${fmtDate(f.created_at)}` : `${f.file_name} · ${size(f.size_bytes)} · ${f.uploaded_by_name ?? "—"} · ${fmtDate(f.created_at)}`}
        </div>
      </div>
      {actions}
    </div>
  );
}

const ACCEPT = {
  photo: Object.keys(PHOTO_TYPES).join(","),
  document: [...Object.keys(DOCUMENT_TYPES), ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip"].join(","),
};

function UploadBox({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [kind, setKind] = useState<"document" | "photo">("document");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) { toast.error("Files can be at most 10 MB."); return; }
    setFile(f);
    // Suggest a name from the file name; the person can change it.
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
  };

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Choose a file first."); return; }
    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("kind", kind);
    fd.append("title", title.trim());
    fd.append("file", file);
    setBusy(true);
    try {
      await uploadProjectFile({ data: fd });
      toast.success(`Uploaded “${title.trim()}”`);
      setTitle("");
      setFile(null);
      if (input.current) input.current.value = "";
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={upload} className="space-y-3 border-b bg-muted/10 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm shadow-sm" role="radiogroup" aria-label="What are you uploading?">
          {(["document", "photo"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => { setKind(k); setFile(null); if (input.current) input.current.value = ""; }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {k === "document" ? <FileText className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {k === "document" ? "Document" : "Photo"}
            </button>
          ))}
        </div>
        <Input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === "document" ? "Name, e.g. Work order, Completion certificate" : "Caption, e.g. Inauguration by CDMA, Batch-II group photo"}
          className="min-w-60 flex-1"
          aria-label="Name of the file"
        />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={`flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition ${drag ? "border-primary bg-primary/5" : "border-border bg-card"}`}
      >
        <UploadCloud className="h-6 w-6 text-primary" />
        <div className="min-w-0 flex-1 text-sm">
          {file ? (
            <><span className="font-medium">{file.name}</span> <span className="text-muted-foreground">· {size(file.size)}</span></>
          ) : (
            <span className="text-muted-foreground">
              Drop a {kind} here, or{" "}
              <button type="button" onClick={() => input.current?.click()} className="font-medium text-primary hover:underline">browse</button>
              . {kind === "photo" ? "JPG, PNG, WebP or GIF" : "PDF, Word, Excel, PowerPoint, CSV, text, ZIP or an image"}, up to 10 MB.
            </span>
          )}
        </div>
        <input ref={input} type="file" accept={ACCEPT[kind]} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label={`Choose a ${kind}`} />
        {file && <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }} className="text-xs text-muted-foreground hover:text-foreground">Change</button>}
        <Button disabled={busy || !file}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}Upload</Button>
      </div>
    </form>
  );
}
