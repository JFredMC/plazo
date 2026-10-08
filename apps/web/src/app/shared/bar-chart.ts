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

export interface BarSeries {
  name: string;
  color: string;
  values: readonly number[];
}

const PAD = { top: 12, right: 8, bottom: 26, left: 58 };

/** Barras apiladas en SVG (p. ej. capital e intereses por año). */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .chart {
      position: relative;
      width: 100%;
    }
    svg {
      display: block;
    }
    .axis {
      fill: var(--muted);
      font: 11px var(--font);
    }
    .grid {
      stroke: var(--line);
    }
    rect.bar {
      transition: opacity 0.15s;
    }
    g.dim rect.bar {
      opacity: 0.45;
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
          @for (b of geo().bars; track b.i) {
            <g
              [class.dim]="hover() !== null && hover() !== b.i"
              (pointerenter)="hover.set(b.i)"
              (pointerdown)="hover.set(b.i)"
            >
              <rect
                [attr.x]="b.x - 2"
                [attr.y]="pad.top"
                [attr.width]="b.w + 4"
                [attr.height]="plotH()"
                fill="transparent"
              />
              @for (s of b.segs; track s.name) {
                <rect
                  class="bar"
                  [attr.x]="b.x"
                  [attr.y]="s.y"
                  [attr.width]="b.w"
                  [attr.height]="s.h"
                  [style.fill]="s.color"
                  rx="2"
                />
              }
              @if (b.showLabel) {
                <text
                  class="axis"
                  [attr.x]="b.x + b.w / 2"
                  [attr.y]="height() - 6"
                  text-anchor="middle"
                >
                  {{ labels()[b.i] }}
                </text>
              }
            </g>
          }
        </svg>
        @if (tip(); as t) {
          <div class="tip" [style.left.px]="t.left">
            <b>{{ t.label }}</b>
            @for (r of t.rows; track r.name) {
              <div><i [style.background]="r.color"></i>{{ r.name }}: {{ r.text }}</div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class BarChart {
  readonly series = input.required<readonly BarSeries[]>();
  readonly labels = input.required<readonly string[]>();
  readonly ariaLabel = input('Gráfica de barras');
  readonly height = input(240);
  protected readonly pad = PAD;
  protected readonly hover = signal<number | null>(null);
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');
  protected readonly width = observeWidth(() => this.box());
  protected readonly plotH = computed(() => Math.max(1, this.height() - PAD.top - PAD.bottom));

  protected readonly geo = computed(() => {
    const n = this.labels().length;
    const totals = this.labels().map((_, i) =>
      this.series().reduce((a, s) => a + Math.max(0, s.values[i] ?? 0), 0),
    );
    const ticks = niceTicks(Math.max(0, ...totals));
    const top = ticks.at(-1) ?? 1;
    const plotW = Math.max(1, this.width() - PAD.left - PAD.right);
    const plotH = this.plotH();
    const band = plotW / Math.max(1, n);
    const w = Math.max(2, Math.min(42, band * 0.64));
    const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
    const every = labelEvery(n, plotW, 40);
    return {
      ticks: ticks.map((v) => ({ v, y: y(v), label: formatCOPShort(v) })),
      bars: this.labels().map((_, i) => {
        let acc = 0;
        const segs = this.series().map((s) => {
          const v = Math.max(0, s.values[i] ?? 0);
          const y0 = y(acc);
          acc += v;
          const y1 = y(acc);
          return { name: s.name, color: s.color, y: y1, h: Math.max(0, y0 - y1) };
        });
        return { i, x: PAD.left + band * i + (band - w) / 2, w, segs, showLabel: i % every === 0 };
      }),
    };
  });

  protected readonly tip = computed(() => {
    const i = this.hover();
    if (i === null) return null;
    const plotW = Math.max(1, this.width() - PAD.left - PAD.right);
    const band = plotW / Math.max(1, this.labels().length);
    const x = PAD.left + band * (i + 1);
    return {
      label: this.labels()[i] ?? '',
      left: Math.min(Math.max(0, x), Math.max(0, this.width() - 200)),
      rows: this.series().map((s) => ({
        name: s.name,
        color: s.color,
        text: formatCOP(s.values[i] ?? 0),
      })),
    };
  });
}
