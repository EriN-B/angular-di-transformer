#!/usr/bin/env node
import {Project, Scope, SourceFile} from "ts-morph";
import { AngularSpecifications } from "./config/angular.specifications";

const project = new Project();
project.addSourceFilesFromTsConfig(`${process.cwd()}/tsconfig.json`);

project.getSourceFiles().forEach(sourceFile => {
    try {
        refactorConstructors(sourceFile);
    } catch (error) {
        console.error(`Error processing file ${sourceFile.getFilePath()}: ${error}`);
    }
});

project.save();

/**
 * Ensures that the 'inject' import from '@angular/core' exists in the file.
 * @param {SourceFile} sourceFile - The source file to process.
 */
function ensureInjectImport(sourceFile: SourceFile) {
    const moduleSpecifierSpec = AngularSpecifications.importDeclaration.moduleSpecifier;
    const namedImportsSpec = AngularSpecifications.importDeclaration.namedImports;

    const angularCoreImport = sourceFile.getImportDeclaration(declaration => {
        return declaration.getModuleSpecifierValue() === moduleSpecifierSpec;
    });

    const foundInjectImport = angularCoreImport?.getNamedImports()
        .some(namedImport => namedImport.getName() === namedImportsSpec.name);

    if (!foundInjectImport) {
        sourceFile.addImportDeclaration({
            moduleSpecifier: moduleSpecifierSpec,
            namedImports: [namedImportsSpec],
        });
    }
}

/**
 * Refactors constructors in the source file to use 'inject'.
 * @param {SourceFile} sourceFile - The source file to process.
 */
function refactorConstructors(sourceFile: SourceFile) {
    sourceFile.getClasses().forEach(classDeclaration => {
        classDeclaration.getConstructors().forEach(constructorDeclaration => {
            constructorDeclaration.getParameters().forEach(parameterDeclaration => {
                const type = parameterDeclaration.getTypeNode();
                const name = parameterDeclaration.getName();

                if (type) {
                    const property = {
                        scope: Scope.Private,
                        name,
                        initializer: `inject(${type.getText()})`
                    };

                    classDeclaration.insertProperty(0, property)
                    parameterDeclaration.remove();
                    ensureInjectImport(sourceFile);
                }
            });

            if (constructorDeclaration.getParameters().length === 0) {
                constructorDeclaration.remove();
            }
        });
    });
}
