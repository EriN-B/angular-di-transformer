#!/usr/bin/env node
import {Project, Scope, SourceFile} from "ts-morph";
import { AngularSpecifications } from "./config/angular.specifications";
import {isWorktreeClean} from "./utils/check-work-tree";
import {getAngularVersion, isAngularWorkspace} from "./utils/check-angular-workspace";
import {checkArgs, init} from "./utils/check-args";


function main(){

    const args = init();

    if (!isWorktreeClean()) {
        console.error('Your Git worktree is not clean. Please commit or stash your changes before running this script.');
        process.exit(1);
    }

    if(!isAngularWorkspace() && getAngularVersion() >= 14){
        console.error('Please run this command inside of a Angular Workspace with a version of Angular/core of >= 14');
        process.exit(1);
    }

    const project = new Project();
    project.addSourceFilesFromTsConfig(`${process.cwd()}/tsconfig.json`);

    project.getSourceFiles().forEach(sourceFile => {
        try {
            refactorConstructors(sourceFile);
        } catch (error) {
            console.error(`Error processing file ${sourceFile.getFilePath()}: ${error}`);
        }
    });

    project.save().then(r => console.log('All done'));

    /**
     * Ensures that the 'inject' import from '@angular/core' exists in the file.
     * @param {SourceFile} sourceFile - The source file to process.
     */
    function ensureInjectImport(sourceFile: SourceFile) {
        const moduleSpecifierSpec = '@angular/core';
        const namedImportsSpec = { name: 'inject' };

        const angularCoreImport = sourceFile.getImportDeclaration(declaration => {
            return declaration.getModuleSpecifierValue() === moduleSpecifierSpec;
        });

        const foundInjectImport = angularCoreImport?.getNamedImports()
            .some(namedImport => namedImport.getName() === namedImportsSpec.name);

        if (!foundInjectImport) {
            if (angularCoreImport) {
                angularCoreImport.addNamedImport(namedImportsSpec.name);
            } else {
                sourceFile.addImportDeclaration({
                    moduleSpecifier: moduleSpecifierSpec,
                    namedImports: [namedImportsSpec],
                });
            }
        }
    }
    /**
     * Refactors constructors in the source file to use 'inject'.
     * @param {SourceFile} sourceFile - The source file to process.
     */
    function refactorConstructors(sourceFile: SourceFile) {
        if(checkArgs(args,sourceFile)){
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
                        const constructorBody = constructorDeclaration.getBody();
                        const hasCodeInBody = constructorBody && constructorBody.getDescendantStatements().length > 0;

                        if (!hasCodeInBody) {
                            constructorDeclaration.remove();
                        }
                    }
                });
            });
        }
    }
}

main();