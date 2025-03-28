import { createStylesheet } from '@toddledev/core/dist/styling/style.css'
import { theme as defaultTheme } from '@toddledev/core/dist/styling/theme.const'
import { takeIncludedComponents } from '@toddledev/ssr/dist/components/utils'
import type { Context } from 'hono'
import type { HonoComponent, HonoEnv, HonoRoutes } from '../../hono'

export const stylesheetHandler = async (
  c: Context<
    HonoEnv<HonoRoutes & HonoComponent>,
    '/.toddle/stylesheet/:pageName{.+.css}'
  >,
) => {
  const files = c.var.files
  const page = c.var.component
  if (!page.route) {
    return c.text('Page not found', { status: 404 })
  }
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

  const styles = createStylesheet(page, includedComponents, theme, {
    // The reset stylesheet is loaded separately
    includeResetStyle: false,
    // Font faces are created from a stylesheet referenced in the head
    createFontFaces: false,
  })
  return c.text(styles, 200, { 'content-type': 'text/css' })
}
