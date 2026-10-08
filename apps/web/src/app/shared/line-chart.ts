import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { formatCOP, formatCOPShort } from '@plazo/finance-engine';
import { observeWidth } from './chart-box';
import { labelEvery, niceTicks } from './scale';

export interface LineSeries {
  name: string;
  /** Color CSS, p. ej. 'var(--accent)'. */
  color: string;
  values: readonly number[];
  dashed?: boolean;
  area?: boolean;
}

const PAD = { top: 12, right: 12, bottom: 26, left: 58 };

/** Gráfica de líneas en SVG puro, con guía al pasar el puntero o el dedo. */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .chart {
      position: relative;
      width: 100%;
      touch-action: pan-y;
    }
    svg {
      display: block;
      overflow: visible;
    }
    .axis {
      fill: var(--muted);
      font: 11px var(--font);
    }
    .grid {
      stroke: var(--line);
      stroke-width: 1;
    }
    .guide {
      stroke: var(--muted);
      stroke-dasharray: 3 3;
    }
    .tip {
      position: absolute;
      top: 4px;
      pointer-events: none;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 12px;
      box-shadow: var(--shadow);
      white-space: nowrap;
      z-index: 2;
    }
    .tip b {
      display: block;
      margin-bottom: 2px;
    }
    .tip i {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      margin-right: 6px;
    }
  `,
  template: `
    <div class="chart" #box (pointerleave)="hover.set(null)">
      @if (width() > 0) {
        <svg
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
          role="img"
          [attr.aria-label]="ariaLabel()"
          (pointermove)="move($event)"
          (pointerdown)="move($event)"
        >
          @for (t of geo().ticks; track t.v) {
            <line
              class="grid"
              [attr.x1]="pad.left"
              [attr.x2]="width() - pad.right"
              [attr.y1]="t.y"
              [attr.y2]="t.y"
            />
            <text class="axis" [attr.x]="pad.left - 8" [attr.y]="t.y + 4" text-anchor="end">
              {{ t.label }}
            </text>
          }
          @for (x of geo().xLabels; track x.i) {
            <text class="axis" [attr.x]="x.x" [attr.y]="height() - 6" text-anchor="middle">
              {{ x.label }}
            </text>
          }
          @for (s of geo().paths; track s.name) {
            @if (s.area) {
              <path [attr.d]="s.area" [style.fill]="s.color" opacity="0.12" />
            }
            <path
              [attr.d]="s.d"
              fill="none"
              [style.stroke]="s.color"
              stroke-width="2.2"
              stroke-linejoin="round"
              [attr.stroke-dasharray]="s.dashed ? '6 5' : null"
            />
          }
          @if (hoverPoint(); as h) {
            <line
              class="guide"
              [attr.x1]="h.x"
              [attr.x2]="h.x"
              [attr.y1]="pad.top"
              [attr.y2]="height() - pad.bottom"
            />
            @for (p of h.points; track p.name) {
              <circle
                [attr.cx]="h.x"
                [attr.cy]="p.y"
                r="4"
                [style.fill]="p.color"
                stroke="var(--surface)"
                stroke-width="2"
              />
            }
          }
        </svg>
        @if (hoverPoint(); as h) {
          <div class="tip" [style.left.px]="h.tipLeft">
            <b>{{ xLabel()(h.i) }}</b>
            @for (p of h.points; track p.name) {
              <div><i [style.background]="p.color"></i>{{ p.name }}: {{ p.text }}</div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class LineChart {
  readonly series = input.required<readonly LineSeries[]>();
  readonly xLabel = input<(i: number) => string>((i) => String(i));
  readonly ariaLabel = input('Gráfica');
  readonly height = input(240);
  protected readonly pad = PAD;
  protected readonly hover = signal<number | null>(null);
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');
  protected readonly width = observeWidth(() => this.box());

  private readonly count = computed(() =>
    Math.max(0, ...this.series().map((s) => s.values.length)),
  );

  protected readonly geo = computed(() => {
    const w = this.width();
    const h = this.height();
    const n = this.count();
    const max = Math.max(0, ...this.series().flatMap((s) => s.values));
    const ticks = niceTicks(max);
    const top = ticks.at(-1) ?? 1;
    const plotW = Math.max(1, w - PAD.left - PAD.right);
    const plotH = Math.max(1, h - PAD.top - PAD.bottom);
    const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
    const every = labelEvery(n, plotW);
    const xLabels: { i: number; x: number; label: string }[] = [];
    for (let i = 0; i < n; i += every) xLabels.push({ i, x: x(i), label: this.xLabel()(i) });
    return {
      x,
      y,
      ticks: ticks.map((v) => ({ v, y: y(v), label: formatCOPShort(v) })),
      xLabels,
      paths: this.series().map((s) => {
        const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
        const d = pts.length ? 'M' + pts.join('L') : '';
        const last = s.values.length - 1;
        return {
          name: s.name,
          color: s.color,
          dashed: !!s.dashed,
          d,
          area:
            s.area && pts.length
              ? `${d}L${x(last).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`
              : '',
        };
      }),
    };
  });

  protected readonly hoverPoint = computed(() => {
    const i = this.hover();
    if (i === null) return null;
    const g = this.geo();
    const x = g.x(i);
    return {
      i,
      x,
      tipLeft: Math.min(Math.max(0, x + 12), Math.max(0, this.width() - 190)),
      points: this.series()
        .filter((s) => s.values[i] !== undefined)
        .map((s) => ({
          name: s.name,
          color: s.color,
          y: g.y(s.values[i] ?? 0),
          text: formatCOP(s.values[i] ?? 0),
        })),
    };
  });

  protected move(event: PointerEvent): void {
    const n = this.count();
    if (n === 0) return;
    const svg = event.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    const plotW = Math.max(1, this.width() - PAD.left - PAD.right);
    const rel = (event.clientX - rect.left - PAD.left) / plotW;
    this.hover.set(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  }
}
