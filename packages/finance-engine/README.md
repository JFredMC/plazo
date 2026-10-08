# @plazo/finance-engine

Motor financiero de Plazo. TypeScript puro, sin dependencias y determinista: los montos van en pesos enteros y las fechas como texto ISO.

| Módulo        | Qué hace                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `rates.ts`    | Convierte entre E.A., N.M.V. y M.V.; tasa por días desde una E.A.                                    |
| `loan.ts`     | Tabla de amortización (cuota fija o abono constante), seguros, cargos, abonos extra y costo efectivo |
| `cdt.ts`      | CDT con retención en la fuente, 4×1000, rentabilidad neta y comparación de plazos                    |
| `compare.ts`  | Comparador de ofertas de crédito y de CDT                                                            |
| `irr.ts`      | TIR (Newton con respaldo por bisección) para el costo efectivo                                       |
| `format.ts`   | Formato colombiano: `$1.234.567`, `23,99 %`, `7 oct 2026`                                            |
| `csv.ts`      | Exporta la tabla a CSV para Excel en español                                                         |
| `products.ts` | Productos y ofertas de ejemplo con entidades ficticias                                               |

## Fórmulas

- `MV = (1 + EA)^(1/12) − 1`, `NMV = 12 · MV`, `EA = (1 + MV)^12 − 1`.
- Cuota fija: `A = P · i / (1 − (1 + i)^−n)`, redondeada al peso. El interés de cada mes se redondea al peso y la última cuota absorbe la diferencia, así el saldo termina exactamente en cero.
- Abono constante: `P / n` de capital cada mes más el interés sobre el saldo.
- Abono extra para **reducir cuota**: se recalcula la cuota sobre el saldo y los meses que faltan. Para **reducir plazo**: se mantiene la cuota y el crédito termina antes.
- Costo efectivo: la TIR de lo recibido (monto − cobro inicial) frente a todos los pagos (cuota, seguro, cargos), expresada en E.A.
- CDT: `intereses = monto · ((1 + EA)^(días/base) − 1)`, retención = 4 % de los intereses (configurable) y 4×1000 opcional sobre el monto.

Las pruebas (`pnpm test`) comparan el motor con ejemplos calculados a mano y con las fórmulas.

> Los resultados son ilustrativos y no constituyen una oferta ni asesoría financiera.
