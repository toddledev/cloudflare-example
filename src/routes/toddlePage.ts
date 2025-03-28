import { ToddleComponent } from '@toddledev/core/dist/component/ToddleComponent'
import { type ToddleServerEnv } from '@toddledev/core/dist/formula/formula'
import { theme as defaultTheme } from '@toddledev/core/dist/styling/theme.const'
import type { ToddleInternals } from '@toddledev/core/dist/types'
import { isDefined } from '@toddledev/core/dist/utils/util'
import { takeIncludedComponents } from '@toddledev/ssr/dist/components/utils'
import { renderPageBody } from '@toddledev/ssr/dist/rendering/components'
import { getPageFormulaContext } from '@toddledev/ssr/dist/rendering/formulaContext'
import {
  getHeadItems,
  renderHeadItems,
} from '@toddledev/ssr/dist/rendering/head'
import { getCharset, getHtmlLanguage } from '@toddledev/ssr/dist/rendering/html'
import { hasCustomCode } from '@toddledev/ssr/src/custom-code/codeRefs'
import { removeTestData } from '@toddledev/ssr/src/rendering/testData'
import type { Context } from 'hono'
import { html, raw } from 'hono/html'
import type { HonoEnv, HonoPage, HonoProject, HonoRoutes } from '../../hono'

export const toddlePage = async (
  c: Context<HonoEnv<HonoProject & HonoRoutes & HonoPage>>,
) => {
  const project = c.var.project
  const files = c.var.files
  console.log({ files })
  const page = c.var.page
  console.log({ page })
  const url = new URL(c.req.url)
  const formulaContext = getPageFormulaContext({
    component: page,
    branchName: 'main',
    req: c.req.raw,
    logErrors: true,
    files,
  })
  const language = getHtmlLanguage({
    pageInfo: page.route.info,
    formulaContext,
    defaultLanguage: 'en',
  })

  // Find the theme to use for the page
  const theme =
    (files.themes ? Object.values(files.themes)[0] : files.config?.theme) ??
    defaultTheme

  // Get all included components on the page
  const includedComponents = takeIncludedComponents({
    root: page,
    projectComponents: files.components,
    packages: files.packages,
    includeRoot: true,
  })

  const toddleComponent = new ToddleComponent<string>({
    component: page,
    getComponent: (name, packageName) => {
      const nodeLookupKey = [packageName, name].filter(isDefined).join('/')
      const component = packageName
        ? files.packages?.[packageName]?.components[name]
        : files.components[name]
      if (!component) {
        console.warn(`Unable to find component ${nodeLookupKey} in files`)
        return undefined
      }

      return component
    },
    packageName: undefined,
    globalFormulas: {
      formulas: files.formulas,
      packages: files.packages,
    },
  })
  const head = renderHeadItems({
    headItems: getHeadItems({
      url,
      // This refers to the endpoint we created in fontRouter for our proxied stylesheet
      cssBasePath: '/.toddle/fonts/stylesheet/css2',
      // Just to be explicit about where to grab the reset stylesheet from
      resetStylesheetPath: '/_static/reset.css',
      // This refers to the stylesheet endpoint declared in index.ts
      pageStylesheetPath: `/.toddle/stylesheet/${page.name}.css`,
      page: toddleComponent,
      files: files,
      project,
      context: formulaContext,
      theme,
    }),
  })
  const { html: body } = await renderPageBody({
    component: toddleComponent,
    formulaContext,
    env: formulaContext.env as ToddleServerEnv,
    req: c.req.raw,
    files: files,
    includedComponents,
    evaluateComponentApis: async (_) => ({
      // TODO: Show an example of how to evaluate APIs - potentially using an adapter
    }),
    projectId: 'my_project',
  })
  const charset = getCharset({
    pageInfo: toddleComponent.route?.info,
    formulaContext,
  })

  // Prepare the data to be passed to the client for hydration
  const toddleInternals: ToddleInternals = {
    project: project.short_id,
    branch: 'main',
    commit: 'unknown',
    pageState: formulaContext.data,
    component: removeTestData(page),
    components: includedComponents.map(removeTestData),
    isPageLoaded: false,
    cookies: Object.keys(formulaContext.env.request.cookies),
  }
  const usesCustomCode = hasCustomCode(toddleComponent, c.var.files)
  let codeImport = ''
  if (usesCustomCode) {
    const customCodeSearchParams = new URLSearchParams([
      ['entry', toddleComponent.name],
    ])
    codeImport = `
            <script type="module">
              import { initGlobalObject, createRoot } from '/_static/page.main.esm.js';
              import { loadCustomCode, formulas, actions } from '/.toddle/custom-code.js?${customCodeSearchParams.toString()}';

              window.__toddle = ${JSON.stringify(toddleInternals).replaceAll(
                '</script>',
                '<\\/script>',
              )};
              window.__toddle.components = [window.__toddle.component, ...window.__toddle.components];
              initGlobalObject({formulas, actions});
              loadCustomCode();
              createRoot(document.getElementById("App"));
            </script>
          `
  } else {
    codeImport = `
        <script type="module">
          import { initGlobalObject, createRoot } from '/_static/page.main.esm.js';

          window.__toddle = ${JSON.stringify(toddleInternals).replaceAll(
            '</script>',
            '<\\/script>',
          )};
          window.__toddle.components = [window.__toddle.component, ...window.__toddle.components];
          initGlobalObject({formulas: {}, actions: {}});
          createRoot(document.getElementById("App"));
        </script>
    `
  }

  return c.html(
    html`<!doctype html>
      <html lang="${language}">
        <head>
          ${raw(head)} ${raw(codeImport)}
        </head>
        <body>
          <div id="App">${raw(body)}</div>
        </body>
      </html>`,
    {
      headers: {
        'Content-Type': `text/html; charset=${charset}`,
      },
    },
  )
}
