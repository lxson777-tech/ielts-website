/* A writing question's HTML with each chart shown as a ZoomableChart.

   Drop-in for `<Html as=... className=... html={prompt.promptHtml} />`
   wherever a Task 1 question can appear. A question with no picture renders
   exactly as Html did (one element, same tag and class). One with a chart
   renders its wording in that same element and the chart below it, zoomable
   in place. The split is display only (src/lib/writing/prompt-charts.ts):
   the prompt object, and so the grader request, are never touched.

   Memoised like Html for the same reason: the writing clock re-renders the
   trainer every 500ms, and the chart must not be rebuilt each time. */

import { memo, useMemo } from 'react';
import Html from './Html';
import ZoomableChart from './ZoomableChart';
import { splitPromptHtml } from '../lib/writing/prompt-charts';

interface PromptWithChartsProps {
  html: string;
  as?: 'div' | 'span' | 'p';
  className?: string;
  /** Class on each chart block, for a screen's own height cap. */
  chartClassName?: string;
  /** The one-line zoom hint under the last chart. On by default. */
  hint?: boolean;
}

function PromptWithChartsImpl({ html, as = 'div', className, chartClassName, hint = true }: PromptWithChartsProps) {
  const segments = useMemo(() => splitPromptHtml(html), [html]);
  if (!segments.some((s) => s.kind === 'chart')) return <Html as={as} className={className} html={html} />;
  const lastChart = segments.map((s) => s.kind).lastIndexOf('chart');
  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === 'chart' ? (
          <ZoomableChart key={`c${i}`} src={seg.src} alt={seg.alt} className={chartClassName} hint={hint && i === lastChart} />
        ) : seg.raw.trim() ? (
          <Html key={`h${i}`} as={as} className={className} html={seg.raw} />
        ) : null,
      )}
    </>
  );
}

export default memo(PromptWithChartsImpl);
