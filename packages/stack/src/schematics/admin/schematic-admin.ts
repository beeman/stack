import { chain, externalSchematic, Rule, schematic, SchematicContext, Tree } from '@angular-devkit/schematics'
import { addDepsToPackageJson, getProjectConfig, ProjectType, updateWorkspaceInTree } from '@nrwl/workspace'
import { addFiles, addRunScript, NormalizedSchema, normalizeOptions, removeFiles } from '../../utils'
import { AdminSchematicSchema } from './schema'

function updateEnvironment(options: NormalizedSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const projectConfig = getProjectConfig(host, options.name)
    if (projectConfig.architect && projectConfig.architect?.build?.configurations?.production?.fileReplacements) {
      return chain([
        updateWorkspaceInTree((json) => {
          projectConfig.architect.build.configurations.production.fileReplacements = [
            {
              replace: `libs/${options.name}/feature-core/src/environments/environment.ts`,
              with: `libs/${options.name}/feature-core/src/environments/environment.prod.ts`,
            },
          ]
          json.projects[options.name] = projectConfig
          return json
        }),
      ])(host, context)
    }
  }
}

export default function (options: AdminSchematicSchema): Rule {
  const name = options.name || 'admin'
  const directory = options.directory || options.name
  const normalizedOptions = normalizeOptions<AdminSchematicSchema>(options, ProjectType.Application)

  return chain([
    addDepsToPackageJson(
      {
        '@apollo/client': '^3.2.1',
        'apollo-angular': '^2.0.4',
      },
      {
        '@graphql-codegen/cli': '1.17.8',
        '@graphql-codegen/introspection': '1.17.8',
        '@graphql-codegen/typescript': '1.17.8',
        '@graphql-codegen/typescript-apollo-angular': '^2.0.1',
        '@graphql-codegen/typescript-operations': '1.17.8',
      },
      true,
    ),
    externalSchematic('@nrwl/angular', 'application', {
      name,
      style: 'scss',
      routing: true,
      backendProject: options.backendProject,
    }),
    schematic('admin-data-access', {
      directory,
      name: 'data-access',
    }),
    schematic('admin-feature-core', {
      directory,
      name: 'core',
    }),
    schematic('admin-feature-shell', {
      directory,
      name: 'shell',
    }),
    schematic('admin-lib', { directory, name: 'auth', type: 'feature' }),
    addRunScript(`dev:${name}`, `nx serve ${name}`),
    addRunScript(`build:${name}`, `nx build ${name} --prod`),
    addFiles(normalizedOptions),
    removeFiles([
      `${normalizedOptions.projectRoot}/src/app/app.component.css`,
      `${normalizedOptions.projectRoot}/src/app/app.component.scss`,
      `${normalizedOptions.projectRoot}/src/app/app.component.html`,
      `${normalizedOptions.projectRoot}/src/app/app.component.spec.ts`,
      `${normalizedOptions.projectRoot}/src/environments/environment.ts`,
      `${normalizedOptions.projectRoot}/src/environments/environment.prod.ts`,
      `${normalizedOptions.projectRoot}/src/environments`,
    ]),
    updateEnvironment(normalizedOptions),
  ])
}
