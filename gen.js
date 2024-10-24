import {TOKENS} from "./define.js";

let TYPES = {
    "i32": "i32",
    "bool": "i1",
    "void": "void",
}

export class CodeGen {
    constructor(typedast, file="./out.ll") {
        this.file = Bun.file(file);
        this.genCode = ``;
        this.typedast = typedast;
        this.depth = 0;
        this.symbols = {};
        this.symbolCount = 1;
    }
    emit(code) {
        this.genCode += "\t".repeat(this.depth) + code + "\n";
    }
    async getExtern() {
        let file = "./extern.txt";
        file = Bun.file(file);
        file = await file.text();
        this.genCode += `${file}\n`;
    }
    async write() {
        await this.getExtern();
        this.llvmcompile(this.typedast);
        await Bun.write(this.file, this.genCode);
    }
    cast(ast, type2) {
        let res = `%${this.symbolCount}`;
        this.symbolCount++;
        this.emit(`${res} = trunc ${ast.valType} ${ast.value}, ${type2}`);
        return res;
    }
    isPtr(v) {
        if (this.symbols[v]) {
            return true;
        }
        return false;
    }
    llvmcompile(a, sv = null) {
        switch(a.type) {
            case -1:
                for (let i = 0; i < a.body.length; i++) {
                    this.llvmcompile(a.body[i], sv);
                }
                break;
            case TOKENS.CODEBLOCK:
                let scopedVars = [];
                this.depth++;
                let hasret = false;
                for (let i = 0; i < a.body.length; i++) {
                    if (this.llvmcompile(a.body[i], sv) == "HASRET") {
                        hasret = true;
                        break;
                    }
                }
                for (let i = 0; i < scopedVars.length; i++) {
                    delete this.symbols[scopedVars[i]];
                }
                this.depth--;
                return hasret;
            case TOKENS.INT:
                return a.value;
            case TOKENS.STRING:
                break;
            case TOKENS.BOOL:
                return a.value;
            case TOKENS.VOID:
                break;
            case TOKENS.ASSIGN:
                if (a.creation) { // only supports int and bool (i1)
                    let creVar = this.symbolCount;
                    sv.push(creVar);
                    this.symbols[a.name] = creVar;
                    this.symbolCount++;
                    this.emit(`%${creVar} = alloca ${TYPES[a.valType]}`);
                }
                this.emit(`store ${TYPES[a.valType]} ${this.llvmcompile(a.value, sv)}, ptr %${this.symbols[a.name]}`);
                break;
            case TOKENS.IDENT:
                if (this.symbols[a.name]) {
                    let val = this.symbolCount;
                    this.symbolCount++;
                    this.emit(`%${val} = load ${TYPES[a.valType]}, ptr %${this.symbols[a.name]}`);
                    return `%${val}`
                }
                return `%${a.name}`;
            case TOKENS.RETURN:
                this.emit(`ret ${TYPES[a.valType]} ${this.llvmcompile(a.value, sv)}`);
                return "HASRET";
            case TOKENS.FUNCTION:
                let params = "";
                for (let i = 0; i < a.params.length; i++) {
                    params += `${a.params[i].valType} %${a.params[i].name}`;
                    if (i < a.params.length - 1) params += ", ";
                }
                this.emit(`define ${a.valType} @${a.name}(${params})`);
                this.emit('{');
                this.depth++;
                let funcScopedVars = [];
                for (let i = 0; i < a.body.body.length; i++) {
                    this.llvmcompile(a.body.body[i], funcScopedVars);
                }
                for (let i = 0; i < funcScopedVars.length; i++) {
                    delete this.symbols[funcScopedVars[i]];
                }
                this.depth--;
                this.emit('}');
                this.symbolCount = 1;
                break;
            case TOKENS.AND:
                let andl = this.llvmcompile(a.left, sv);
                let andr = this.llvmcompile(a.right, sv);
                let andSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${andSymb} = and i1 ${andl}, ${andr}`);
                return andSymb;
            case TOKENS.OR:
                let orl = this.llvmcompile(a.left, sv);
                let orr = this.llvmcompile(a.right, sv);
                let orSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${orSymb} = or i1 ${orl}, ${orr}`);
                return orSymb;
            case TOKENS.GREATER_THAN:
                let gtl = this.llvmcompile(a.left, sv);
                let gtr = this.llvmcompile(a.right, sv);
                let gtSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${gtSymb} = icmp sgt i32 ${gtl}, ${gtr}`);
                return gtSymb;
            case TOKENS.LESS_THAN: 
                let ltl = this.llvmcompile(a.left, sv);
                let ltr = this.llvmcompile(a.right, sv);
                let ltSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${ltSymb} = icmp slt i32 ${ltl}, ${ltr}`);
                return ltSymb;
            case TOKENS.EQUALS:
                let eql = this.llvmcompile(a.left, sv);
                let eqr = this.llvmcompile(a.right, sv);
                let eqSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${eqSymb} = icmp eq i32 ${eql}, ${eqr}`);
                return eqSymb;
            case TOKENS.ADD:
                let addl = this.llvmcompile(a.left, sv);
                let addr = this.llvmcompile(a.right, sv);
                let addSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${addSymb} = add i32 ${addl}, ${addr}`);
                return addSymb;
            case TOKENS.SUBTRACT:
                let subl = this.llvmcompile(a.left, sv);
                let subr = this.llvmcompile(a.right, sv);
                let subSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${subSymb} = sub i32 ${subl}, ${subr}`);
                return subSymb;
            case TOKENS.MULTIPLY:
                let mull = this.llvmcompile(a.left, sv);
                let mulr = this.llvmcompile(a.right, sv);
                let mulSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${mulSymb} = mul i32 ${mull}, ${mulr}`);
                return mulSymb;
            case TOKENS.DIVIDE: // work on poison value, and floats
                let divl = this.llvmcompile(a.left, sv);
                let divr = this.llvmcompile(a.right, sv);
                let divSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${divSymb} = sdiv i32 ${divl}, ${divr}`);
                return divSymb;
            case TOKENS.MODULO:
                let modl = this.llvmcompile(a.left, sv);
                let modr = this.llvmcompile(a.right, sv);
                let modSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${modSymb} = srem i32 ${modl}, ${modr}`);
                return modSymb;
            case TOKENS.NOT:
                let notop = this.llvmcompile(a.operand, sv);
                let notSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${notSymb} = icmp eq i32 ${notop}, 0`)
                return notSymb;
            case TOKENS.NEGATE:
                let negop = this.llvmcompile(a.operand, sv);
                let negSymb = `%${this.symbolCount}`;
                this.symbolCount++;
                this.emit(`${negSymb} = mul i32 ${negop}, -1`);
                return negSymb;
            case TOKENS.WHILE:
                let whileCond = this.llvmcompile(a.conditional, sv);
                let whileTrue = this.symbolCount;
                this.symbolCount++;
                let goNext = "null";
                this.emit(`br i1 ${whileCond}, label %${whileTrue}, label %`);

                let goNextPos = this.genCode.length-1;
                this.emit(`${whileTrue}:`);
                if (this.llvmcompile(a.body, sv) == false) {
                    this.depth++;
                    whileCond = this.llvmcompile(a.conditional, sv);
                    goNext = this.symbolCount;
                    this.symbolCount++;
                    this.depth--;
                    this.emit(`\tbr i1 ${whileCond}, label %${whileTrue}, label %${goNext}`);
                } else {
                    toMain = this.symbolCount;
                    this.symbolCount++;
                }

                this.emit(`${goNext}:`);
                this.genCode = [this.genCode.slice(0, goNextPos), goNext, this.genCode.slice(goNextPos)].join('');
                break;
            case TOKENS.IF:
                // doesn't support else yet.
                let cond = this.llvmcompile(a.conditional, sv);
                let ifTrue = this.symbolCount;
                this.symbolCount++;
                let toMain = "null";
                this.emit(`br i1 ${cond}, label %${ifTrue}, label %`);

                let toMainPos = this.genCode.length-1;
                this.emit(`${ifTrue}:`);
                if (this.llvmcompile(a.body, sv) == false) {
                    toMain = this.symbolCount;
                    this.symbolCount++;
                    this.emit(`\tbr label %${toMain}`);
                } else {
                    toMain = this.symbolCount;
                    this.symbolCount++;
                }

                this.emit(`${toMain}:`);
                this.genCode = [this.genCode.slice(0, toMainPos), toMain, this.genCode.slice(toMainPos)].join('');
                break;
            case TOKENS.CALL:
                let callParams = "";
                for (let i = 0; i < a.params.length; i++) {
                    let p = this.llvmcompile(a.params[i], sv);
                    if (this.isPtr(p)) callParams += `${TYPES[a.params[i].valType]}* ${p}`;
                    else callParams += `${TYPES[a.params[i].valType]} ${p}`;
                    if (i < a.params.length - 1) callParams += ", ";
                }
                if (TYPES[a.valType] == "void") {
                    this.emit(`call void @${a.name}(${callParams})`);
                } else {
                    let callSymb = `%${this.symbolCount}`;
                    this.emit(`${callSymb} = call ${TYPES[a.valType]} @${a.name}(${callParams})`);
                    this.symbolCount++;
                    return callSymb;
                }
                break;
            case TOKENS.LOG:
                let logVal = this.llvmcompile(a.param, sv);
                if (logVal.charAt(0) == '%' && this.isPtr(logVal)) {
                    this.emit(`%${this.symbolCount} = load ${TYPES[a.param.valType]}, ptr ${logVal}`);
                    logVal = `%${this.symbolCount}`;
                    this.symbolCount++;
                }
                this.emit(`call void @print${TYPES[a.param.valType]}(${TYPES[a.param.valType]} ${logVal})`);
            default:
                return a;
        }
    }
}