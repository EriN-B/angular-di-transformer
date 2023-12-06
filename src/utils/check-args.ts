import {SourceFile} from "ts-morph";
import {parse} from "ts-command-line-args";
import {bgMagenta, blue} from "chalk";
import {ICopyFilesArguments} from "../types/arguments.types";

export function checkArgs(args:string[] | undefined, sourceFile: SourceFile){
    if(args){
        return args.some(substring => sourceFile.getBaseName().includes(substring));
    }else{
        return true;
    }
}

export function init(){


    const args = parse<ICopyFilesArguments>(
        {
            constr: {type: Boolean, alias: 'c', description: 'Do refactoring of DP, even if constructor contains code', optional: true, defaultValue: false},
            scheme: {type: String, alias: 's', description: `(optional) File Type to transform. \n Examples: ${blue('-s component service')} \n`, multiple: true, optional: true},
            help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' },
        },
        {
            helpArg: 'help',
            headerContentSections: [{ header: bgMagenta('ng-di-transform')}],
        },
    );

    return {scheme: args.scheme, constr: args.constr}
}