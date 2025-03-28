import type { Component } from '@toddledev/core/dist/component/component.types'
import { isPageComponent } from '@toddledev/core/dist/component/isPageComponent'
import { matchPageForUrl } from '@toddledev/ssr/dist/routing/routing'
import type { ProjectFiles } from '@toddledev/ssr/dist/ssr.types'
import type { MiddlewareHandler } from 'hono'
import type { HonoEnv, HonoPage, HonoRoutes } from '../../hono'
import { loadJsonFile } from './jsonLoader'

export const pageLoader: MiddlewareHandler<
  HonoEnv<HonoRoutes & HonoPage>
> = async (ctx, next) => {
  const url = new URL(ctx.req.url)
  const page = matchPageForUrl({
    url,
    components: ctx.var.routes.pages,
  })
  if (page) {
    const pageContent = await loadJsonFile<{
      component: Component
      files: ProjectFiles
    }>(`./components/${page.name}.json`)
    if (!pageContent || !isPageComponent(pageContent.component)) {
      return ctx.text('Page content not found', { status: 404 })
    }
    ctx.set('page', pageContent.component)
    ctx.set('files', pageContent.files)
    return next()
  }
  return next()
}
