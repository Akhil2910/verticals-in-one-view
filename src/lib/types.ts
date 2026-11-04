// Row shapes returned by the server functions (see db/migrations/001_init.sql).

export type Role = "admin" | "official" | "vertical_head";

export type Vertical = {
  id: string;
  name: string;
  created_at: string;
};

export type Project = {
  id: string;
  vertical_id: string;
  name: string;
  project_head: string | null;
  team_members: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  progress_notes: string | null;
  physical_progress: number;
  physical_progress_not_applicable: boolean;
  milestones_completed: string | null;
  milestones_pending: string | null;
  total_cost: number;
  amount_received: number;
  expenditure: number;
  amount_receivable: number;
  expected_completion: string | null;
  issues: string | null;
  other_info: string | null;
  participants: number | null;
  /** Department or organisation the work is done for, e.g. "O/o CDMA". */
  client_name: string | null;
  partner_vendors: PartnerVendor[];
  updated_by: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

/** A document or photo attached to a project (file bytes are fetched from /api/files/:id). */
export type ProjectFile = {
  id: string;
  project_id: string;
  kind: "document" | "photo";
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_name: string | null;
  created_at: string;
};

/** An outside firm on the project: who, for what, and the value of its work order (if known). */
export type PartnerVendor = { name: string; scope: string | null; amount: number | null };

export type ProjectInput = Omit<Project, "id" | "created_at" | "updated_at" | "updated_by" | "updated_by_name">;
