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

// 8 categorical colours without yellow or pink (dataviz reference hues plus teal and indigo),
// in an order checked with the dataviz skill's validate_palette.js: adjacent slots stay
// distinguishable under the common colour-vision deficiencies, and slots 2, 5 and 7 (Heritage,
// Training, Urban Informatics, the verticals that share charts most) also pass as a trio.
export const VERTICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#6250d6", // violet
  "#1baf7a", // aqua
  "#3b4cc0", // indigo
  "#008300", // green
  "#0e9fb8", // teal
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
