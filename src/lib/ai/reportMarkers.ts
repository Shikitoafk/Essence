/** Tolerate a lost closing bracket on a complete, standalone protocol marker.
 * Never infer a missing END or turn prose mentioning a marker into framing.
 */
export function normaliseReportMarkers(raw: string): string {
  return raw.replace(
    /^\s*<<<(SECTION:[1-9]|CARD|ENDCARD|KEEP|ENDKEEP|SCAN|ENDSCAN|READING|ENDREADING|END)>{1,3}[ \t]*\r?$/gm,
    "<<<$1>>>",
  );
}
