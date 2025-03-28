import type { MiddlewareHandler } from 'hono'
import type { HonoComponent, HonoEnv } from '../../hono'
import { loadJsonFile } from './jsonLoader'

const components: Partial<Record<string, HonoComponent>> = {}

export const componentLoader =
  (name: string): MiddlewareHandler<HonoEnv<HonoComponent>> =>
  async (ctx, next) => {
    let component = components[name]
    if (!component) {
      component = await loadJsonFile<HonoComponent>(`./components/${name}.json`)
      if (!component) {
        return ctx.text('Component not found', { status: 404 })
      }
    }
    ctx.set('component', component.component)
    ctx.set('files', component.files)
    return next()
  }
