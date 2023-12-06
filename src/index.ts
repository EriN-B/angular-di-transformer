#!/usr/bin/env node
import {
    ClassDeclaration,
    ConstructorDeclaration,
    ParameterDeclaration,
    Project,
    Scope,
    SourceFile,
    ts, TypeNode
} from "ts-morph";
import {isWorktreeClean} from "./utils/check-work-tree";
import {getAngularVersion, isAngularWorkspace} from "./utils/check-angular-workspace";
import {checkArgs, init} from "./utils/check-args";
import {yellow} from "chalk";


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


    function refactorConstructors(sourceFile: SourceFile) {
        if (!checkArgs(args.scheme, sourceFile)) {
            return;
        }

        sourceFile.getClasses().forEach(classDeclaration => {
            classDeclaration.getConstructors().forEach(constructorDeclaration => {
                const constructorBody = constructorDeclaration.getBody();
                if(shouldRefactorConstructor(constructorBody, args)){
                    refactorConstructor(constructorDeclaration, classDeclaration, sourceFile);
                }else {
                    console.log(yellow(`Constructor of ${sourceFile.getBaseName()} has descendant Statements. Skipping refactoring of constructor. You can disable this behaviour with the -c option`));
                }
            });
        });
    }

    function refactorConstructor(constructorDeclaration: ConstructorDeclaration, classDeclaration: ClassDeclaration, sourceFile: SourceFile) {
        constructorDeclaration.getParameters().forEach(parameterDeclaration => {
            const type = parameterDeclaration.getTypeNode();
            const name = parameterDeclaration.getName();
            const constructorBody = constructorDeclaration.getBody();

            if (!type) {
                return;
            }

            insertPropertyAndRemoveParameter(classDeclaration, name, type, parameterDeclaration);
            ensureInjectImport(sourceFile);
            removeConstructorIfEmpty(constructorDeclaration, constructorBody);
        });
    }

    function shouldRefactorConstructor(constructorBody:  any, args:  {scheme: string[] | undefined, constr: boolean | undefined}) {
        return (constructorBody && constructorBody.getDescendantStatements().length === 0) || args.constr;
    }

    function insertPropertyAndRemoveParameter(classDeclaration: ClassDeclaration, name:string, type:TypeNode<ts.TypeNode>, parameterDeclaration:ParameterDeclaration) {
        const property = {
            scope: Scope.Private,
            name,
            initializer: `inject(${type.getText()})`
        };

        classDeclaration.insertProperty(0, property);
        parameterDeclaration.remove();
    }
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
    function removeConstructorIfEmpty(constructorDeclaration: ConstructorDeclaration, constructorBody:any) {
        if (constructorDeclaration.getParameters().length === 0 && constructorBody && constructorBody.getDescendantStatements().length === 0) {
            constructorDeclaration.remove();
        }
    }

}

main();