export abstract class ValueObject<Props extends Record<string, unknown>> {
  protected readonly props: Readonly<Props>;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<Props>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;

    const keys = Object.keys(this.props) as (keyof Props)[];
    return keys.every((key) => {
      const a = this.props[key];
      const b = other.props[key];
      if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
      return a === b;
    });
  }
}
