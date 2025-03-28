import { applyFormula } from '@toddledev/core/dist/formula/formula'
import { validateUrl } from '@toddledev/core/dist/utils/url'
import type { Context } from 'hono'
import { stream } from 'hono/streaming'
import type { HonoEnv, HonoProject } from '../../hono'

const MANIFEST_CONTENT_TYPE = 'application/manifest+json'

export const manifest = async (c: Context<HonoEnv<HonoProject>>) => {
  try {
    const manifestUrl = applyFormula(
      c.var.config?.meta?.manifest?.formula,
      undefined as any,
    )
    const validManifestUrl = validateUrl(manifestUrl)
    if (typeof validManifestUrl === 'string') {
      // return a (streamed) response with the body from the manifest file
      const { body, ok } = await fetch(manifestUrl)
      if (ok && body) {
        c.header('Content-Type', MANIFEST_CONTENT_TYPE)
        c.header('Cache-Control', `public, max-age=3600`)
        return stream(c, (s) => s.pipe(body as any))
      }
    }
  } catch (e) {
    console.error(e)
  }
  return new Response(null, { status: 404 })
}
