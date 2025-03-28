import { applyFormula } from '@toddledev/core/dist/formula/formula'
import { validateUrl } from '@toddledev/core/dist/utils/url'
import { isDefined } from '@toddledev/core/dist/utils/util'
import type { Context } from 'hono'
import { stream } from 'hono/streaming'
import type { HonoEnv, HonoProject } from '../../hono'

export const favicon = async (c: Context<HonoEnv<HonoProject>>) => {
  try {
    const iconUrl = applyFormula(
      c.var.config?.meta?.icon?.formula,
      undefined as any,
    )
    const validIconUrl = validateUrl(iconUrl)
    if (validIconUrl) {
      // return a (streamed) response with the icon
      const { body, ok, headers: iconHeaders } = await fetch(validIconUrl)
      if (ok && body) {
        c.header('Cache-Control', 'public, max-age=3600')
        const contentType = iconHeaders.get('content-type')
        if (isDefined(contentType)) {
          c.header('Content-Type', contentType)
        }
        return stream(c, (s) => s.pipe(body as any))
      }
    }
  } catch (e) {
    console.error(e)
  }
  return new Response(null, { status: 404 })
}
