/** Collapse hint copy to one paragraph (max five lines when rendered with line-clamp-5). */
export function toInfoBody(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");
}

export type InfoBlurb = {
  title?: string;
  body: string;
};
