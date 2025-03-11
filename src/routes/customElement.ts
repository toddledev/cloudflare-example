import { safeCustomElementName } from '@toddledev/core/dist/utils/customElements'
import { isDefined } from '@toddledev/core/dist/utils/util'
import { takeIncludedComponents } from '@toddledev/ssr/dist/components/utils'
import { removeTestData } from '@toddledev/ssr/dist/rendering/testData'
import { replaceTagInNodes } from '@toddledev/ssr/dist/utils/tags'
import { getFontCssUrl } from '@toddledev/ssr/src/rendering/fonts'
import { escapeSearchParameter } from '@toddledev/ssr/src/rendering/request'
import { transformRelativePaths } from '@toddledev/ssr/src/utils/media'
import type { Context } from 'hono'
import type { HonoEnv } from '../../hono'

export const customElement = async (
  ctx: Context<HonoEnv, '/.toddle/custom-element/:filename{.+.js}'>,
) => {
  const url = new URL(ctx.req.url)
  // Get name of the component from the URL path (e.g. https://toddle.dev/.toddle/custom-element/MyComponent.js) -> MyComponent
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const name = ctx.req.param('filename')?.replace('.js', '')
  const errorResponse = (error: string, status: 403 | 404) =>
    ctx.json(
      {
        error,
        info: `Please see https://toddle.dev/docs/export-component for more information on web component export`,
      },
      {
        headers: {
          // Allow all origins for error responses.
          // This is useful for debugging if a web component doesn't load/work
          'Access-Control-Allow-Origin': '*',
        },
        status,
      },
    )
  const { files, project } = ctx.var.project
  try {
    const component = Object.values(files.components).find(
      (c) => c!.name === name,
    )
    if (!component) {
      return errorResponse(
        `Unable to find component ${escapeSearchParameter(name)}`,
        404,
      )
    }

    if (component.route) {
      return errorResponse(
        `Pages are not supported as custom elements, only components`,
        403,
      )
    }

    const themes = files.themes ?? {}
    const fontsToLoad = Object.values(themes).flatMap((theme) => theme.fonts)
    const includedComponents = takeIncludedComponents({
      root: component,
      projectComponents: files.components,
      packages: files.packages,
    })
    const customCodeSearchParams = new URLSearchParams([
      ['entry', component.name],
    ])
    const fontStylesheetUrl = getFontCssUrl({
      fonts: fontsToLoad,
      baseForAbsoluteUrls: url.origin,
    })
    const content = `/*
 * This file is autogenerated by toddle and should not be edited manually.
 *
 * <${safeCustomElementName(component.name)} />
 *
 * Attributes:
 *
 * ${Object.entries(component.attributes ?? {})
   .map(([, attr]) => `- ${attr.name}`)
   .join('\n * ')}
 *
 * Events:
 *
 * ${Object.entries(component.events ?? {})
   .map(([, event]) => `- ${event.name}`)
   .join('\n * ')}
 */

import { defineComponents, loadCorePlugins } from '/_static/esm-custom-element.main.js';
import { loadCustomCode, formulas, actions } from '/.toddle/custom-code.js?${customCodeSearchParams.toString()}';

${
  isDefined(fontStylesheetUrl)
    ? `
    // Font loading in shadow-dom is not supported widely, so we inject in <head>
    // Ideally, we would inject the stylesheet directly in the ToddleComponent,
    // but it appears it doesn't fetch the fonts - only the stylesheet
    // See https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#referencing_external_styles
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "stylesheet");
    linkElem.setAttribute("href", "${fontStylesheetUrl.swap}");
    document.head.appendChild(linkElem);`
    : ''
}

// Global toddle object
const toddle = (() => {
  const legacyActions = {}
  const legacyFormulas = {}
  const argumentInputDataList = {}
  return {
    formulas,
    actions,
    errors:[],
    project:"${project.name}",
    branch:"main",
    commit:"unknown",
    registerAction: (name, handler) => {
      if (legacyActions[name]) {
        console.error('There already exists an action with the name ', name)
        return
      }
      legacyActions[name] = handler
    },
    getAction: (name) => legacyActions[name],
    registerFormula: (name,handler,getArgumentInputData) => {
      if (legacyFormulas[name]) {
        console.error('There already exists a formula with the name ', name)
        return
      }
      legacyFormulas[name] = handler
      if (getArgumentInputData) {
        argumentInputDataList[name] = getArgumentInputData
      }
    },
    getFormula: (name) => legacyFormulas[name],
    getCustomAction: (name, packageName) => {
      return actions[packageName ?? "${project.name}"]?.[name] ?? actions["${
        project.name
      }"]?.[name]
    },
    getCustomFormula: (name, packageName) => {
      return formulas[packageName ?? "${project.name}"]?.[name] ?? formulas["${
        project.name
      }"]?.[name]
    },
    getArgumentInputData: (formulaName,args,argIndex,data
    ) => argumentInputDataList[formulaName]?.(args, argIndex, data) || data,
    data: {},
    locationSignal: null,
    eventLog: [],
    pageState: {},
    env: {
      isServer: false,
      branchName: "main",
      request: undefined,
    }
  }
})();

// Load core plugin (actions and formulas)
loadCorePlugins(toddle);

// Load project's custom actions and formulas
loadCustomCode();

// toddle.isEqual is required for some formulas to work. TODO: Remove this once they can consume from somewhere else.
if(!globalThis.toddle || !globalThis.toddle.isEqual) {
  globalThis.toddle = {
    isEqual: toddle.isEqual,
  }
}

// Define the custom element
defineComponents(${JSON.stringify([component.name])}, ${JSON.stringify({
      themes,
      components: includedComponents
        .map(replaceTagInNodes(safeCustomElementName(component.name), 'div'))
        .map(removeTestData)
        .map(transformRelativePaths(url.origin)),
    })}, toddle);
`
    return new Response(content, {
      headers: {
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'content-type': 'text/javascript',
      },
    })
  } catch (e) {
    console.error(e)
    return errorResponse('404', 404)
  }
}
