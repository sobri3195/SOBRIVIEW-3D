import type { Scalars, Vec3, Volume } from "./volume";
const types: Record<
  string,
  {
    bytes: number;
    ctor: (buffer: ArrayBuffer) => Scalars;
    read: (v: DataView, n: number, little: boolean) => number;
  }
> = {
  float: {
    bytes: 4,
    ctor: (b) => new Float32Array(b),
    read: (v, n, l) => v.getFloat32(n, l),
  },
  double: {
    bytes: 8,
    ctor: (b) => new Float64Array(b),
    read: (v, n, l) => v.getFloat64(n, l),
  },
  short: {
    bytes: 2,
    ctor: (b) => new Int16Array(b),
    read: (v, n, l) => v.getInt16(n, l),
  },
  ushort: {
    bytes: 2,
    ctor: (b) => new Uint16Array(b),
    read: (v, n, l) => v.getUint16(n, l),
  },
  int: {
    bytes: 4,
    ctor: (b) => new Int32Array(b),
    read: (v, n, l) => v.getInt32(n, l),
  },
  uint: {
    bytes: 4,
    ctor: (b) => new Uint32Array(b),
    read: (v, n, l) => v.getUint32(n, l),
  },
  char: {
    bytes: 1,
    ctor: (b) => new Int8Array(b),
    read: (v, n) => v.getInt8(n),
  },
  uchar: {
    bytes: 1,
    ctor: (b) => new Uint8Array(b),
    read: (v, n) => v.getUint8(n),
  },
};
const aliases: Record<string, string> = {
  float32: "float",
  float64: "double",
  int8: "char",
  uint8: "uchar",
  int16: "short",
  uint16: "ushort",
  int32: "int",
  uint32: "uint",
  "unsigned short": "ushort",
  "signed short": "short",
  "unsigned char": "uchar",
  "signed char": "char",
  "unsigned int": "uint",
};
export type NrrdInfo = {
  fields: Record<string, string>;
  dimensions: Vec3;
  directions: number[][];
  origin: Vec3;
  space: string;
  offset: number;
  type: string;
  expectedBytes: number;
};
export function readNrrdHeader(bytes: Uint8Array): NrrdInfo {
  let end = -1,
    offset = 0;
  for (let i = 0; i < Math.min(bytes.length - 1, 65536); i++) {
    if (bytes[i] === 10 && bytes[i + 1] === 10) {
      end = i;
      offset = i + 2;
      break;
    }
    if (
      bytes[i] === 13 &&
      bytes[i + 1] === 10 &&
      bytes[i + 2] === 13 &&
      bytes[i + 3] === 10
    ) {
      end = i;
      offset = i + 4;
      break;
    }
  }
  if (end < 0) throw new Error("NRRD header is missing or too large.");
  const text = new TextDecoder().decode(bytes.subarray(0, end));
  if (!/^NRRD000[1-5]\r?\n/.test(text))
    throw new Error(
      "Not a supported NRRD file (HTML and pointers are not volume data).",
    );
  const fields: Record<string, string> = {};
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const p = line.indexOf(":");
    if (p > 0)
      fields[line.slice(0, p).trim().toLowerCase()] = line.slice(p + 1).trim();
  }
  if (
    fields.dimension !== "3" ||
    fields["data file"] ||
    fields["byte skip"] ||
    fields["line skip"]
  )
    throw new Error(
      "Only attached scalar 3D NRRD volumes without byte/line skips are supported.",
    );
  if (
    fields.kinds &&
    fields.kinds.split(/\s+/).some((k) => !["domain", "space"].includes(k))
  )
    throw new Error("Vector/time NRRD is not supported.");
  const type = aliases[fields.type] || fields.type;
  if (!types[type])
    throw new Error(`Unsupported NRRD scalar type: ${fields.type}`);
  const dimensions = fields.sizes?.split(/\s+/).map(Number) as Vec3;
  if (
    dimensions?.length !== 3 ||
    dimensions.some((n) => !Number.isInteger(n) || n < 1)
  )
    throw new Error("Invalid NRRD dimensions.");
  const expectedBytes =
    dimensions.reduce((a, b) => a * b, 1) * types[type].bytes;
  if (!Number.isSafeInteger(expectedBytes))
    throw new Error("NRRD dimensions exceed safe integer limits.");
  const tuple = (s: string) => s.replace(/[()]/g, "").split(",").map(Number);
  const directions = (
    fields["space directions"]?.match(/\([^)]+\)|none/g) || []
  ).map(tuple);
  const origin = tuple(fields["space origin"] || "") as Vec3;
  if (
    directions.length !== 3 ||
    directions.some(
      (v) => v.length !== 3 || v.some((n) => !Number.isFinite(n)),
    ) ||
    origin.length !== 3 ||
    origin.some((n) => !Number.isFinite(n))
  )
    throw new Error("NRRD needs finite space directions and origin.");
  const space = fields.space?.toLowerCase();
  if (
    ![
      "left-posterior-superior",
      "right-anterior-superior",
      "lps",
      "ras",
    ].includes(space)
  )
    throw new Error(
      "NRRD coordinate space must explicitly identify LPS or RAS.",
    );
  if (types[type].bytes > 1 && !["little", "big"].includes(fields.endian))
    throw new Error("NRRD endian is missing or unsupported.");
  if (!["gzip", "gz", "raw"].includes(fields.encoding))
    throw new Error("Only gzip/raw NRRD encoding is supported.");
  return {
    fields,
    dimensions,
    directions,
    origin,
    space,
    offset,
    type,
    expectedBytes,
  };
}
export async function parseNrrd(
  buffer: ArrayBuffer,
  source: Volume["source"],
): Promise<Volume> {
  const bytes = new Uint8Array(buffer),
    h = readNrrdHeader(bytes),
    t = types[h.type];
  if (h.expectedBytes > 256 * 1024 * 1024)
    throw new Error(
      "NRRD exceeds the 256 MB decoded-volume limit; prepare a resampled preview offline.",
    );
  let payload = buffer.slice(h.offset);
  if (h.fields.encoding !== "raw") {
    if (typeof DecompressionStream === "undefined")
      throw new Error("Browser cannot decompress NRRD gzip data.");
    payload = await new Response(
      new Blob([payload]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
  }
  if (payload.byteLength !== h.expectedBytes)
    throw new Error(
      `NRRD voxel buffer length mismatch: ${payload.byteLength} / ${h.expectedBytes}.`,
    );
  let scalarData = t.ctor(payload);
  const littleHost = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  if (t.bytes > 1 && (h.fields.endian === "little") !== littleHost) {
    const view = new DataView(payload);
    scalarData = t.ctor(new ArrayBuffer(payload.byteLength));
    for (let i = 0; i < scalarData.length; i++)
      scalarData[i] = t.read(view, i * t.bytes, h.fields.endian === "little");
  }
  const units = (h.fields["space units"]?.match(/"[^"]*"/g) || []).map((s) =>
    s.slice(1, -1).toLowerCase(),
  );
  const factors = units.map((s) => ({ mm: 1, cm: 10, m: 1000 })[s]);
  const known = factors.length === 3 && factors.every((n) => n !== undefined);
  const ras = h.space === "ras" || h.space === "right-anterior-superior";
  const convert = (v: number[]) =>
    v.map((n, i) => n * (known ? factors[i]! : 1) * (ras && i < 2 ? -1 : 1));
  const directions = h.directions.map(convert),
    origin = convert(h.origin) as Vec3;
  const spacing = directions.map((v) => Math.hypot(...v)) as Vec3;
  if (spacing.some((n) => n <= 0))
    throw new Error("NRRD spacing must be positive.");
  const normalized = directions.map((v, i) => v.map((n) => n / spacing[i]));
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      if (
        Math.abs(
          normalized[i].reduce((s, n, k) => s + n * normalized[j][k], 0),
        ) > 1e-4
      )
        throw new Error(
          "Sheared NRRD axes require external physical resampling.",
        );
  let low = Infinity,
    high = -Infinity;
  for (let i = 0; i < scalarData.length; i++) {
    const n = scalarData[i];
    if (!Number.isFinite(n))
      throw new Error("NRRD has non-finite voxel values.");
    if (n < low) low = n;
    if (n > high) high = n;
  }
  return {
    scalarData,
    dimensions: h.dimensions,
    spacing,
    origin,
    direction: normalized.flat() as Volume["direction"],
    spatialUnit: known ? "mm" : "unknown",
    source: { ...source, space: h.space },
    intensity: {
      unit: "Intensity",
      calibration:
        "Native NRRD values; no modality rescale or HU calibration is assumed.",
    },
    range: [low, high],
  };
}
