import { readFile } from "node:fs/promises"
import { join } from "node:path"

/** Logo officiel en data-URL, pour les images Open Graph générées. */
export async function logoDataUrl(): Promise<string> {
  const png = await readFile(join(process.cwd(), "public/brand/logo-radio-tripoint.png"))
  return `data:image/png;base64,${png.toString("base64")}`
}
