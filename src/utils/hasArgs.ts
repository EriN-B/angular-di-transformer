import {SourceFile} from "ts-morph";
import {parse} from "ts-command-line-args";
import {bgMagenta, blue} from "chalk";

export function hasArgs(args:string[] | undefined, sourceFile: SourceFile){
    if(args){
        return args.some(substring => sourceFile.getBaseName().includes(substring));
    }else{
        return true;
    }
}

export function init(){

    interface ICopyFilesArguments {
        scheme?: string[];
        help?: boolean;
    }

    const args = parse<ICopyFilesArguments>(
        {
            scheme: {type: String, alias: 's', description: `(optional) File Type to transform. \n Examples: ${blue('-s component service')} \n`, multiple: true, optional: true},
            help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' },
        },
        {
            helpArg: 'help',
            headerContentSections: [{ header: bgMagenta('ng-di-transform')}],
        },
    );

    return args.scheme
}