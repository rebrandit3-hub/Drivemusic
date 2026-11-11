import { readId3, tagsFromFilename } from "./tags";

/** builds a minimal ID3v2.3 tag */
function id3(frames: [string, Uint8Array][]): ArrayBuffer {
  const body = frames.flatMap(([id, data]) => {
    const head = new Uint8Array(10);
    head.set([...id].map((c) => c.charCodeAt(0)));
    new DataView(head.buffer).setUint32(4, data.length);
    return [head, data];
  });
  const size = body.reduce((n, b) => n + b.length, 0);
  const header = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, (size >> 21) & 127, (size >> 14) & 127, (size >> 7) & 127, size & 127]);
  const out = new Uint8Array(10 + size);
  out.set(header);
  let o = 10;
  for (const b of body) {
    out.set(b, o);
    o += b.length;
  }
  return out.buffer;
}
const text = (s: string, enc = 3) => new Uint8Array([enc, ...new TextEncoder().encode(s)]);
const utf16 = (s: string) => {
  const bytes = [1, 0xff, 0xfe];
  for (const c of s) bytes.push(c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8);
  return new Uint8Array(bytes);
};

it("reads title, artist and album", () => {
  const tags = readId3(id3([["TIT2", text("Café Nights")], ["TPE1", utf16("Lumi")], ["TALB", text("Waves", 0)]]));
  expect(tags).toEqual({ title: "Café Nights", artist: "Lumi", album: "Waves" });
});

it("extracts embedded cover art", () => {
  const pic = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
  const apic = new Uint8Array([0, ...new TextEncoder().encode("image/jpeg"), 0, 3, 0, ...pic]);
  const tags = readId3(id3([["APIC", apic]]));
  expect(tags.picture?.mime).toBe("image/jpeg");
  expect([...tags.picture!.data]).toEqual([...pic]);
});

it("ignores files without tags", () => {
  expect(readId3(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).buffer)).toEqual({});
});

it.each([
  ["03 - Nova Reyes - Midnight Drive.mp3", { artist: "Nova Reyes", title: "Midnight Drive" }],
  ["my_song.m4a", { title: "my song" }],
])("names %s", (name, expected) => {
  expect(tagsFromFilename(name)).toEqual(expected);
});
