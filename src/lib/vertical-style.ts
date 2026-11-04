// One colour and one icon per vertical, used the same way on cards, sidebar and charts.
import {
  Building2,
  ClipboardList,
  Cpu,
  FlaskConical,
  GraduationCap,
  Handshake,
  Landmark,
  Lightbulb,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { Vertical } from "./types";

// The validated 8-slot categorical palette (dataviz skill reference palette), in its fixed order.
// Adjacent slots stay distinguishable under the common colour-vision deficiencies.
export const VERTICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#6250d6", // violet
  "#e34948", // red
];

const ICONS: [RegExp, LucideIcon][] = [
  [/research|r\s*&\s*d/i, FlaskConical],
  [/informatic|digital|it\b|technolog/i, Cpu],
  [/transaction|advis/i, Handshake],
  [/training|capacity/i, GraduationCap],
  [/project management|pmu/i, ClipboardList],
  [/communication|outreach/i, Megaphone],
  [/innovation|incubat|uiic/i, Lightbulb],
  [/heritage|conservation/i, Landmark],
];

/** Colour follows the vertical's position in the alphabetical list, so it stays stable across pages. */
export function verticalStyle(v: Pick<Vertical, "id" | "name">, all: Pick<Vertical, "id" | "name">[]) {
  const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
  const i = Math.max(0, sorted.findIndex((x) => x.id === v.id));
  return {
    color: VERTICAL_COLORS[i % VERTICAL_COLORS.length]!,
    Icon: ICONS.find(([re]) => re.test(v.name))?.[1] ?? Building2,
  };
}
