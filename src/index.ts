#!/usr/bin/env node
import {Project, Scope} from "ts-morph";

const project = new Project();
project.addSourceFilesFromTsConfig(`${process.cwd()}/tsconfig.json`);

project.getSourceFiles().forEach(sourceFile => {

    let foundInjectImport = false;

    // Check if 'inject' is already imported from '@angular/core'
    const angularCoreImport = sourceFile.getImportDeclaration(declaration => {
        return declaration.getModuleSpecifierValue() === '@angular/core';
    });

    if (angularCoreImport) {
        const namedImports = angularCoreImport.getNamedImports();
        foundInjectImport = namedImports.some(namedImport => namedImport.getName() === 'inject');
    }

    // If 'inject' is not imported, add the import
    if (!foundInjectImport) {
        sourceFile.addImportDeclaration({
            moduleSpecifier: '@angular/core',
            namedImports: [{ name: 'inject' }],
        });
    }

    sourceFile.getClasses().forEach(classDeclaration => {
        classDeclaration.getConstructors().forEach(constructorDeclaration => {
            constructorDeclaration.getParameters().forEach(parameterDeclaration => {
                const type = parameterDeclaration.getType();
                const name = parameterDeclaration.getName();

                // Add new property with inject
                if (type) {
                    classDeclaration.addProperty({
                        scope: Scope.Private,
                        name,
                        initializer: `inject(${type.getText()})`
                    });

                    // Remove parameter from constructor
                    parameterDeclaration.remove();
                }
            });

            // If constructor is now empty, remove it
            if (constructorDeclaration.getParameters().length === 0) {
                constructorDeclaration.remove();
            }
        });
    });
});

project.save();
