import { createMiddleware } from 'hono/factory'
import type { HonoEnv, HonoProject } from '../../hono'

let project: HonoProject | undefined

export const loadProjectInfo = createMiddleware<HonoEnv<HonoProject>>(
  async (ctx, next) => {
    if (!project) {
      const path = `./project.json`
      try {
        const content = await import(path)
        project = JSON.parse(content.default) as HonoProject
      } catch (e) {
        console.error(
          'Unable to load project.json',
          e instanceof Error ? e.message : e,
        )
      }
      if (!project) {
        return ctx.text('Project configuration not found', { status: 404 })
      }
    }
    ctx.set('project', project.project)
    ctx.set('config', project.config)
    return next()
  },
)
