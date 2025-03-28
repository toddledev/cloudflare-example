import type { RouteDeclaration } from '@toddledev/core/dist/component/component.types'
import type { Route } from '@toddledev/ssr/dist/ssr.types'
import { createMiddleware } from 'hono/factory'
import type { HonoEnv, HonoRoutes } from '../../hono'
import { loadJsonFile } from './jsonLoader'

export interface Routes {
  pages: Record<string, { name: string; route: RouteDeclaration }>
  routes: Record<string, Route>
}

let routes: Routes | undefined

export const routesLoader = createMiddleware<HonoEnv<HonoRoutes>>(
  async (ctx, next) => {
    if (!routes) {
      routes = await loadJsonFile<Routes>('routes.json')
      if (!routes) {
        return ctx.text('Route declarations for project not found', {
          status: 404,
        })
      }
    }
    ctx.set('routes', routes)
    return next()
  },
)
