interface MapReplacerData {
  dataType: 'Map' | 'Set';
  value: [[string, unknown]];
}

function replacer(key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()),
    };
  }
  if (value instanceof Set) {
    return {
      dataType: 'Set',
      value: Array.from(value.values()), // or with spread: value: [...value]
    };
  }
  return value;
}

function reviver(key: string, value: unknown): unknown {
  if (isMapReplacerData(value)) {
    if (value.dataType == 'Map') {
      return new Map(value.value);
    }
    if (value.dataType == 'Set') {
      return new Set(value.value);
    }
  }
  return value;
}

export function copy<T>(obj: T): T {
  const str = serializeObj(obj);
  return deserializeObj<T>(str);
}

export function serializeObj<T>(obj: T): string {
  return JSON.stringify(obj, replacer);
}

export function deserializeObj<T>(serializedObj: string): T {
  return JSON.parse(serializedObj, reviver) as T;
}

function isMapReplacerData(value: unknown): value is MapReplacerData {
  return isObject(value) && (value.dataType === 'Map' || value.dataType === 'Set');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
