// Shared type-level helpers for the fixture type checks.
export type Extra<F, S0, P extends string = ""> = [S0] extends [undefined | null]
  ? never
  : unknown extends S0
    ? never
    : F extends readonly unknown[]
      ? NonNullable<S0> extends readonly unknown[]
        ? Extra<F[number], NonNullable<S0>[number], `${P}[]`>
        : never
      : F extends object
        ? {
            [K in keyof F & string]: K extends keyof NonNullable<S0>
              ? Extra<F[K], NonNullable<S0>[K], `${P}.${K}`>
              : `${P}.${K}`;
          }[keyof F & string]
        : never;

export type Assert<T extends true> = T;
export type NoExtra<F, S> = [Extra<F, S>] extends [never] ? true : { sdkTypeLacksKeys: Extra<F, S> };


/** JSON imports widen literals to string/number/boolean; widen the SDK type the same way. */
export type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? Widen<U>[]
        : T extends object
          ? { [K in keyof T]: Widen<T[K]> }
          : T;
