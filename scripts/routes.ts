import type {
  Component,
  RouteDeclaration,
} from '@toddledev/core/dist/component/component.types'
import { isPageComponent } from '@toddledev/core/dist/component/isPageComponent'
import { takeIncludedComponents } from '@toddledev/ssr/dist/components/utils'
import type {
  ProjectFiles,
  Route,
  ToddleProject,
} from '@toddledev/ssr/dist/ssr.types'

interface Routes {
  pages: Record<string, { name: string; route: RouteDeclaration }>
  routes: Record<string, Route>
}

type Files = Record<string, { component: Component; files: ProjectFiles }>

export const splitRoutes = (
  json: ToddleProject & { files: ProjectFiles },
): {
  project: { project: ToddleProject; config: ProjectFiles['config'] }
  routes: Routes
  files: Files
} => {
  const filesMap: Files = {}
  const { files, ...project } = json

  const routes: Routes = {
    routes: { ...(files.routes ?? {}) },
    pages: {},
  }
  Object.entries(files.components ?? {}).forEach(([name, component]) => {
    if (component) {
      if (isPageComponent(component)) {
        routes.pages[name] = {
          name,
          route: {
            path: component.route.path,
            query: component.route.query,
          },
        }
      }
      const components = takeIncludedComponents({
        root: component,
        projectComponents: files.components,
        packages: files.packages,
        includeRoot: true,
      })
      filesMap[name] = {
        component,
        files: {
          ...files,
          components: Object.fromEntries(components.map((c) => [c.name, c])),
          // Routes are not necessary in output files for components
          routes: undefined,
        },
      }
    }
  })

  return { routes, files: filesMap, project: { project, config: files.config } }
}
