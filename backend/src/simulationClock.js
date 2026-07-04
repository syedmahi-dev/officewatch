function asDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return date;
}

export function createSimulationClock(options = {}) {
  const baseNow = options.now ?? (() => new Date());
  let overrideTime = options.initialOverride ? asDate(options.initialOverride) : null;

  return {
    now() {
      const source = overrideTime ?? asDate(baseNow());
      return new Date(source.getTime());
    },
    setOverride(value) {
      overrideTime = asDate(value);
      return new Date(overrideTime.getTime());
    },
    clearOverride() {
      overrideTime = null;
    },
    getOverride() {
      return overrideTime ? overrideTime.toISOString() : null;
    },
  };
}
