import { initIsEqual } from '@toddledev/ssr/dist/rendering/equals'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { HonoEnv } from '../hono'
import { componentLoader } from './middleware/componentLoader'
import { pageLoader } from './middleware/pageLoader'
import { loadProjectInfo } from './middleware/projectInfo'
import { routesLoader } from './middleware/routesLoader'
import { proxyRequestHandler } from './routes/apiProxy'
import { customCode } from './routes/customCode'
import { customElement } from './routes/customElement'
import { favicon } from './routes/favicon'
import { fontRouter } from './routes/font'
import { manifest } from './routes/manifest'
import { robots } from './routes/robots'
import { serviceWorker } from './routes/serviceWorker'
import { sitemap } from './routes/sitemap'
import { stylesheetHandler } from './routes/stylesheetHandler'
import { toddlePage } from './routes/toddlePage'

// Inject isEqual on globalThis
// this is currently used by some builtin formulas
initIsEqual()

const app = new Hono<HonoEnv>()

// // Keep the project reference in memory for future requests
// let project: { files: ProjectFiles; project: ToddleProject }
// // Load the project onto context to make it easier to use for other routes
// app.use(async (c, next) => {
//   if (!project) {
//     const path = `./project.json`
//     try {
//       const content = await import(path)
//       project = JSON.parse(content.default) as {
//         files: ProjectFiles
//         project: ToddleProject
//       }
//     } catch (e) {
//       console.error(
//         'Unable to load project.json',
//         e instanceof Error ? e.message : e,
//       )
//     }
//     if (!project) {
//       return c.text('Project not found', { status: 404 })
//     }
//   }
//   c.set('project', project)
//   return next()
// })

app.get('/sitemap.xml', loadProjectInfo, routesLoader, sitemap)
app.get('/robots.txt', loadProjectInfo, robots)
app.get('/manifest.json', loadProjectInfo, manifest)
app.get('/favicon.ico', loadProjectInfo, favicon)
app.get('/serviceWorker.js', loadProjectInfo, serviceWorker)

// toddle specific endpoints/services on /.toddle/ subpath 👇
app.route('/.toddle/fonts', fontRouter)
app.get(
  '/.toddle/stylesheet/:pageName{.+.css}',
  createMiddleware((c, next) => {
    let pageName = c.req.param('pageName')
    // Remove the .css extension
    pageName = pageName.slice(0, '.css'.length * -1)
    return componentLoader(pageName)(c, next)
  }),
  stylesheetHandler,
) // single page
app.get('/.toddle/custom-code.js', customCode) // Single (or all) component
app.all(
  '/.toddle/omvej/components/:componentName/apis/:apiName',
  proxyRequestHandler,
)
app.get(
  '/.toddle/custom-element/:filename{.+.js}',
  loadProjectInfo,
  customElement,
) // project infor + single component

// Treat all other requests as route or page requests
// const rest = createFactory().createHandlers(
//   routesLoader,
//   // First we try loading a route if it exists
//   routeLoader,
//   (ctx, next) => {
//     const route = ctx.var.route
//     if (route) {
//       return routeHandler(ctx, route)
//     }
//     return next()
//   },
//   pageLoader,
//   toddlePage,
// )
app.get(
  '/*',
  routesLoader,
  loadProjectInfo,
  // First we try loading a route if it exists
  // routeLoader,
  // createMiddleware<HonoEnv<HonoRoute & HonoRoutes>>((ctx, next) => {
  //   const route = ctx.var.route
  //   if (route) {
  //     return routeHandler(ctx, route)
  //   }
  //   return next()
  // }),
  pageLoader,
  toddlePage,
) // routes + single page

export default app
