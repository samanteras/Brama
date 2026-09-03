import type { DailyPoint } from '@/lib/admin/metrics'

/**
 * A minimal daily bar chart — one series, inline SVG, no dependency.
 *
 * One series means no legend: the card title names what it shows. Bars (not a
 * line) because daily counts on a young product are small integers, often zero,
 * and a bar reads each day's magnitude honestly where a line would imply
 * continuity between sparse points. Native `<title>` gives a hover read per bar;
 * axis ink stays recessive so the data is what the eye lands on.
 */

const VIEW_W = 720
const VIEW_H = 180
const PAD_BOTTOM = 22 // room for date labels
const PAD_TOP = 8
const GAP = 2 // surface gap between bars

export function DailyBarChart({
  data,
  locale = 'ru-RU',
}: {
  data: DailyPoint[]
  locale?: string
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Пока нет данных.</p>
  }

  const max = Math.max(1, ...data.map((d) => d.count))
  const plotH = VIEW_H - PAD_BOTTOM - PAD_TOP
  const slot = VIEW_W / data.length
  const barW = Math.max(1, slot - GAP)

  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' })

  // Three date ticks — first, middle, last — to avoid a crowded axis.
  const tickIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1]

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-44 w-full"
      role="img"
      preserveAspectRatio="none"
    >
      {/* baseline */}
      <line
        x1={0}
        y1={PAD_TOP + plotH}
        x2={VIEW_W}
        y2={PAD_TOP + plotH}
        className="stroke-border"
        strokeWidth={1}
      />

      {data.map((d, i) => {
        const h = d.count === 0 ? 0 : Math.max(2, (d.count / max) * plotH)
        const x = i * slot + GAP / 2
        const y = PAD_TOP + plotH - h
        return (
          <rect
            key={d.day}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={2}
            className="text-primary"
            fill="currentColor"
          >
            <title>{`${fmtDay(d.day)}: ${d.count.toLocaleString(locale)}`}</title>
          </rect>
        )
      })}

      {tickIdx.map((i) => {
        const x = i * slot + slot / 2
        const anchor = i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'
        return (
          <text
            key={i}
            x={i === 0 ? 2 : i === data.length - 1 ? VIEW_W - 2 : x}
            y={VIEW_H - 6}
            textAnchor={anchor}
            className="fill-current text-[11px] text-muted-foreground"
          >
            {fmtDay(data[i].day)}
          </text>
        )
      })}
    </svg>
  )
}
