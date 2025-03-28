// Copy files from the static-assets directory to the dist directory using fs
// This script is executed by the build process
import { RESET_STYLES } from '@toddledev/core/dist/styling/theme.const'
import * as fs from 'fs'
import { splitRoutes } from './routes'

// assets/_static/ folder
fs.mkdirSync(`${__dirname}/../assets/_static`, { recursive: true })
;[
  'page.main.esm.js',
  'page.main.esm.js.map',
  'custom-element.main.esm.js',
].forEach((f) =>
  fs.copyFileSync(
    `${__dirname}/../node_modules/@toddledev/runtime/dist/${f}`,
    `${__dirname}/../assets/_static/${f}`,
  ),
)
fs.writeFileSync(`${__dirname}/../assets/_static/reset.css`, RESET_STYLES)

// dist/ folder
fs.mkdirSync(`${__dirname}/../dist`, { recursive: true })
const projectFile = fs.readFileSync(`${__dirname}/../__project__/project.json`)
const json = JSON.parse(projectFile.toString())
const { project, files, routes } = splitRoutes(json)
fs.writeFileSync(`${__dirname}/../dist/project.json`, JSON.stringify(project))
fs.writeFileSync(`${__dirname}/../dist/routes.json`, JSON.stringify(routes))
fs.mkdirSync(`${__dirname}/../dist/components`, { recursive: true })
Object.entries(files).forEach(([name, file]) => {
  fs.writeFileSync(
    `${__dirname}/../dist/components/${name}.json`,
    JSON.stringify(file),
  )
})
