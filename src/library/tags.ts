/** Reads title / artist / album / cover from ID3v2 tags (MP3). */
export interface Tags {
  title?: string;
  artist?: string;
  album?: string;
  picture?: { mime: string; data: Uint8Array };
}

function decodeText(bytes: Uint8Array, encoding: number): string {
  let label = "latin1";
  if (encoding === 1) label = "utf-16";
  else if (encoding === 2) label = "utf-16be";
  else if (encoding === 3) label = "utf-8";
  try {
    return new TextDecoder(label).decode(bytes).replace(/\0+$/g, "").split("\0")[0].trim();
  } catch {
    return "";
  }
}

const synchsafe = (b: Uint8Array, o: number) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];
const plain32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

/** index just past the null terminator that starts at `from` */
function afterTerminator(b: Uint8Array, from: number, wide: boolean): number {
  if (!wide) {
    let i = from;
    while (i < b.length && b[i] !== 0) i++;
    return i + 1;
  }
  let i = from;
  while (i + 1 < b.length && !(b[i] === 0 && b[i + 1] === 0)) i += 2;
  return i + 2;
}

export function readId3(buf: ArrayBuffer): Tags {
  const b = new Uint8Array(buf);
  if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return {};
  const version = b[3];
  if (version < 3 || version > 4) return {};
  const end = Math.min(b.length, 10 + synchsafe(b, 6));
  let p = 10;
  if (b[5] & 0x40) p += version === 4 ? synchsafe(b, 10) : plain32(b, 10) + 4; // extended header
  const tags: Tags = {};
  while (p + 10 <= end) {
    const id = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break; // padding
    const size = version === 4 ? synchsafe(b, p + 4) : plain32(b, p + 4);
    const body = b.subarray(p + 10, p + 10 + size);
    p += 10 + size;
    if (!size || body.length < size) break;
    const enc = body[0];
    if (id === "TIT2") tags.title = decodeText(body.subarray(1), enc);
    else if (id === "TPE1") tags.artist = decodeText(body.subarray(1), enc);
    else if (id === "TALB") tags.album = decodeText(body.subarray(1), enc);
    else if (id === "APIC" && !tags.picture) {
      const mimeEnd = afterTerminator(body, 1, false);
      const mime = decodeText(body.subarray(1, mimeEnd - 1), 0) || "image/jpeg";
      const descEnd = afterTerminator(body, mimeEnd + 1, enc === 1 || enc === 2);
      tags.picture = { mime: mime.includes("/") ? mime : `image/${mime.toLowerCase()}`, data: body.slice(descEnd) };
    }
  }
  return tags;
}

/** "01 - Artist - Song Name.mp3" -> { artist, title } */
export function tagsFromFilename(name: string): { title: string; artist?: string } {
  const base = name.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/^\d{1,3}[\s._-]+/, "").replace(/_/g, " ").trim();
  const parts = base.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  return { title: base || name };
}
