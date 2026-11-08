// Tiny Explicit VR Little Endian CT phantom, generated for decoder tests.
export function dicomFixture(slice = 0) {
  const chunks: Uint8Array[] = [
    new Uint8Array(128),
    new TextEncoder().encode("DICM"),
  ];
  function element(
    group: number,
    tag: number,
    vr: string,
    value: string | number[],
  ) {
    let data: Uint8Array;
    if (typeof value === "string") {
      const str = value + (value.length % 2 ? (vr === "UI" ? "\0" : " ") : "");
      data = new TextEncoder().encode(str);
    } else {
      data = new Uint8Array(value.length * (vr === "UL" ? 4 : 2));
      const view = new DataView(data.buffer);
      value.forEach((v, i) =>
        vr === "UL"
          ? view.setUint32(i * 4, v, true)
          : view.setUint16(i * 2, v, true),
      );
    }
    const long = ["OB", "OW", "SQ", "UN", "UT"].includes(vr);
    const header = new Uint8Array(long ? 12 : 8),
      view = new DataView(header.buffer);
    view.setUint16(0, group, true);
    view.setUint16(2, tag, true);
    header[4] = vr.charCodeAt(0);
    header[5] = vr.charCodeAt(1);
    if (long) view.setUint32(8, data.length, true);
    else view.setUint16(6, data.length, true);
    chunks.push(header, data);
  }
  element(2, 0, "UL", [28]);
  element(2, 0x10, "UI", "1.2.840.10008.1.2.1");
  element(8, 0x16, "UI", "1.2.840.10008.5.1.4.1.1.2");
  element(8, 0x18, "UI", `1.2.826.0.1.3680043.10.999.${slice + 1}`);
  element(8, 0x60, "CS", "CT");
  element(0x20, 0x0d, "UI", "1.2.826.0.1.3680043.10.999.100");
  element(0x20, 0x0e, "UI", "1.2.826.0.1.3680043.10.999.200");
  element(0x20, 0x13, "IS", String(slice + 1));
  element(0x20, 0x32, "DS", `0\\0\\${slice}`);
  element(0x20, 0x37, "DS", "1\\0\\0\\0\\1\\0");
  element(0x20, 0x52, "UI", "1.2.826.0.1.3680043.10.999.300");
  element(0x28, 2, "US", [1]);
  element(0x28, 4, "CS", "MONOCHROME2");
  element(0x28, 0x10, "US", [32]);
  element(0x28, 0x11, "US", [32]);
  element(0x28, 0x30, "DS", "1\\1");
  element(0x28, 0x100, "US", [16]);
  element(0x28, 0x101, "US", [16]);
  element(0x28, 0x102, "US", [15]);
  element(0x28, 0x103, "US", [0]);
  element(0x28, 0x1050, "DS", "40");
  element(0x28, 0x1051, "DS", "400");
  element(0x28, 0x1052, "DS", "-1024");
  element(0x28, 0x1053, "DS", "1");
  element(
    0x7fe0,
    0x10,
    "OW",
    Array.from({ length: 1024 }, (_, i) =>
      Math.hypot((i % 32) - 16, Math.floor(i / 32) - 16) < 10
        ? 1064 + slice * 50
        : 0,
    ),
  );
  const bytes = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
