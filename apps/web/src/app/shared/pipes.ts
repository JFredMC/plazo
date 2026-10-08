import { Pipe, type PipeTransform } from '@angular/core';
import {
  formatCOP,
  formatCOPShort,
  formatDate,
  formatMonths,
  formatNumber,
  formatPercent,
} from '@plazo/finance-engine';

@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform = (v: number): string => formatCOP(v);
}

@Pipe({ name: 'copShort' })
export class CopShortPipe implements PipeTransform {
  transform = (v: number): string => formatCOPShort(v);
}

@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform = (fraction: number, decimals = 2): string => formatPercent(fraction, decimals);
}

@Pipe({ name: 'num' })
export class NumPipe implements PipeTransform {
  transform = (v: number, decimals = 0): string => formatNumber(v, decimals);
}

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform = (iso: string | undefined): string => formatDate(iso);
}

@Pipe({ name: 'meses' })
export class MesesPipe implements PipeTransform {
  transform = (months: number): string => formatMonths(months);
}
