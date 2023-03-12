export function classNames(...args: any[]) {
  const classes: string[] = [];

  for (const arg of args) {
    if (!arg) continue;

    const argType = typeof arg;

    if (argType === 'string') {
      classes.push(arg);
    } else if (arg !== null && argType === 'object' && !Array.isArray(arg)) {
      Object.entries(arg).forEach(([key, value]) => {
        if (value) {
          classes.push(key);
        }
      });
    }
  }

  return classes.join(' ');
}

export const isNumeric = (n: any) => (!isNaN(parseFloat(n)) && isFinite(n));

export const toFixed = (input: any, fractionDigits: number) => {
  return parseFloat(input as string).toFixed(fractionDigits);
}

export const capitalize = (input: string) => {
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
}
