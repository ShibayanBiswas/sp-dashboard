"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Fragment, useRef, type ReactNode } from "react";

/**
 * Virtualized tbody inside a scroll container — same table markup/classes as DataTable rows.
 * Only renders visible rows; format and columns stay unchanged.
 */
export function VirtualizedTableSection({
  scrollClassName,
  thead,
  rowCount,
  colSpan,
  emptyState,
  estimateRowHeight = 44,
  children,
}: {
  scrollClassName?: string;
  thead: ReactNode;
  rowCount: number;
  colSpan: number;
  emptyState?: ReactNode;
  estimateRowHeight?: number;
  children: (index: number) => ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 14,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end ?? 0);

  return (
    <div ref={scrollRef} className={scrollClassName}>
      <table className="data-table w-full text-sm">
        <thead className="sticky top-0 z-[1] bg-white shadow-[0_1px_0_0_rgb(231_229_228)]">{thead}</thead>
        <tbody>
          {rowCount === 0 ? emptyState : null}
          {rowCount > 0 && paddingTop > 0 ? (
            <tr aria-hidden>
              <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
            </tr>
          ) : null}
          {virtualRows.map((virtualRow) => (
            <Fragment key={virtualRow.key}>{children(virtualRow.index)}</Fragment>
          ))}
          {rowCount > 0 && paddingBottom > 0 ? (
            <tr aria-hidden>
              <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
